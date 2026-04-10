import { IndexedDBAdapter } from './adapters/IndexedDBAdapter';
import { WorkStore } from './adapters/WorkStore';
import { HistoryStore } from './adapters/HistoryStore';
import { TemplateStore } from './adapters/TemplateStore';
import { ShardStore } from './adapters/ShardStore';
import { SimpleEventEmitter } from './EventEmitterImpl';
import { EventType, EventData } from './interfaces/EventEmitter';
import { Work, WorkCreateDTO, WorkUpdateDTO, WorkListResult, QueryOptions } from '../../models/Work';
import { Template, TemplateCreateDTO, TemplateUpdateDTO } from '../../models/Template';
import { HistoryVersion, HistoryVersionCreateDTO } from '../../models/HistoryVersion';
import { LRUCache } from './utils/LRUCache';
import { ShardManager } from './utils/ShardManager';
import { apiService } from '../api/ApiService';

export class StorageService {
  private static instance: StorageService;
  private dbAdapter: IndexedDBAdapter;
  private workStore: WorkStore;
  private historyStore: HistoryStore;
  private templateStore: TemplateStore;
  private shardStore: ShardStore;
  private eventEmitter: SimpleEventEmitter;
  private workCache: LRUCache<string, Work>;
  private templateCache: LRUCache<string, Template>;
  private shardManager: ShardManager;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;
  private cacheCleanupInterval: NodeJS.Timeout | null = null;
  private apiAvailable = false;
  private syncInProgress = false;

