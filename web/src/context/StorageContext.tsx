import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Work, WorkCreateDTO, WorkUpdateDTO, QueryOptions } from '../models/Work';
import { Template, TemplateCreateDTO, TemplateUpdateDTO } from '../models/Template';
import { HistoryVersion, HistoryVersionCreateDTO } from '../models/HistoryVersion';
import { StorageService } from '../services/storage/StorageService';
import { EventType } from '../services/storage/interfaces/EventEmitter';

interface StorageContextType {
  // 状态
  works: Work[];
  templates: Template[];
  isLoading: boolean;
  error: string | null;
  initialized: boolean;
  
  // 作品操作
  createWork: (dto: WorkCreateDTO) => Promise<Work>;
  updateWork: (workId: string, dto: WorkUpdateDTO) => Promise<Work>;
  deleteWork: (workId: string, hardDelete?: boolean) => Promise<boolean>;
  restoreWork: (workId: string) => Promise<Work>;
  getWork: (workId: string) => Promise<Work | null>;
  listWorks: (options: QueryOptions) => Promise<Work[]>;
  copyWork: (workId: string, newTitle?: string) => Promise<Work>;
  
  // 模板操作
  createTemplate: (dto: TemplateCreateDTO) => Promise<Template>;
  updateTemplate: (templateId: string, dto: TemplateUpdateDTO) => Promise<Template>;
  getTemplate: (templateId: string) => Promise<Template | null>;
  listTemplates: (options: QueryOptions) => Promise<Template[]>;
  getDefaultTemplates: () => Promise<Template[]>;
  
  // 历史版本操作
  createVersion: (dto: HistoryVersionCreateDTO) => Promise<HistoryVersion>;
  getVersions: (workId: string) => Promise<HistoryVersion[]>;
  restoreVersion: (workId: string, versionId: string) => Promise<boolean>;
  
  // 导出/导入
  exportWork: (workId: string, format: 'mm' | 'xmind' | 'json') => Promise<Blob>;
  importWork: (file: Blob, format: 'mm' | 'xmind' | 'json') => Promise<Work>;
  
  // 工具方法
  initialize: () => Promise<void>;
  close: () => Promise<void>;
  clearError: () => void;
  
  // 分片管理
  saveShard: (shard: any) => Promise<void>;
  saveShards: (shards: any[]) => Promise<void>;
  getShard: (shardId: string) => Promise<any | null>;
  getShardsByWorkId: (workId: string) => Promise<any[]>;
  deleteShard: (shardId: string) => Promise<boolean>;
  deleteShardsByWorkId: (workId: string) => Promise<number>;
  
  // 数据库管理
  resetDatabase: () => Promise<void>;
}

const StorageContext = createContext<StorageContextType | undefined>(undefined);

