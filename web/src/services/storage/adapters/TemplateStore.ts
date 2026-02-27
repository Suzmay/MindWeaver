import { Template, TemplateCreateDTO, TemplateUpdateDTO } from '../../../models/Template';
import { TemplateRepository } from '../interfaces/TemplateRepository';
import { IndexedDBAdapter } from './IndexedDBAdapter';
import { WorkStore } from './WorkStore';
import { WorkListResult, QueryOptions } from '../../../models/Work';
import { EventEmitter } from '../interfaces/EventEmitter';

export class TemplateStore extends WorkStore implements TemplateRepository {
  
  constructor(dbAdapter: IndexedDBAdapter, eventEmitter: EventEmitter) {
    super(dbAdapter, eventEmitter);
  }
  
  // 按模板类型查询
  async findByType(templateType: string): Promise<Template[]> {
    const dbAdapter = (this as any).dbAdapter;
    return await dbAdapter.executeTransaction('templates', 'readonly', async (transaction: IDBTransaction) => {
      const store = transaction.objectStore('templates');
      const index = store.index('templateType');
      const templates: Template[] = [];
      
      const cursor = index.openCursor(IDBKeyRange.only(templateType));
      
      await new Promise<void>((resolve) => {
        cursor.onsuccess = (event: Event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            templates.push(cursor.value as Template);
            cursor.continue();
          } else {
            resolve();
          }
        };
        
        cursor.onerror = () => {
          resolve();
        };
      });
      
      return templates;
    });
  }
  
  // 获取默认模板列表
  async getDefaultTemplates(): Promise<Template[]> {
    const dbAdapter = (this as any).dbAdapter;
    return await dbAdapter.executeTransaction('templates', 'readonly', async (transaction: IDBTransaction) => {
      const store = transaction.objectStore('templates');
      const index = store.index('isDefault');
      const templates: Template[] = [];
      
      try {
        const cursor = index.openCursor(IDBKeyRange.only(true));
        
        await new Promise<void>((resolve) => {
          cursor.onsuccess = (event: Event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
              templates.push(cursor.value as Template);
              cursor.continue();
            } else {
              resolve();
            }
          };
          
          cursor.onerror = () => {
            resolve();
          };
        });
      } catch (error) {
        console.error('Error getting default templates:', error);
        // 回退到全表扫描
        const cursor = store.openCursor();
        
        await new Promise<void>((resolve) => {
          cursor.onsuccess = (event: Event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
              const template = cursor.value as Template;
              if (template.isDefault) {
                templates.push(template);
              }
              cursor.continue();
            } else {
              resolve();
            }
          };
          
          cursor.onerror = () => {
            resolve();
          };
        });
      }
      
      return templates;
    });
  }
  
  // 创建模板
  async createTemplate(dto: TemplateCreateDTO): Promise<Template> {
    const dbAdapter = (this as any).dbAdapter;
    const now = new Date().toISOString();
    const id = Date.now().toString();
    
    // 准备模板数据
    const template: Template = {
      id,
      title: dto.title,
      lastModified: now,
      createdAt: now,
      isDeleted: false,
      dataVersion: 1,
      checksum: '',
      encryptedData: '',
      category: '模板',
      tags: [],
      nodes: 0,
      starred: false,
      templateType: dto.templateType,
      isDefault: dto.isDefault || false,
      themeConfig: dto.themeConfig,
      layoutConfig: dto.layoutConfig,
      usageCount: 0
    };
    
    // 加密数据
    const keyManager = (this as any).keyManager;
    const encryptionService = (this as any).encryptionService;
    const key = keyManager.getKey();
    if (!key) {
      throw new Error('没有可用的加密密钥');
    }
    
    const templateData = {
      title: template.title,
      templateType: template.templateType,
      themeConfig: template.themeConfig,
      layoutConfig: template.layoutConfig
    };
    
    template.encryptedData = await encryptionService.encrypt(templateData, key);
    template.checksum = await encryptionService.generateChecksum(templateData);
    
    // 保存到数据库
    await dbAdapter.executeTransaction('templates', 'readwrite', async (transaction: IDBTransaction) => {
      const store = transaction.objectStore('templates');
      store.add(template);
    });
    
    return template;
  }
  
  // 更新模板
  async updateTemplate(templateId: string, dto: TemplateUpdateDTO): Promise<Template> {
    const dbAdapter = (this as any).dbAdapter;
    const template = await this.readTemplate(templateId);
    if (!template) {
      throw new Error('模板未找到');
    }
    
    // 更新字段
    const now = new Date().toISOString();
    const updatedTemplate: Template = {
      ...template,
      title: dto.title || template.title,
      templateType: dto.templateType || template.templateType,
      themeConfig: { ...template.themeConfig, ...dto.themeConfig },
      layoutConfig: { ...template.layoutConfig, ...dto.layoutConfig },
      lastModified: now
    };
    
    // 加密数据
    const keyManager = (this as any).keyManager;
    const encryptionService = (this as any).encryptionService;
    const key = keyManager.getKey();
    if (!key) {
      throw new Error('没有可用的加密密钥');
    }
    
    const templateData = {
      title: updatedTemplate.title,
      templateType: updatedTemplate.templateType,
      themeConfig: updatedTemplate.themeConfig,
      layoutConfig: updatedTemplate.layoutConfig
    };
    
    updatedTemplate.encryptedData = await encryptionService.encrypt(templateData, key);
    updatedTemplate.checksum = await encryptionService.generateChecksum(templateData);
    
    // 保存到数据库
    await dbAdapter.executeTransaction('templates', 'readwrite', async (transaction: IDBTransaction) => {
      const store = transaction.objectStore('templates');
      store.put(updatedTemplate);
    });
    
    return updatedTemplate;
  }
  
  // 复制模板
  async copyTemplate(templateId: string, newTitle: string): Promise<Template> {
    const dbAdapter = (this as any).dbAdapter;
    const template = await this.readTemplate(templateId);
    if (!template) {
      throw new Error('模板未找到');
    }
    
    const now = new Date().toISOString();
    const id = Date.now().toString();
    
    // 创建副本
    const copiedTemplate: Template = {
      ...template,
      id,
      title: newTitle,
      createdAt: now,
      lastModified: now,
      isDefault: false,
      usageCount: 0
    };
    
    // 保存到数据库
    await dbAdapter.executeTransaction('templates', 'readwrite', async (transaction: IDBTransaction) => {
      const store = transaction.objectStore('templates');
      store.add(copiedTemplate);
    });
    
    return copiedTemplate;
  }
  
  // 列出模板
  async listTemplates(options: QueryOptions): Promise<WorkListResult> {
    const dbAdapter = (this as any).dbAdapter;
    return await dbAdapter.executeTransaction('templates', 'readonly', async (transaction: IDBTransaction) => {
      const store = transaction.objectStore('templates');
      const templates: Template[] = [];
      
      const cursor = store.openCursor();
      
      await new Promise<void>((resolve) => {
        cursor.onsuccess = (event: Event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            templates.push(cursor.value as Template);
            cursor.continue();
          } else {
            resolve();
          }
        };
        
        cursor.onerror = () => {
          resolve();
        };
      });
      
      // 排序
      if (options.sortBy) {
        templates.sort((a, b) => {
          switch (options.sortBy) {
            case 'title':
              return a.title.localeCompare(b.title) * (options.sortOrder === 'desc' ? -1 : 1);
            case 'lastModified':
              return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
            case 'createdAt':
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            default:
              return 0;
          }
        });
      }
      
      // 分页
      const page = options.page || 1;
      const pageSize = options.pageSize || 20;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const paginatedTemplates = templates.slice(start, end);
      
      return {
        works: paginatedTemplates,
        total: templates.length,
        page,
        pageSize
      };
    });
  }
  
  // 增加使用次数
  async incrementUsage(templateId: string): Promise<void> {
    const dbAdapter = (this as any).dbAdapter;
    const template = await this.readTemplate(templateId);
    if (!template) {
      throw new Error('模板未找到');
    }
    
    const updatedTemplate: Template = {
      ...template,
      usageCount: template.usageCount + 1,
      lastModified: new Date().toISOString()
    };
    
    await dbAdapter.executeTransaction('templates', 'readwrite', async (transaction: IDBTransaction) => {
      const store = transaction.objectStore('templates');
      store.put(updatedTemplate);
    });
  }
  
  // 读取模板
  private async readTemplate(templateId: string): Promise<Template | null> {
    const dbAdapter = (this as any).dbAdapter;
    return await dbAdapter.executeTransaction('templates', 'readonly', async (transaction: IDBTransaction) => {
      const store = transaction.objectStore('templates');
      const request = store.get(templateId);
      
      return new Promise((resolve) => {
        request.onsuccess = () => {
          const template = request.result;
          resolve(template || null);
        };
        request.onerror = () => {
          resolve(null);
        };
      });
    });
  }
}
