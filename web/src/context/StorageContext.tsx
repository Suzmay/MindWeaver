import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Work, WorkCreateDTO, WorkUpdateDTO, QueryOptions, WorkListResult } from '../models/Work';
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
  listWorks: (options: QueryOptions) => Promise<WorkListResult>;
  copyWork: (workId: string, newTitle?: string) => Promise<Work>;
  
  // 模板操作
  createTemplate: (dto: TemplateCreateDTO) => Promise<Template>;
  updateTemplate: (templateId: string, dto: TemplateUpdateDTO) => Promise<Template>;
  deleteTemplate: (templateId: string) => Promise<void>;
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
  exportTemplate: (templateId: string) => Promise<Blob>;
  importTemplate: (file: Blob) => Promise<Template>;
  
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
  resetWorks: () => Promise<void>;
  resetTemplates: () => Promise<void>;
  resetAssets: () => Promise<void>;
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
    try {
      setIsLoading(true);
      
      const service = StorageService.getInstance();
      
      try {
        await service.initialize();
      } catch (initError) {
        console.error('存储服务核心初始化失败:', initError);
        throw new Error(`存储服务初始化失败: ${(initError as Error).message}`);
      }
      
      setStorageService(service);
      
      try {
        await loadInitialData(service);
      } catch (dataError) {
        console.error('初始数据加载失败:', dataError);
        // 初始数据加载失败不阻止初始化过程
      }
      
      subscribeToEvents(service);
      
      setInitialized(true);
      setError(null);
    } catch (err) {
      const errorMessage = (err as Error).message;
      console.error('StorageContext.initializeServices: 初始化失败:', errorMessage);
      console.error('错误堆栈:', (err as Error).stack);
      setError(errorMessage);
      setInitialized(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 加载初始数据
  const loadInitialData = async (service: StorageService) => {
    try {
      // 加载作品 - 使用完整的查询选项
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
      const worksResult = await service.listWorks(worksQueryOptions);
      setWorks(worksResult.works);
      
      // 加载模板 - 使用完整的查询选项
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
      const templatesResult = await service.listTemplates(templatesQueryOptions);
      setTemplates(templatesResult.works as Template[]);
      
      // 检查默认模板
      const allTemplates = templatesResult.works as Template[];
      const defaultTemplates = allTemplates.filter(t => t.isDefault);
      if (defaultTemplates.length < 6) {
        await createDefaultTemplates(service);
        // 重新加载模板
        const updatedTemplatesResult = await service.listTemplates(templatesQueryOptions);
        setTemplates(updatedTemplatesResult.works as Template[]);
      }
    } catch (err) {
      console.error('StorageContext.loadInitialData: 加载初始数据失败:', err);
      // 静默处理错误
    }
  };
  
  // 创建默认模板
  const createDefaultTemplates = async (service: StorageService) => {
    try {
      // 获取所有已存在的模板
      const existingTemplatesResult = await service.listTemplates({});
      const existingTemplates = existingTemplatesResult.works as Template[];
      const existingTemplateTitles = new Set(existingTemplates.map(t => t.title));
      
      const defaultTemplates = [
        {
          title: '默认模板',
          templateType: 'basic' as const,
          description: '适合各种场景的基础通用思维导图模板',
          category: '基础',
          tags: ['基础', '通用'],
          isDefault: true,
          uploader: '官方',
          nodesData: [
            { id: 'root', title: '中心主题', children: ['node1', 'node2', 'node3'], isRoot: true },
            { id: 'node1', title: '主要分支', parentId: 'root' },
            { id: 'node2', title: '次要分支', parentId: 'root' },
            { id: 'node3', title: '辅助分支', parentId: 'root' },
          ],
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
          title: '商务战略',
          templateType: 'business' as const,
          description: '商业战略分析与规划模板',
          category: '商业',
          tags: ['商业', '战略'],
          isDefault: true,
          uploader: '官方',
          nodesData: [
            { id: 'root', title: '商务战略', children: ['market', 'strategy', 'execution', 'metrics'], isRoot: true },
            { id: 'market', title: '市场分析', children: ['target', 'competition'], parentId: 'root' },
            { id: 'target', title: '目标市场', parentId: 'market' },
            { id: 'competition', title: '竞争对手', parentId: 'market' },
            { id: 'strategy', title: '战略定位', children: ['differentiation', 'value'], parentId: 'root' },
            { id: 'differentiation', title: '差异化优势', parentId: 'strategy' },
            { id: 'value', title: '价值主张', parentId: 'strategy' },
            { id: 'execution', title: '执行计划', children: ['timeline', 'resources'], parentId: 'root' },
            { id: 'timeline', title: '关键时间节点', parentId: 'execution' },
            { id: 'resources', title: '资源分配', parentId: 'execution' },
            { id: 'metrics', title: '绩效指标', children: ['financial', 'operational'], parentId: 'root' },
            { id: 'financial', title: '财务指标', parentId: 'metrics' },
            { id: 'operational', title: '运营指标', parentId: 'metrics' },
          ],
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
            layoutType: 'mindmap' as const,
            direction: 'horizontal' as const,
            levelSpacing: 100,
            nodeSpacing: 60
          }
        },
        {
          title: '项目规划',
          templateType: 'business' as const,
          description: '项目计划与管理模板',
          category: '商业',
          tags: ['项目', '管理'],
          isDefault: true,
          uploader: '官方',
          nodesData: [
            { id: 'root', title: '项目规划', children: ['scope', 'schedule', 'team', 'budget'], isRoot: true },
            { id: 'scope', title: '项目范围', children: ['deliverables', 'objectives'], parentId: 'root' },
            { id: 'deliverables', title: '交付物', parentId: 'scope' },
            { id: 'objectives', title: '项目目标', parentId: 'scope' },
            { id: 'schedule', title: '项目进度', children: ['milestones', 'tasks'], parentId: 'root' },
            { id: 'milestones', title: '里程碑', parentId: 'schedule' },
            { id: 'tasks', title: '任务分解', parentId: 'schedule' },
            { id: 'team', title: '项目团队', children: ['roles', 'responsibilities'], parentId: 'root' },
            { id: 'roles', title: '团队角色', parentId: 'team' },
            { id: 'responsibilities', title: '职责分配', parentId: 'team' },
            { id: 'budget', title: '项目预算', children: ['costs', 'funding'], parentId: 'root' },
            { id: 'costs', title: '成本估算', parentId: 'budget' },
            { id: 'funding', title: '资金来源', parentId: 'budget' },
          ],
          themeConfig: {
            primaryColor: '#374151',
            secondaryColor: '#1f2937',
            backgroundColor: '#ffffff',
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
        },
        {
          title: '创意头脑风暴',
          templateType: 'personal' as const,
          description: '创意生成与头脑风暴模板',
          category: '创意',
          tags: ['创意', '头脑风暴'],
          isDefault: true,
          uploader: '官方',
          nodesData: [
            { id: 'root', title: '创意头脑风暴', children: ['problem', 'ideas', 'solutions', 'implementation'], isRoot: true },
            { id: 'problem', title: '问题定义', children: ['challenges', 'opportunities'], parentId: 'root' },
            { id: 'challenges', title: '当前挑战', parentId: 'problem' },
            { id: 'opportunities', title: '潜在机会', parentId: 'problem' },
            { id: 'ideas', title: '创意激发', children: ['idea1', 'idea2', 'idea3'], parentId: 'root' },
            { id: 'idea1', title: '创新方案一', parentId: 'ideas' },
            { id: 'idea2', title: '创新方案二', parentId: 'ideas' },
            { id: 'idea3', title: '创新方案三', parentId: 'ideas' },
            { id: 'solutions', title: '解决方案', children: ['feasibility', 'impact'], parentId: 'root' },
            { id: 'feasibility', title: '可行性评估', parentId: 'solutions' },
            { id: 'impact', title: '预期影响', parentId: 'solutions' },
            { id: 'implementation', title: '实施路径', children: ['steps', 'resources'], parentId: 'root' },
            { id: 'steps', title: '实施步骤', parentId: 'implementation' },
            { id: 'resources', title: '所需资源', parentId: 'implementation' },
          ],
          themeConfig: {
            primaryColor: '#8b5cf6',
            secondaryColor: '#ec4899',
            backgroundColor: '#ffffff',
            nodeShape: 'rounded' as const,
            edgeStyle: 'curved' as const,
            fontFamily: 'sans-serif',
            animationEnabled: true
          },
          layoutConfig: {
            layoutType: 'mindmap' as const,
            direction: 'horizontal' as const,
            levelSpacing: 100,
            nodeSpacing: 60
          }
        },
        {
          title: '学习笔记',
          templateType: 'education' as const,
          description: '学习与教育笔记模板',
          category: '教育',
          tags: ['学习', '笔记'],
          isDefault: true,
          uploader: '官方',
          nodesData: [
            { id: 'root', title: '学习笔记', children: ['topic', 'key_points', 'examples', 'review'], isRoot: true },
            { id: 'topic', title: '学习主题', parentId: 'root' },
            { id: 'key_points', title: '核心要点', children: ['concept1', 'concept2', 'concept3'], parentId: 'root' },
            { id: 'concept1', title: '概念一', parentId: 'key_points' },
            { id: 'concept2', title: '概念二', parentId: 'key_points' },
            { id: 'concept3', title: '概念三', parentId: 'key_points' },
            { id: 'examples', title: '实例应用', children: ['example1', 'example2'], parentId: 'root' },
            { id: 'example1', title: '应用实例一', parentId: 'examples' },
            { id: 'example2', title: '应用实例二', parentId: 'examples' },
            { id: 'review', title: '复习巩固', children: ['questions', 'summary'], parentId: 'root' },
            { id: 'questions', title: '思考问题', parentId: 'review' },
            { id: 'summary', title: '内容总结', parentId: 'review' },
          ],
          themeConfig: {
            primaryColor: '#06b6d4',
            secondaryColor: '#10b981',
            backgroundColor: '#ffffff',
            nodeShape: 'rounded' as const,
            edgeStyle: 'curved' as const,
            fontFamily: 'sans-serif',
            animationEnabled: false
          },
          layoutConfig: {
            layoutType: 'tree' as const,
            direction: 'vertical' as const,
            levelSpacing: 80,
            nodeSpacing: 40
          }
        },
        {
          title: '个人目标',
          templateType: 'personal' as const,
          description: '个人目标规划与管理模板',
          category: '个人',
          tags: ['个人', '目标'],
          isDefault: true,
          uploader: '官方',
          nodesData: [
            { id: 'root', title: '个人目标规划', children: ['career', 'health', 'growth', 'lifestyle'], isRoot: true },
            { id: 'career', title: '职业发展', children: ['skills', 'advancement'], parentId: 'root' },
            { id: 'skills', title: '技能提升', parentId: 'career' },
            { id: 'advancement', title: '职位晋升', parentId: 'career' },
            { id: 'health', title: '健康管理', children: ['fitness', 'nutrition'], parentId: 'root' },
            { id: 'fitness', title: '运动计划', parentId: 'health' },
            { id: 'nutrition', title: '饮食调整', parentId: 'health' },
            { id: 'growth', title: '自我成长', children: ['learning', 'hobbies'], parentId: 'root' },
            { id: 'learning', title: '学习计划', parentId: 'growth' },
            { id: 'hobbies', title: '兴趣培养', parentId: 'growth' },
            { id: 'lifestyle', title: '生活品质', children: ['relationships', 'wellbeing'], parentId: 'root' },
            { id: 'relationships', title: '人际关系', parentId: 'lifestyle' },
            { id: 'wellbeing', title: '心理健康', parentId: 'lifestyle' },
          ],
          themeConfig: {
            primaryColor: '#f97316',
            secondaryColor: '#ea580c',
            backgroundColor: '#ffffff',
            nodeShape: 'rounded' as const,
            edgeStyle: 'curved' as const,
            fontFamily: 'sans-serif',
            animationEnabled: true
          },
          layoutConfig: {
            layoutType: 'mindmap' as const,
            direction: 'horizontal' as const,
            levelSpacing: 100,
            nodeSpacing: 60
          }
        }
      ];
      
      // 只创建那些不存在的默认模板
      for (let i = 0; i < defaultTemplates.length; i++) {
        const templateData = defaultTemplates[i];
        if (!existingTemplateTitles.has(templateData.title)) {
          try {
            await service.createTemplate(templateData);
          } catch (templateError) {
            console.error('StorageContext.createDefaultTemplates: 模板创建失败:', templateData.title, templateError);
          }
        }
      }
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
      throw new Error('存储服务未初始化');
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
      throw new Error('存储服务未初始化');
    }
    
    const work = await storageService.updateWork(workId, dto);
    await refreshWorks();
    return work;
  };
  
  const deleteWork = async (workId: string, hardDelete?: boolean): Promise<boolean> => {
    if (!storageService) {
      throw new Error('存储服务未初始化');
    }
    
    const result = await storageService.deleteWork(workId, hardDelete);
    if (result) {
      await refreshWorks();
    }
    return result;
  };
  
  const restoreWork = async (workId: string): Promise<Work> => {
    if (!storageService) {
      throw new Error('存储服务未初始化');
    }
    
    const work = await storageService.restoreWork(workId);
    await refreshWorks();
    return work;
  };
  
  const getWork = async (workId: string): Promise<Work | null> => {
    if (!storageService) {
      console.error('StorageContext.getWork: 存储服务未初始化');
      throw new Error('存储服务未初始化');
    }
    
    try {
      const work = await storageService.readWork(workId);
      return work;
    } catch (error) {
      console.error('StorageContext.getWork: 获取作品失败', error);
      throw error;
    }
  };
  
  const listWorks = async (options: QueryOptions): Promise<WorkListResult> => {
    if (!storageService) {
      // 等待存储服务初始化
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!storageService) {
        throw new Error('存储服务未初始化');
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
      return result;
    } catch (error) {
      throw error;
    }
  };
  
  const copyWork = async (workId: string, newTitle?: string): Promise<Work> => {
    if (!storageService) {
      throw new Error('存储服务未初始化');
    }
    
    const work = await storageService.copyWork(workId, newTitle);
    await refreshWorks();
    return work;
  };
  
  // 模板操作
  const createTemplate = async (dto: TemplateCreateDTO): Promise<Template> => {
    if (!storageService) {
      throw new Error('存储服务未初始化');
    }
    
    const template = await storageService.createTemplate(dto);
    await refreshTemplates();
    return template;
  };
  
  const updateTemplate = async (templateId: string, dto: TemplateUpdateDTO): Promise<Template> => {
    if (!storageService) {
      throw new Error('存储服务未初始化');
    }
    
    const template = await storageService.updateTemplate(templateId, dto);
    await refreshTemplates();
    return template;
  };

  const deleteTemplate = async (templateId: string): Promise<void> => {
    if (!storageService) {
      throw new Error('存储服务未初始化');
    }
    
    await storageService.deleteTemplate(templateId);
    await refreshTemplates();
  };

  const getTemplate = async (templateId: string): Promise<Template | null> => {
    if (!storageService) {
      throw new Error('存储服务未初始化');
    }
    
    return await storageService.getTemplate(templateId);
  };
  
  const listTemplates = async (options: QueryOptions): Promise<Template[]> => {
    if (!storageService) {
      throw new Error('存储服务未初始化');
    }
    
    const result = await storageService.listTemplates(options);
    return result.works as Template[];
  };
  
  const getDefaultTemplates = async (): Promise<Template[]> => {
    if (!storageService) {
      throw new Error('存储服务未初始化');
    }
    
    return await storageService.getDefaultTemplates();
  };
  
  // 历史版本操作
  const createVersion = async (dto: HistoryVersionCreateDTO): Promise<HistoryVersion> => {
    if (!storageService) {
      throw new Error('存储服务未初始化');
    }
    
    return await storageService.createVersion(dto);
  };
  
  const getVersions = async (workId: string): Promise<HistoryVersion[]> => {
    if (!storageService) {
      throw new Error('存储服务未初始化');
    }
    
    return await storageService.getVersions(workId);
  };
  
  const restoreVersion = async (workId: string, versionId: string): Promise<boolean> => {
    if (!storageService) {
      throw new Error('存储服务未初始化');
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
      throw new Error('存储服务未初始化');
    }
    
    return await storageService.exportWork(workId, format);
  };
  
  const importWork = async (file: Blob, format: 'mm' | 'xmind' | 'json'): Promise<Work> => {
    if (!storageService) {
      throw new Error('存储服务未初始化');
    }
    
    const work = await storageService.importWork(file, format);
    await refreshWorks();
    return work;
  };
  
  const exportTemplate = async (templateId: string): Promise<Blob> => {
    if (!storageService) {
      throw new Error('存储服务未初始化');
    }
    
    return await storageService.exportTemplate(templateId);
  };
  
  const importTemplate = async (file: Blob): Promise<Template> => {
    if (!storageService) {
      throw new Error('存储服务未初始化');
    }
    
    const template = await storageService.importTemplate(file);
    await refreshTemplates();
    return template;
  };
  
  // 分片管理操作
  const saveShard = async (shard: any): Promise<void> => {
    if (!storageService) {
      throw new Error('存储服务未初始化');
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

  // 重置作品（删除所有用户创建的作品）
  const resetWorks = async (): Promise<void> => {
    if (storageService) {
      await storageService.deleteAllWorks();
      await refreshWorks();
    }
  };

  // 重置模板（删除所有用户创建的模板，保留官方模板）
  const resetTemplates = async (): Promise<void> => {
    if (storageService) {
      await storageService.deleteAllUserTemplates();
      await refreshTemplates();
    }
  };

  // 重置素材（删除所有用户上传的素材）
  const resetAssets = async (): Promise<void> => {
    if (storageService) {
      await storageService.deleteAllAssets();
    }
  };
  
  const saveShards = async (shards: any[]): Promise<void> => {
    if (!storageService) {
      throw new Error('存储服务未初始化');
    }
    
    await storageService.saveShards(shards);
  };
  
  const getShard = async (shardId: string): Promise<any | null> => {
    if (!storageService) {
      throw new Error('存储服务未初始化');
    }
    
    return await storageService.getShard(shardId);
  };
  
  const getShardsByWorkId = async (workId: string): Promise<any[]> => {
    if (!storageService) {
      throw new Error('存储服务未初始化');
    }
    
    return await storageService.getShardsByWorkId(workId);
  };
  
  const deleteShard = async (shardId: string): Promise<boolean> => {
    if (!storageService) {
      throw new Error('存储服务未初始化');
    }
    
    return await storageService.deleteShard(shardId);
  };
  
  const deleteShardsByWorkId = async (workId: string): Promise<number> => {
    if (!storageService) {
      throw new Error('存储服务未初始化');
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
    deleteTemplate,
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
    exportTemplate,
    importTemplate,
    
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
    resetDatabase,
    resetWorks,
    resetTemplates,
    resetAssets
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
    throw new Error('useStorage 必须在 StorageProvider 内部使用');
  }
  return context;
};

export { StorageContext };