export const StorageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [works, setWorks] = useState<Work[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  
  // 服务实例
  const [storageService, setStorageService] = useState<StorageService | null>(null);
  
  // 初始化服务
  const initializeServices = async () => {
    console.log('=== StorageContext.initializeServices: 开始初始化存储服务 ===');
    try {
      setIsLoading(true);
      console.log('1. 开始初始化存储服务');
      
      console.log('2. 创建存储服务实例');
      const service = StorageService.getInstance();
      console.log('3. 存储服务实例创建成功');
      
      console.log('4. 开始初始化存储服务核心');
      try {
        await service.initialize();
        console.log('5. 存储服务核心初始化成功');
      } catch (initError) {
        console.error('5. 存储服务核心初始化失败:', initError);
        throw new Error(`存储服务初始化失败: ${(initError as Error).message}`);
      }
      
      console.log('6. 设置存储服务到状态');
      setStorageService(service);
      console.log('7. 存储服务设置成功');
      
      console.log('8. 开始加载初始数据');
      try {
        await loadInitialData(service);
        console.log('9. 初始数据加载成功');
      } catch (dataError) {
        console.error('9. 初始数据加载失败:', dataError);
        // 初始数据加载失败不阻止初始化过程
      }
      
      console.log('10. 开始订阅事件');
      subscribeToEvents(service);
      console.log('11. 事件订阅成功');
      
      console.log('12. 设置初始化状态为true');
      setInitialized(true);
      console.log('13. 重置错误状态');
      setError(null);
      
      console.log('=== StorageContext.initializeServices: 存储服务初始化完成 ===');
    } catch (err) {
      const errorMessage = (err as Error).message;
      console.error('=== StorageContext.initializeServices: 初始化失败 ===:', errorMessage);
      console.error('错误堆栈:', (err as Error).stack);
      setError(errorMessage);
      setInitialized(false);
    } finally {
      setIsLoading(false);
      console.log('=== StorageContext.initializeServices: 加载状态设置为false ===');
    }
  };
  
  // 加载初始数据
  const loadInitialData = async (service: StorageService) => {
    console.log('StorageContext.loadInitialData: 开始加载初始数据');
    try {
      // 加载作品 - 使用完整的查询选项
      console.log('StorageContext.loadInitialData: 开始加载作品');
      const worksQueryOptions = {
        page: 1,
        pageSize: 20,
        searchText: '',
        category: undefined,
        starredOnly: false,
        tags: undefined,
        sortBy: undefined,
        deletedOnly: false,
        sortOrder: 'desc' as const
      };
      console.log('StorageContext.loadInitialData: 作品查询选项:', worksQueryOptions);
      const worksResult = await service.listWorks(worksQueryOptions);
      console.log('StorageContext.loadInitialData: 作品加载结果:', worksResult.works.length, '个作品');
      setWorks(worksResult.works);
      console.log('StorageContext.loadInitialData: 作品状态更新成功');
      
      // 加载模板 - 使用完整的查询选项
      console.log('StorageContext.loadInitialData: 开始加载模板');
      const templatesQueryOptions = {
        page: 1,
        pageSize: 20,
        searchText: '',
        category: undefined,
        starredOnly: false,
        tags: undefined,
        sortBy: undefined,
        deletedOnly: false,
        sortOrder: 'desc' as const
      };
      console.log('StorageContext.loadInitialData: 模板查询选项:', templatesQueryOptions);
      const templatesResult = await service.listTemplates(templatesQueryOptions);
      console.log('StorageContext.loadInitialData: 模板加载结果:', templatesResult.works.length, '个模板');
      setTemplates(templatesResult.works as Template[]);
      console.log('StorageContext.loadInitialData: 模板状态更新成功');
      
      // 检查默认模板
      console.log('StorageContext.loadInitialData: 开始检查默认模板');
      const defaultTemplates = await service.getDefaultTemplates();
      console.log('StorageContext.loadInitialData: 默认模板数量:', defaultTemplates.length);
      if (defaultTemplates.length === 0) {
        console.log('StorageContext.loadInitialData: 无默认模板，开始创建');
        await createDefaultTemplates(service);
        console.log('StorageContext.loadInitialData: 默认模板创建成功');
        // 重新加载模板
        console.log('StorageContext.loadInitialData: 重新加载模板');
        const updatedTemplatesResult = await service.listTemplates(templatesQueryOptions);
        console.log('StorageContext.loadInitialData: 模板重新加载结果:', updatedTemplatesResult.works.length, '个模板');
        setTemplates(updatedTemplatesResult.works as Template[]);
        console.log('StorageContext.loadInitialData: 模板状态更新成功');
      } else {
        console.log('StorageContext.loadInitialData: 默认模板已存在，跳过创建');
      }
      console.log('StorageContext.loadInitialData: 初始数据加载完成');
    } catch (err) {
      console.error('StorageContext.loadInitialData: 加载初始数据失败:', err);
      // 静默处理错误
    }
  };
  
  // 创建默认模板
  const createDefaultTemplates = async (service: StorageService) => {
    console.log('StorageContext.createDefaultTemplates: 开始创建默认模板');
    try {
      const defaultTemplates = [
        {
          title: '基础模板',
          templateType: 'basic' as const,
          isDefault: true,
          themeConfig: {
            primaryColor: '#3b82f6',
            secondaryColor: '#10b981',
            backgroundColor: '#ffffff',
            nodeShape: 'rounded' as const,
            edgeStyle: 'curved' as const,
            fontFamily: 'sans-serif',
            animationEnabled: true
          },
          layoutConfig: {
            layoutType: 'mindmap' as const,
            direction: 'horizontal' as const,
            levelSpacing: 80,
            nodeSpacing: 40
          }
        },
        {
          title: '商务模板',
          templateType: 'business' as const,
          isDefault: true,
          themeConfig: {
            primaryColor: '#1e40af',
            secondaryColor: '#0f766e',
            backgroundColor: '#f8fafc',
            nodeShape: 'rectangle' as const,
            edgeStyle: 'straight' as const,
            fontFamily: 'sans-serif',
            animationEnabled: false
          },
          layoutConfig: {
            layoutType: 'orgchart' as const,
            direction: 'vertical' as const,
            levelSpacing: 100,
            nodeSpacing: 60
          }
        }
      ];
      
      console.log('StorageContext.createDefaultTemplates: 默认模板数量:', defaultTemplates.length);
      for (let i = 0; i < defaultTemplates.length; i++) {
        const templateData = defaultTemplates[i];
        console.log('StorageContext.createDefaultTemplates: 创建模板', i + 1, ':', templateData.title);
        try {
          await service.createTemplate(templateData);
          console.log('StorageContext.createDefaultTemplates: 模板创建成功:', templateData.title);
        } catch (templateError) {
          console.error('StorageContext.createDefaultTemplates: 模板创建失败:', templateData.title, templateError);
        }
      }
      console.log('StorageContext.createDefaultTemplates: 默认模板创建完成');
    } catch (err) {
      console.error('StorageContext.createDefaultTemplates: 创建默认模板失败:', err);
      // 静默处理错误
    }
  };
  
  // 订阅事件
  const subscribeToEvents = (service: StorageService) => {
    // 作品创建事件
    service.subscribe(EventType.WORK_CREATED, (data) => {
      if (data.workId) {
        // 刷新作品列表
        refreshWorks();
      }
    });
    
    // 作品更新事件
    service.subscribe(EventType.WORK_UPDATED, (data) => {
      if (data.workId) {
        // 刷新作品列表
        refreshWorks();
      }
    });
    
    // 作品删除事件
    service.subscribe(EventType.WORK_DELETED, (data) => {
      if (data.workId) {
        // 刷新作品列表
        refreshWorks();
      }
    });
    
    // 模板创建事件
    service.subscribe(EventType.TEMPLATE_CREATED, () => {
      refreshTemplates();
    });
    
    // 模板更新事件
    service.subscribe(EventType.TEMPLATE_UPDATED, () => {
      refreshTemplates();
    });
  };
  
  // 刷新作品列表
  const refreshWorks = async () => {
    if (storageService) {
      try {
        // 使用完整的查询选项，确保获取所有作品
        const queryOptions = {
          page: 1,
          pageSize: 20,
          searchText: '',
          category: undefined,
          starredOnly: false,
          tags: undefined,
          sortBy: 'lastModified' as const,
          deletedOnly: false,
          sortOrder: 'desc' as const
        };
        const result = await storageService.listWorks(queryOptions);
        setWorks(result.works);
      } catch (error) {
        // 静默处理错误
      }
    }
  };
  
  // 刷新模板列表
  const refreshTemplates = async () => {
    if (storageService) {
      const result = await storageService.listTemplates({});
      setTemplates(result.works as Template[]);
    }
  };
  
  // 作品操作
  const createWork = async (dto: WorkCreateDTO): Promise<Work> => {
    if (!storageService) {
      throw new Error('Storage service not initialized');
    }
    
    try {
      const work = await storageService.createWork(dto);
      // 不立即刷新作品列表，避免覆盖组件本地状态
      // 让组件在需要时自行刷新
      return work;
    } catch (error) {
      throw error;
    }
  };
  
  const updateWork = async (workId: string, dto: WorkUpdateDTO): Promise<Work> => {
    if (!storageService) {
      throw new Error('Storage service not initialized');
    }
    
    const work = await storageService.updateWork(workId, dto);
    await refreshWorks();
    return work;
  };
  
  const deleteWork = async (workId: string, hardDelete?: boolean): Promise<boolean> => {
    if (!storageService) {
      throw new Error('Storage service not initialized');
    }
    
    const result = await storageService.deleteWork(workId, hardDelete);
    if (result) {
      await refreshWorks();
    }
    return result;
  };
  
  const restoreWork = async (workId: string): Promise<Work> => {
    if (!storageService) {
      throw new Error('Storage service not initialized');
    }
    
    const work = await storageService.restoreWork(workId);
    await refreshWorks();
    return work;
  };
  
  const getWork = async (workId: string): Promise<Work | null> => {
    console.log('StorageContext.getWork: 获取作品', workId);
    if (!storageService) {
      console.error('StorageContext.getWork: 存储服务未初始化');
      throw new Error('Storage service not initialized');
    }
    
    try {
      const work = await storageService.readWork(workId);
      console.log('StorageContext.getWork: 获取作品结果', work ? '成功' : '失败');
      if (work) {
        console.log('StorageContext.getWork: 作品详情', {
          id: work.id,
          title: work.title,
          hasEncryptedData: work.encryptedData ? '有' : '无',
          encryptedDataLength: work.encryptedData ? work.encryptedData.length : 0
        });
      }
      return work;
    } catch (error) {
      console.error('StorageContext.getWork: 获取作品失败', error);
      throw error;
    }
  };
  
  const listWorks = async (options: QueryOptions): Promise<Work[]> => {
    if (!storageService) {
      // 等待存储服务初始化
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!storageService) {
        throw new Error('Storage service not initialized');
      }
    }
    
    // 确保 options 不是空对象，添加默认值
    const safeOptions = {
      page: options.page || 1,
      pageSize: options.pageSize || 20,
      searchText: options.searchText || '',
      category: options.category,
      starredOnly: options.starredOnly || false,
      tags: options.tags,
      sortBy: options.sortBy,
      deletedOnly: options.deletedOnly || false,
      sortOrder: options.sortOrder || 'desc'
    };
    
    try {
      const result = await storageService.listWorks(safeOptions);
      // 更新本地 works 状态，确保其他组件也能获取到最新数据
      setWorks(result.works);
      return result.works;
    } catch (error) {
      throw error;
    }
  };
  
  const copyWork = async (workId: string, newTitle?: string): Promise<Work> => {
    if (!storageService) {
      throw new Error('Storage service not initialized');
    }
    
    const work = await storageService.copyWork(workId, newTitle);
    await refreshWorks();
    return work;
  };
  
  // 模板操作
  const createTemplate = async (dto: TemplateCreateDTO): Promise<Template> => {
    if (!storageService) {
      throw new Error('Storage service not initialized');
    }
    
    const template = await storageService.createTemplate(dto);
    await refreshTemplates();
    return template;
  };
  
  const updateTemplate = async (templateId: string, dto: TemplateUpdateDTO): Promise<Template> => {
    if (!storageService) {
      throw new Error('Storage service not initialized');
    }
    
    const template = await storageService.updateTemplate(templateId, dto);
    await refreshTemplates();
    return template;
  };
  
  const getTemplate = async (templateId: string): Promise<Template | null> => {
    if (!storageService) {
      throw new Error('Storage service not initialized');
    }
    
    return await storageService.getTemplate(templateId);
  };
  
  const listTemplates = async (options: QueryOptions): Promise<Template[]> => {
    if (!storageService) {
      throw new Error('Storage service not initialized');
    }
    
    const result = await storageService.listTemplates(options);
    return result.works as Template[];
  };
  
  const getDefaultTemplates = async (): Promise<Template[]> => {
    if (!storageService) {
      throw new Error('Storage service not initialized');
    }
    
    return await storageService.getDefaultTemplates();
  };
  
  // 历史版本操作
  const createVersion = async (dto: HistoryVersionCreateDTO): Promise<HistoryVersion> => {
    if (!storageService) {
      throw new Error('Storage service not initialized');
    }
    
    return await storageService.createVersion(dto);
  };
  
  const getVersions = async (workId: string): Promise<HistoryVersion[]> => {
    if (!storageService) {
      throw new Error('Storage service not initialized');
    }
    
    return await storageService.getVersions(workId);
  };
  
  const restoreVersion = async (workId: string, versionId: string): Promise<boolean> => {
    if (!storageService) {
      throw new Error('Storage service not initialized');
    }
    
    const result = await storageService.restoreVersion(workId, versionId);
    if (result) {
      await refreshWorks();
    }
    return result;
  };
  
  // 导出/导入
  const exportWork = async (workId: string, format: 'mm' | 'xmind' | 'json'): Promise<Blob> => {
    if (!storageService) {
      throw new Error('Storage service not initialized');
    }
    
    return await storageService.exportWork(workId, format);
  };
  
  const importWork = async (file: Blob, format: 'mm' | 'xmind' | 'json'): Promise<Work> => {
    if (!storageService) {
      throw new Error('Storage service not initialized');
    }
    
    const work = await storageService.importWork(file, format);
    await refreshWorks();
    return work;
  };
  
  // 分片管理操作
  const saveShard = async (shard: any): Promise<void> => {
    if (!storageService) {
      throw new Error('Storage service not initialized');
    }
    
    await storageService.saveShard(shard);
  };
  
  // 数据库重置操作
  const resetDatabase = async (): Promise<void> => {
    if (storageService) {
      await storageService.deleteDatabase();
      // 重新初始化服务
      await initializeServices();
    }
  };
  
  const saveShards = async (shards: any[]): Promise<void> => {
    if (!storageService) {
      throw new Error('Storage service not initialized');
    }
    
    await storageService.saveShards(shards);
  };
  
  const getShard = async (shardId: string): Promise<any | null> => {
    if (!storageService) {
      throw new Error('Storage service not initialized');
    }
    
    return await storageService.getShard(shardId);
  };
  
  const getShardsByWorkId = async (workId: string): Promise<any[]> => {
    if (!storageService) {
      throw new Error('Storage service not initialized');
    }
    
    return await storageService.getShardsByWorkId(workId);
  };
  
  const deleteShard = async (shardId: string): Promise<boolean> => {
    if (!storageService) {
      throw new Error('Storage service not initialized');
    }
    
    return await storageService.deleteShard(shardId);
  };
  
  const deleteShardsByWorkId = async (workId: string): Promise<number> => {
    if (!storageService) {
      throw new Error('Storage service not initialized');
    }
    
    return await storageService.deleteShardsByWorkId(workId);
  };
  
  // 初始化
  useEffect(() => {
    initializeServices();
    
    return () => {
      // 组件卸载时关闭服务
      if (storageService) {
        storageService.close();
      }
    };
  }, []);
  
  // 清除错误
  const clearError = () => {
    setError(null);
  };
  
  // 初始化存储
  const initialize = async () => {
    setIsLoading(true);
    try {
      await initializeServices();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 关闭存储
  const close = async () => {
    if (storageService) {
      await storageService.close();
    }
  };
  
  const value = {
    // 状态
    works,
    templates,
    isLoading,
    error,
    initialized,
    
    // 作品操作
    createWork,
    updateWork,
    deleteWork,
    restoreWork,
    getWork,
    listWorks,
    copyWork,
    
    // 模板操作
    createTemplate,
    updateTemplate,
    getTemplate,
    listTemplates,
    getDefaultTemplates,
    
    // 历史版本操作
    createVersion,
    getVersions,
    restoreVersion,
    
    // 导出/导入
    exportWork,
    importWork,
    
    // 工具方法
    initialize,
    close,
    clearError,
    
    // 分片管理
    saveShard,
    saveShards,
    getShard,
    getShardsByWorkId,
    deleteShard,
    deleteShardsByWorkId,
    
    // 数据库管理
    resetDatabase
  };
  
  return (
    <StorageContext.Provider value={value}>
      {children}
    </StorageContext.Provider>
  );
};

// 自定义Hook
export const useStorage = () => {
  const context = useContext(StorageContext);
  if (!context) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return context;
};

export { StorageContext };
