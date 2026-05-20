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
  
  // 读取模板（覆盖父类方法，从 templates store 读取）
  async read(templateId: string): Promise<Template | null> {
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
        console.error('获取默认模板错误:', error);
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
    
    // 检查模板名称是否重复，如果重复则自动添加后缀
    const existingTemplates = await dbAdapter.executeTransaction('templates', 'readonly', async (transaction: IDBTransaction) => {
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
      
      return templates;
    });
    
    // 检查是否存在同名模板
    let templateTitle = dto.title;
    const existingTemplate = existingTemplates.find((t: Template) => t.title === templateTitle && !t.isDeleted);
    
    // 如果存在同名模板，自动添加后缀
    if (existingTemplate) {
      // 提取基础名称（去掉已有的数字后缀）
      const baseName = templateTitle.replace(/\(\d+\)$/, '').trim();
      
      // 找到所有以基础名称开头的模板
      const similarTemplates = existingTemplates.filter((t: Template) => 
        t.title.startsWith(baseName) && 
        !t.isDeleted && 
        (t.title === baseName || t.title.match(new RegExp(`^${baseName}\(\d+\)$`))) 
      );
      
      // 找到最大的数字后缀
      let maxNumber = 0;
      for (const t of similarTemplates) {
        const match = t.title.match(new RegExp(`^${baseName}\((\d+)\)$`));
        if (match && match[1]) {
          const number = parseInt(match[1], 10);
          if (number > maxNumber) {
            maxNumber = number;
          }
        }
      }
      
      // 生成新的模板名称
      templateTitle = `${baseName}(${maxNumber + 1})`;
    }
    
    // 准备模板数据
    const template: Template = {
      id,
      title: templateTitle,
      description: dto.description,
      lastModified: now,
      createdAt: now,
      isDeleted: false,
      dataVersion: 1,
      checksum: '',
      encryptedData: '',
      tags: dto.tags || [],
      nodes: dto.nodesData?.length || 0,
      starred: false,
      templateType: dto.templateType,
      isDefault: dto.isDefault || false,
      themeConfig: dto.themeConfig,
      layoutConfig: dto.layoutConfig,
      usageCount: 0,
      uploader: dto.uploader || '官方',
      nodesData: dto.nodesData
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
      layoutConfig: template.layoutConfig,
      nodesData: template.nodesData
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
      description: dto.description !== undefined ? dto.description : template.description,
      templateType: dto.templateType || template.templateType,
      themeConfig: { ...template.themeConfig, ...dto.themeConfig },
      layoutConfig: { ...template.layoutConfig, ...dto.layoutConfig },
      tags: dto.tags !== undefined ? dto.tags : template.tags,
      nodesData: dto.nodesData !== undefined ? dto.nodesData : template.nodesData,
      nodes: dto.nodesData !== undefined ? dto.nodesData.length : template.nodes,
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
      layoutConfig: updatedTemplate.layoutConfig,
      nodesData: updatedTemplate.nodesData
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
      let sortedTemplates = [...templates];
      if (options.sortBy) {
        sortedTemplates.sort((a, b) => {
          // 默认标签的模板优先排序
          if (a.isDefault !== b.isDefault) {
            return a.isDefault ? -1 : 1;
          }
          
          switch (options.sortBy) {
            case 'title':
              return a.title.localeCompare(b.title) * (options.sortOrder === 'desc' ? -1 : 1);
            case 'lastModified':
              return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
            case 'createdAt':
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            case 'usageCount':
              return (b.usageCount || 0) - (a.usageCount || 0);
            default:
              return 0;
          }
        });
      } else {
        // 默认排序：默认标签模板优先，然后按最后修改时间
        sortedTemplates.sort((a, b) => {
          // 默认标签的模板优先
          if (a.isDefault !== b.isDefault) {
            return a.isDefault ? -1 : 1;
          }
          return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
        });
      }
      
      // 分页
      const page = options.page || 1;
      const pageSize = options.pageSize || 20;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const paginatedTemplates = sortedTemplates.slice(start, end);
      
      return {
        works: paginatedTemplates,
        total: sortedTemplates.length,
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
  
  // 删除模板
  async deleteTemplate(templateId: string): Promise<void> {
    const dbAdapter = (this as any).dbAdapter;
    const template = await this.readTemplate(templateId);
    if (!template) {
      throw new Error('模板未找到');
    }
    
    await dbAdapter.executeTransaction('templates', 'readwrite', async (transaction: IDBTransaction) => {
      const store = transaction.objectStore('templates');
      store.delete(templateId);
    });
  }
  
  // 导出模板
  async export(templateId: string): Promise<Blob> {
    const template = await this.readTemplate(templateId);
    if (!template) {
      throw new Error('模板未找到');
    }
    
    const keyManager = (this as any).keyManager;
    const encryptionService = (this as any).encryptionService;
    const key = keyManager.getKey();
    
    let templateData;
    if (key && template.encryptedData) {
      templateData = await encryptionService.decrypt(template.encryptedData, key);
    } else {
      templateData = {
        title: template.title,
        templateType: template.templateType,
        themeConfig: template.themeConfig,
        layoutConfig: template.layoutConfig,
        nodesData: template.nodesData
      };
    }
    
    const exportData = {
      version: '1.0',
      title: template.title,
      description: template.description,
      templateType: template.templateType,
      isDefault: template.isDefault,
      themeConfig: template.themeConfig,
      layoutConfig: template.layoutConfig,
      tags: template.tags,
      nodesData: templateData.nodesData || template.nodesData,
      exportedAt: new Date().toISOString()
    };
    
    const content = JSON.stringify(exportData, null, 2);
    return new Blob([content], { type: 'application/json' });
  }
  
  // 导入模板
  async import(file: Blob): Promise<Template> {
    const content = await file.text();
    const data = JSON.parse(content);
    
    const keyManager = (this as any).keyManager;
    const encryptionService = (this as any).encryptionService;
    const key = keyManager.getKey();
    if (!key) {
      throw new Error('没有可用的加密密钥');
    }
    
    const templateData = {
      title: data.title || '导入的模板',
      templateType: data.templateType || 'personal',
      themeConfig: data.themeConfig || {
        primaryColor: '#3b82f6',
        secondaryColor: '#10b981',
        backgroundColor: '#ffffff',
        nodeShape: 'rounded',
        edgeStyle: 'curved',
        fontFamily: 'sans-serif',
        animationEnabled: true
      },
      layoutConfig: data.layoutConfig || {
        layoutType: 'mindmap',
        direction: 'horizontal',
        levelSpacing: 80,
        nodeSpacing: 40
      },
      nodesData: data.nodesData || []
    };
    
    const encryptedData = await encryptionService.encrypt(templateData, key);
    const checksum = await encryptionService.generateChecksum(templateData);
    
    const dbAdapter = (this as any).dbAdapter;
    const existingTemplates = await dbAdapter.executeTransaction('templates', 'readonly', async (transaction: IDBTransaction) => {
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
      
      return templates;
    });
    
    let templateTitle = templateData.title;
    const existingTemplate = existingTemplates.find((t: Template) => t.title === templateTitle && !t.isDeleted);
    
    if (existingTemplate) {
      const baseName = templateTitle.replace(/\(\d+\)$/, '').trim();
      const similarTemplates = existingTemplates.filter((t: Template) => 
        t.title.startsWith(baseName) && 
        !t.isDeleted && 
        (t.title === baseName || t.title.match(new RegExp(`^${baseName}\(\d+\)$`))) 
      );
      
      let maxNumber = 0;
      for (const t of similarTemplates) {
        const match = t.title.match(new RegExp(`^${baseName}\((\d+)\)$`));
        if (match && match[1]) {
          const number = parseInt(match[1], 10);
          if (number > maxNumber) {
            maxNumber = number;
          }
        }
      }
      
      templateTitle = `${baseName}(${maxNumber + 1})`;
    }
    
    const now = new Date().toISOString();
    const id = Date.now().toString();
    
    const template: Template = {
      id,
      title: templateTitle,
      description: data.description,
      lastModified: now,
      createdAt: now,
      isDeleted: false,
      dataVersion: 1,
      checksum,
      encryptedData,
      tags: data.tags || [],
      nodes: (data.nodesData || []).length,
      starred: false,
      templateType: templateData.templateType,
      isDefault: false,
      themeConfig: templateData.themeConfig,
      layoutConfig: templateData.layoutConfig,
      usageCount: 0,
      uploader: data.uploader || '导入',
      nodesData: templateData.nodesData
    };
    
    await dbAdapter.executeTransaction('templates', 'readwrite', async (transaction: IDBTransaction) => {
      const store = transaction.objectStore('templates');
      store.add(template);
    });
    
    return template;
  }
}