  private constructor() {
    this.eventEmitter = new SimpleEventEmitter();
    this.dbAdapter = IndexedDBAdapter.getInstance(this.eventEmitter);
    this.workStore = new WorkStore(this.dbAdapter, this.eventEmitter);
    this.historyStore = new HistoryStore(this.dbAdapter, this.eventEmitter);
    this.templateStore = new TemplateStore(this.dbAdapter, this.eventEmitter);
    this.shardStore = new ShardStore(this.dbAdapter, this.eventEmitter);
    this.workCache = new LRUCache<string, Work>(50, 20 * 1024 * 1024); // 20MB 内存限制
    this.templateCache = new LRUCache<string, Template>(20, 5 * 1024 * 1024); // 5MB 内存限制
    this.shardManager = ShardManager.getInstance();
  }

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  // 初始化存储服务
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.initializeInternal();
    return this.initializationPromise;
  }

  private async initializeInternal(): Promise<void> {
    try {
      await this.dbAdapter.initialize();
      this.startCacheCleanup();
      
      // 检查 API 可用性
      await this.checkApiAvailability();
      
      this.initialized = true;
      
      this.emitEvent(EventType.INITIALIZED, {
        data: {
          message: '存储服务初始化成功',
          apiAvailable: this.apiAvailable
        }
      });
    } catch (error) {
      this.emitEvent(EventType.ERROR, {
        error: error as Error,
        data: {
          message: '存储服务初始化失败'
        }
      });
      throw error;
    } finally {
      this.initializationPromise = null;
    }
  }

  // 关闭存储服务
  async close(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      // 停止缓存清理定时器
      this.stopCacheCleanup();
      
      await this.dbAdapter.close();
      this.initialized = false;
      this.workCache.clear();
      this.templateCache.clear();
      this.shardManager.clearCache('');
      
      this.emitEvent(EventType.INITIALIZED, {
        data: {
          message: '存储服务关闭成功'
        }
      });
    } catch (error) {
      console.error('存储服务关闭错误:', error);
      this.emitEvent(EventType.ERROR, {
        error: error as Error,
        data: {
          message: '存储服务关闭失败'
        }
      });
      throw error;
    }
  }

  // 检查是否初始化
  isInitialized(): boolean {
    return this.initialized;
  }

  // 检查 API 可用性
  async checkApiAvailability(): Promise<boolean> {
    try {
      this.apiAvailable = await apiService.isApiAvailable();
      return this.apiAvailable;
    } catch (error) {
      console.error('检查 API 可用性失败:', error);
      this.apiAvailable = false;
      return false;
    }
  }

  // 获取 API 可用性状态
  isApiAvailable(): boolean {
    return this.apiAvailable;
  }

  // 作品操作
  async createWork(dto: WorkCreateDTO): Promise<Work> {
    this.ensureInitialized();
    
    try {
      // 先在本地创建作品
      const work = await this.workStore.create(dto);
      this.workCache.set(work.id, work);
      
      // 如果 API 可用，同步到服务端
      if (this.apiAvailable) {
        try {
          const response = await fetch('/api/works/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(work)
          });
          
          if (response.ok) {
            const serverWork = await response.json();
            if (serverWork.success && serverWork.work) {
              // 使用服务端返回的作品数据更新本地缓存
              this.workCache.set(serverWork.work.id, serverWork.work);
            }
          }
        } catch (apiError) {
          console.warn('同步作品到服务端失败:', apiError);
          // 继续执行，不影响本地创建
        }
      }
      
      this.emitEvent(EventType.WORK_CREATED, {
        workId: work.id,
        data: {
          message: `作品创建成功: ${work.title}`,
          synced: this.apiAvailable
        }
      });

      return work;
    } catch (error) {
      console.error('StorageService.createWork: 创建作品时出错', error);
      this.handleError('创建作品', error);
      throw error;
    }
  }

  async readWork(workId: string): Promise<Work | null> {
    this.ensureInitialized();
    
    // 尝试从缓存获取
    const cachedWork = this.workCache.get(workId);
    if (cachedWork) {
      return cachedWork;
    }

    try {
      const work = await this.workStore.read(workId);
      if (work) {
        this.workCache.set(work.id, work);
      }
      return work;
    } catch (error) {
      this.handleError('读取作品', error);
      throw error;
    }
  }

  async updateWork(workId: string, dto: WorkUpdateDTO): Promise<Work> {
    this.ensureInitialized();
    
    try {
      // 检查作品是否为只读
      const existingWork = await this.workStore.read(workId);
      if (existingWork?.isReadonly) {
        throw new Error('无法更新只读作品');
      }
      
      const work = await this.workStore.update(workId, dto);
      this.workCache.set(work.id, work);
      
      // 如果 API 可用，同步到服务端
      if (this.apiAvailable) {
        try {
          const response = await fetch(`/api/works/${workId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(work)
          });
          
          if (response.ok) {
            const serverWork = await response.json();
            if (serverWork.success && serverWork.work) {
              // 使用服务端返回的作品数据更新本地缓存
              this.workCache.set(serverWork.work.id, serverWork.work);
            }
          }
        } catch (apiError) {
          console.warn('同步作品更新到服务端失败:', apiError);
          // 继续执行，不影响本地更新
        }
      }
      
      this.emitEvent(EventType.WORK_UPDATED, {
        workId: work.id,
        data: {
          message: `作品更新成功: ${work.title}`,
          synced: this.apiAvailable
        }
      });

      return work;
    } catch (error) {
      this.handleError('更新作品', error);
      throw error;
    }
  }

  async deleteWork(workId: string, hardDelete: boolean = false): Promise<boolean> {
    this.ensureInitialized();
    
    try {
      // 检查作品是否为只读
      const existingWork = await this.workStore.read(workId);
      if (existingWork?.isReadonly) {
        throw new Error('无法删除只读作品');
      }
      
      // 先删除作品本身
      const result = await this.workStore.delete(workId, hardDelete);
      if (result) {
        // 从缓存中删除
        this.workCache.delete(workId);
        
        // 尝试删除相关的历史版本（忽略错误）
        try {
          await this.historyStore.deleteVersionsByWorkId(workId);
        } catch (error) {
          // 静默处理错误
        }
        
        // 尝试删除相关的分片（忽略错误）
        try {
          await this.shardStore.deleteShardsByWorkId(workId);
        } catch (error) {
          // 静默处理错误
        }
        
        // 清除相关分片缓存
        this.shardManager.clearCache(workId);
        
        // 如果 API 可用，同步到服务端
        if (this.apiAvailable) {
          try {
            const response = await fetch(`/api/works/${workId}`, {
              method: 'DELETE'
            });
            
            if (!response.ok) {
              console.warn('同步作品删除到服务端失败:', response.status);
            }
          } catch (apiError) {
            console.warn('同步作品删除到服务端失败:', apiError);
            // 继续执行，不影响本地删除
          }
        }
        
        this.emitEvent(EventType.WORK_DELETED, {
          workId,
          data: {
            message: `作品删除成功: ${workId}`,
            synced: this.apiAvailable
          }
        });
      }
      return result;
    } catch (error) {
      this.handleError('删除作品', error);
      throw error;
    }
  }

  async copyWork(workId: string, newTitle?: string): Promise<Work> {
    this.ensureInitialized();
    
    try {
      // 读取原作品
      const existingWork = await this.workStore.read(workId);
      if (!existingWork) {
        throw new Error('作品未找到');
      }
      
      // 获取所有作品用于检查标题
      const allWorks = await this.workStore.list({
        page: 1,
        pageSize: 10000,
        deletedOnly: false
      });
      
      // 生成唯一的标题
      let baseTitle = newTitle || existingWork.title;
      // 如果标题已经包含 (数字) 后缀，先去掉
      baseTitle = baseTitle.replace(/\(\d+\)$/, '').trim();
      
      let finalTitle = `${baseTitle}(1)`;
      let counter = 1;
      
      // 检查是否已存在同名作品
      while (allWorks.works.some(work => work.title === finalTitle)) {
        counter++;
        finalTitle = `${baseTitle}(${counter})`;
      }
      
      // 准备复制数据
      const dto: WorkCreateDTO = {
        title: finalTitle,
        category: existingWork.category,
        tags: existingWork.tags,
        nodes: existingWork.nodes,
        layout: existingWork.layout
      };
      
      // 创建新作品
      const copiedWork = await this.workStore.create(dto);
      
      // 复制原作品的加密数据
      if (existingWork.encryptedData) {
        await this.workStore.update(copiedWork.id, {
          encryptedData: existingWork.encryptedData
        });
        
        // 重新读取更新后的作品
        const updatedWork = await this.workStore.read(copiedWork.id);
        if (updatedWork) {
          this.workCache.set(updatedWork.id, updatedWork);
          
          this.emitEvent(EventType.WORK_CREATED, {
            workId: updatedWork.id,
            data: {
              message: `作品复制成功: ${updatedWork.title}`
            }
          });

          return updatedWork;
        }
      }
      
      this.workCache.set(copiedWork.id, copiedWork);
      
      this.emitEvent(EventType.WORK_CREATED, {
        workId: copiedWork.id,
        data: {
          message: `作品复制成功: ${copiedWork.title}`
        }
      });

      return copiedWork;
    } catch (error) {
      this.handleError('复制作品', error);
      throw error;
    }
  }

  async restoreWork(workId: string): Promise<Work> {
    this.ensureInitialized();
    
    try {
      // 检查作品是否为只读
      const existingWork = await this.workStore.read(workId);
      if (existingWork?.isReadonly) {
        throw new Error('无法恢复只读作品');
      }
      
      const work = await this.workStore.restore(workId);
      this.workCache.set(work.id, work);
      
      this.emitEvent(EventType.WORK_RESTORED, {
        workId: work.id,
        data: {
          message: `作品恢复成功: ${work.title}`
        }
      });

      return work;
    } catch (error) {
      this.handleError('恢复作品', error);
      throw error;
    }
  }

  async listWorks(options: QueryOptions): Promise<WorkListResult> {
    this.ensureInitialized();
    
    try {
      // 添加默认值，确保即使传入空对象也能正常工作
      const safeOptions = {
        page: 1,
        pageSize: 20,
        searchText: '',
        category: undefined,
        starredOnly: false,
        tags: undefined,
        sortBy: undefined,
        deletedOnly: false,
        sortOrder: 'desc' as const,
        ...options
      };
      
      // 如果 API 可用，尝试从服务端获取作品列表
      if (this.apiAvailable) {
        try {
          const response = await fetch('/api/works/');
          
          if (response.ok) {
            const serverResult = await response.json();
            if (serverResult.success && serverResult.works) {
              // 过滤和分页
              let works = serverResult.works;
              
              // 应用搜索过滤
              if (safeOptions.searchText) {
                const searchLower = safeOptions.searchText.toLowerCase();
                works = works.filter((work: any) => 
                  work.title.toLowerCase().includes(searchLower) ||
                  (work.tags && work.tags.some((tag: string) => tag.toLowerCase().includes(searchLower)))
                );
              }
              
              // 应用分类过滤
              if (safeOptions.category) {
                works = works.filter((work: any) => work.category === safeOptions.category);
              }
              
              // 应用标签过滤
              if (safeOptions.tags && safeOptions.tags.length > 0) {
                works = works.filter((work: any) => 
                  work.tags && safeOptions.tags!.every(tag => work.tags.includes(tag))
                );
              }
              
              // 应用排序
              if (safeOptions.sortBy) {
                works.sort((a: any, b: any) => {
                  const aValue = a[safeOptions.sortBy as string];
                  const bValue = b[safeOptions.sortBy as string];
                  
                  if (aValue && bValue) {
                    if (aValue < bValue) return safeOptions.sortOrder === 'asc' ? -1 : 1;
                    if (aValue > bValue) return safeOptions.sortOrder === 'asc' ? 1 : -1;
                  }
                  return 0;
                });
              } else {
                // 默认按更新时间排序
                works.sort((a: any, b: any) => {
                  const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
                  const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
                  return bTime - aTime;
                });
              }
              
              // 应用分页
              const total = works.length;
              const start = (safeOptions.page - 1) * safeOptions.pageSize;
              const end = start + safeOptions.pageSize;
              const paginatedWorks = works.slice(start, end);
              
              // 更新本地缓存
              paginatedWorks.forEach((work: any) => this.workCache.set(work.id, work));
              
              return {
                works: paginatedWorks,
                total,
                page: safeOptions.page,
                pageSize: safeOptions.pageSize
              };
            }
          }
        } catch (apiError) {
          console.warn('从服务端获取作品列表失败:', apiError);
          // 继续执行，使用本地存储
        }
      }
      
      // 从本地存储获取作品列表
      const result = await this.workStore.list(safeOptions);
      return result;
    } catch (error) {
      this.handleError('列出作品', error);
      throw error;
    }
  }

  // 批量操作
  async batchCreateWorks(dtos: WorkCreateDTO[]): Promise<Work[]> {
    this.ensureInitialized();
    
    try {
      const works = await this.workStore.batchCreate(dtos);
      works.forEach(work => this.workCache.set(work.id, work));
      
      this.emitEvent(EventType.WORK_CREATED, {
        data: {
          message: `创建了 ${works.length} 个作品`
        }
      });

      return works;
    } catch (error) {
      this.handleError('批量创建作品', error);
      throw error;
    }
  }

  async batchUpdateWorks(workIds: string[], dto: WorkUpdateDTO): Promise<{
    success: Work[];
    failed: { workId: string; error: string }[];
  }> {
    this.ensureInitialized();
    
    try {
      const result = await this.workStore.batchUpdate(workIds, dto);
      result.success.forEach(work => this.workCache.set(work.id, work));
      
      this.emitEvent(EventType.WORK_UPDATED, {
        data: {
          message: `更新了 ${result.success.length} 个作品`
        }
      });

      return result;
    } catch (error) {
      this.handleError('批量更新作品', error);
      throw error;
    }
  }

  async batchDeleteWorks(workIds: string[], hardDelete: boolean = false): Promise<{
    success: string[];
    failed: { workId: string; error: string }[];
  }> {
    this.ensureInitialized();
    
    try {
      const result = await this.workStore.batchDelete(workIds, hardDelete);
      result.success.forEach(workId => {
        this.workCache.delete(workId);
        this.shardManager.clearCache(workId);
      });
      
      this.emitEvent(EventType.WORK_DELETED, {
        data: {
          message: `删除了 ${result.success.length} 个作品`
        }
      });

      return result;
    } catch (error) {
      this.handleError('批量删除作品', error);
      throw error;
    }
  }

  // 导出导入
  async exportWork(workId: string, format: 'mm' | 'xmind' | 'json'): Promise<Blob> {
    this.ensureInitialized();
    
    try {
      return await this.workStore.export(workId, format);
    } catch (error) {
      this.handleError('导出作品', error);
      throw error;
    }
  }

  async importWork(file: Blob, format: 'mm' | 'xmind' | 'json'): Promise<Work> {
    this.ensureInitialized();
    
    try {
      const work = await this.workStore.import(file, format);
      this.workCache.set(work.id, work);
      
      this.emitEvent(EventType.WORK_CREATED, {
        workId: work.id,
        data: {
          message: `作品导入成功: ${work.title}`
        }
      });

      return work;
    } catch (error) {
      this.handleError('导入作品', error);
      throw error;
    }
  }

  // 历史版本操作
  async createVersion(dto: HistoryVersionCreateDTO): Promise<HistoryVersion> {
    this.ensureInitialized();
    
    try {
      const version = await this.historyStore.createVersion(dto);
      
      this.emitEvent(EventType.VERSION_CREATED, {
        workId: dto.workId,
        versionId: version.id,
        data: {
          message: `版本创建成功: ${version.versionNumber}`
        }
      });

      return version;
    } catch (error) {
      this.handleError('创建版本', error);
      throw error;
    }
  }

  async getVersions(workId: string, page: number = 1, pageSize: number = 20): Promise<HistoryVersion[]> {
    this.ensureInitialized();
    
    try {
      const result = await this.historyStore.getVersions(workId, page, pageSize);
      return result.versions;
    } catch (error) {
      this.handleError('获取版本列表', error);
      throw error;
    }
  }

  async getLatestVersion(workId: string): Promise<HistoryVersion | null> {
    this.ensureInitialized();
    
    try {
      return await this.historyStore.getLatestVersion(workId);
    } catch (error) {
      this.handleError('获取最新版本', error);
      throw error;
    }
  }

  async restoreVersion(workId: string, versionId: string): Promise<boolean> {
    this.ensureInitialized();
    
    try {
      const result = await this.historyStore.restoreVersion(workId, versionId);
      if (result) {
        // 清除缓存，确保下次读取最新数据
        this.workCache.delete(workId);
        
        this.emitEvent(EventType.VERSION_CREATED, {
          workId,
          versionId,
          data: {
            message: `版本恢复成功: ${versionId}`
          }
        });
      }
      return result;
    } catch (error) {
      this.handleError('恢复版本', error);
      throw error;
    }
  }

  async cleanupOldVersions(workId: string, keepCount: number): Promise<number> {
    this.ensureInitialized();
    
    try {
      return await this.historyStore.cleanupOldVersions(workId, keepCount);
    } catch (error) {
      this.handleError('清理旧版本', error);
      throw error;
    }
  }

  // 模板操作
  async createTemplate(dto: TemplateCreateDTO): Promise<Template> {
    this.ensureInitialized();
    
    try {
      const template = await this.templateStore.createTemplate(dto);
      this.templateCache.set(template.id, template);
      
      this.emitEvent(EventType.TEMPLATE_CREATED, {
        templateId: template.id,
        data: {
          message: `模板创建成功: ${template.title}`
        }
      });

      return template;
    } catch (error) {
      this.handleError('创建模板', error);
      throw error;
    }
  }

  async updateTemplate(templateId: string, dto: TemplateUpdateDTO): Promise<Template> {
    this.ensureInitialized();
    
    try {
      const template = await this.templateStore.updateTemplate(templateId, dto);
      this.templateCache.set(template.id, template);
      
      this.emitEvent(EventType.TEMPLATE_UPDATED, {
        templateId: template.id,
        data: {
          message: `模板更新成功: ${template.title}`
        }
      });

      return template;
    } catch (error) {
      this.handleError('更新模板', error);
      throw error;
    }
  }

  async getTemplate(templateId: string): Promise<Template | null> {
    this.ensureInitialized();
    
    // 尝试从缓存获取
    const cachedTemplate = this.templateCache.get(templateId);
    if (cachedTemplate) {
      return cachedTemplate;
    }

    try {
      // 注意：TemplateStore 没有直接的 read 方法，需要从父类 WorkStore 调用
      const template = await (this.templateStore as any).read(templateId);
      if (template) {
        this.templateCache.set(template.id, template);
      }
      return template;
    } catch (error) {
      this.handleError('获取模板', error);
      throw error;
    }
  }

  async findTemplatesByType(templateType: string): Promise<Template[]> {
    this.ensureInitialized();
    
    try {
      return await this.templateStore.findByType(templateType);
    } catch (error) {
      this.handleError('按类型查找模板', error);
      throw error;
    }
  }

  async getDefaultTemplates(): Promise<Template[]> {
    this.ensureInitialized();
    
    try {
      return await this.templateStore.getDefaultTemplates();
    } catch (error) {
      this.handleError('获取默认模板', error);
      throw error;
    }
  }

  async listTemplates(options: QueryOptions): Promise<WorkListResult> {
    this.ensureInitialized();
    
    try {
      return await this.templateStore.listTemplates(options);
    } catch (error) {
      this.handleError('列出模板', error);
      throw error;
    }
  }

  async copyTemplate(templateId: string, newTitle: string): Promise<Template> {
    this.ensureInitialized();
    
    try {
      const template = await this.templateStore.copyTemplate(templateId, newTitle);
      this.templateCache.set(template.id, template);
      
      this.emitEvent(EventType.TEMPLATE_CREATED, {
        templateId: template.id,
        data: {
          message: `模板复制成功: ${template.title}`
        }
      });

      return template;
    } catch (error) {
      this.handleError('复制模板', error);
      throw error;
    }
  }

  async incrementTemplateUsage(templateId: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      await this.templateStore.incrementUsage(templateId);
      // 更新缓存
      const template = await this.getTemplate(templateId);
      if (template) {
        this.templateCache.set(template.id, { ...template, usageCount: template.usageCount + 1 });
      }
    } catch (error) {
      this.handleError('增加模板使用次数', error);
      throw error;
    }
  }

  // 事件订阅
  subscribe(type: EventType, callback: (data: EventData) => void): () => void {
    return this.eventEmitter.subscribe(type, callback);
  }

  // 获取存储使用情况
  async getStorageUsage(): Promise<{
    used: number;
    total: number;
    percentage: number;
  }> {
    this.ensureInitialized();
    return this.dbAdapter.getStorageUsage();
  }

  // 获取缓存使用情况
  getCacheUsage(): {
    workCache: {
      size: number;
      capacity: number;
      memoryUsage: {
        current: number;
        max: number;
        percentage: number;
      };
    };
    templateCache: {
      size: number;
      capacity: number;
      memoryUsage: {
        current: number;
        max: number;
        percentage: number;
      };
    };
  } {
    return {
      workCache: {
        size: this.workCache.size(),
        capacity: 50,
        memoryUsage: this.workCache.getMemoryUsage()
      },
      templateCache: {
        size: this.templateCache.size(),
        capacity: 20,
        memoryUsage: this.templateCache.getMemoryUsage()
      }
    };
  }

  // 启动缓存清理定时器
  private startCacheCleanup(): void {
    // 每 5 分钟清理一次缓存
    this.cacheCleanupInterval = setInterval(() => {
      this.cleanupCache();
    }, 5 * 60 * 1000);
  }

  // 停止缓存清理定时器
  private stopCacheCleanup(): void {
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
      this.cacheCleanupInterval = null;
    }
  }

  // 清理缓存
  private cleanupCache(): void {
    try {
      // 检查工作缓存内存使用情况
      const workCacheUsage = this.workCache.getMemoryUsage();
      if (workCacheUsage.percentage > 80) {
        // 如果内存使用超过 80%，清理一半的缓存
        const keys = this.workCache.keys();
        const keysToDelete = keys.slice(0, Math.floor(keys.length / 2));
        this.workCache.batchDelete(keysToDelete);
      }

      // 检查模板缓存内存使用情况
      const templateCacheUsage = this.templateCache.getMemoryUsage();
      if (templateCacheUsage.percentage > 80) {
        // 如果内存使用超过 80%，清理一半的缓存
        const keys = this.templateCache.keys();
        const keysToDelete = keys.slice(0, Math.floor(keys.length / 2));
        this.templateCache.batchDelete(keysToDelete);
      }

      // 清理分片缓存
      this.shardManager.clearCache('');
    } catch (error) {
      console.error('缓存清理错误:', error);
    }
  }

  // 手动清理缓存
  clearCache(): void {
    this.workCache.clear();
    this.templateCache.clear();
    this.shardManager.clearCache('');
  }

  // 同步作品到服务端
  async syncWorks(): Promise<{ success: boolean; syncedCount: number; errors: string[] }> {
    this.ensureInitialized();
    
    if (!this.apiAvailable) {
      return { success: false, syncedCount: 0, errors: ['API 服务不可用'] };
    }
    
    if (this.syncInProgress) {
      return { success: false, syncedCount: 0, errors: ['同步正在进行中'] };
    }
    
    this.syncInProgress = true;
    const errors: string[] = [];
    let syncedCount = 0;
    
    try {
      // 获取本地所有作品
      const localWorksResult = await this.workStore.list({
        page: 1,
        pageSize: 1000,
        deletedOnly: false
      });
      
      const localWorks = localWorksResult.works;
      
      // 获取服务端所有作品
      const response = await fetch('/api/works/');
      if (!response.ok) {
        throw new Error(`获取服务端作品失败: ${response.status}`);
      }
      
      const serverResult = await response.json();
      if (!serverResult.success || !serverResult.works) {
        throw new Error('服务端返回数据格式错误');
      }
      
      const serverWorks = serverResult.works;
      const serverWorkIds = new Set(serverWorks.map((work: Work) => work.id));
      
      // 同步本地作品到服务端
      for (const localWork of localWorks) {
        try {
          if (serverWorkIds.has(localWork.id)) {
            // 更新服务端作品
            const updateResponse = await fetch(`/api/works/${localWork.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(localWork)
            });
            
            if (updateResponse.ok) {
              syncedCount++;
            } else {
              errors.push(`更新作品 ${localWork.title} 失败: ${updateResponse.status}`);
            }
          } else {
            // 创建新作品到服务端
            const createResponse = await fetch('/api/works/', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(localWork)
            });
            
            if (createResponse.ok) {
              syncedCount++;
            } else {
              errors.push(`创建作品 ${localWork.title} 失败: ${createResponse.status}`);
            }
          }
        } catch (error) {
          errors.push(`同步作品 ${localWork.title} 失败: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      this.emitEvent(EventType.WORK_SYNCED, {
        data: {
          message: `同步完成，成功 ${syncedCount} 个，失败 ${errors.length} 个`,
          syncedCount,
          errorCount: errors.length
        }
      });
      
      return { success: errors.length === 0, syncedCount, errors };
    } catch (error) {
      const errorMessage = `同步过程中发生错误: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMessage);
      this.handleError('同步作品', error as Error);
      return { success: false, syncedCount: 0, errors };
    } finally {
      this.syncInProgress = false;
    }
  }

  // 数据库管理方法
  async deleteDatabase(): Promise<void> {
    if (this.initialized) {
      await this.close();
    }
    await this.dbAdapter.deleteDatabase();
  }

  // 分片管理方法
  async saveShard(shard: any): Promise<void> {
    this.ensureInitialized();
    await this.shardStore.saveShard(shard);
    this.shardManager.getShard(shard.shardId); // 更新缓存
  }

  async saveShards(shards: any[]): Promise<void> {
    this.ensureInitialized();
    await this.shardStore.saveShards(shards);
    shards.forEach(shard => this.shardManager.getShard(shard.shardId)); // 更新缓存
  }

  async getShard(shardId: string): Promise<any | null> {
    this.ensureInitialized();
    // 尝试从缓存获取
    const cachedShard = this.shardManager.getShard(shardId);
    if (cachedShard) {
      return cachedShard;
    }
    // 从存储获取
    const shard = await this.shardStore.getShard(shardId);
    return shard;
  }

  async getShardsByWorkId(workId: string): Promise<any[]> {
    this.ensureInitialized();
    return await this.shardStore.getShardsByWorkId(workId);
  }

  async deleteShard(shardId: string): Promise<boolean> {
    this.ensureInitialized();
    const result = await this.shardStore.deleteShard(shardId);
    if (result) {
      // 清除缓存
      this.shardManager.clearCache('');
    }
    return result;
  }

  async deleteShardsByWorkId(workId: string): Promise<number> {
    this.ensureInitialized();
    const count = await this.shardStore.deleteShardsByWorkId(workId);
    // 清除缓存
    this.shardManager.clearCache(workId);
    return count;
  }

  async updateShard(shardId: string, updates: Partial<any>): Promise<any | null> {
    this.ensureInitialized();
    const updatedShard = await this.shardStore.updateShard(shardId, updates);
    if (updatedShard) {
      // 更新缓存
      this.shardManager.getShard(shardId);
    }
    return updatedShard;
  }

  async getShardCount(workId: string): Promise<number> {
    this.ensureInitialized();
    return await this.shardStore.getShardCount(workId);
  }

  async cleanupOldShards(workId: string, keepCount: number): Promise<number> {
    this.ensureInitialized();
    const deletedCount = await this.shardStore.cleanupOldShards(workId, keepCount);
    // 清除缓存
    this.shardManager.clearCache(workId);
    return deletedCount;
  }

  // 内部方法
  private emitEvent(type: EventType, data: Partial<EventData>): void {
    this.eventEmitter.emit(type, data);
  }

  private handleError(method: string, error: any): void {
    this.emitEvent(EventType.ERROR, {
      error: error as Error,
      data: {
        message: `${method} 方法错误: ${error.message || String(error)}`
      }
    });
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('存储服务未初始化');
    }
  }
}
