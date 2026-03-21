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
      this.initialized = true;
      
      this.emitEvent(EventType.INITIALIZED, {
        data: {
          message: '存储服务初始化成功'
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

  // 作品操作
  async createWork(dto: WorkCreateDTO): Promise<Work> {
    this.ensureInitialized();
    
    try {
      const work = await this.workStore.create(dto);
      this.workCache.set(work.id, work);
      
      this.emitEvent(EventType.WORK_CREATED, {
        workId: work.id,
        data: {
          message: `作品创建成功: ${work.title}`
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
      
      this.emitEvent(EventType.WORK_UPDATED, {
        workId: work.id,
        data: {
          message: `作品更新成功: ${work.title}`
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
        
        this.emitEvent(EventType.WORK_DELETED, {
          workId,
          data: {
            message: `作品删除成功: ${workId}`
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
      
      // 准备复制数据
      const dto: WorkCreateDTO = {
        title: newTitle || `${existingWork.title}(1)`,
        category: existingWork.category,
        tags: existingWork.tags,
        nodes: existingWork.nodes
      };
      
      // 创建新作品
      const copiedWork = await this.workStore.create(dto);
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
