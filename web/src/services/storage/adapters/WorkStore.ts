import { Work, WorkCreateDTO, WorkUpdateDTO, WorkListResult, QueryOptions } from '../../../models/Work';
import { WorkRepository } from '../interfaces/WorkRepository';
import { IndexedDBAdapter } from './IndexedDBAdapter';
import { EncryptionService } from '../encryption/EncryptionService';
import { KeyManager } from '../encryption/KeyManager';
import { EventEmitter } from '../interfaces/EventEmitter';
import { EventType } from '../interfaces/EventEmitter';

export class WorkStore implements WorkRepository {
  private dbAdapter: IndexedDBAdapter;
  private encryptionService = EncryptionService.getInstance();
  private keyManager = KeyManager.getInstance();
  private eventEmitter: EventEmitter;
  
  constructor(dbAdapter: IndexedDBAdapter, eventEmitter: EventEmitter) {
    this.dbAdapter = dbAdapter;
    this.eventEmitter = eventEmitter;
  }
  
  // 创建作品
  async create(dto: WorkCreateDTO): Promise<Work> {
    console.log('WorkStore.create: 开始创建作品', dto);
    const now = new Date().toISOString();
    const id = Date.now().toString();
    
    // 准备作品数据
    const work: Work = {
      id,
      title: dto.title,
      lastModified: now,
      createdAt: now,
      isDeleted: false,
      dataVersion: 1,
      checksum: '',
      encryptedData: '',
      category: dto.category || '个人',
      tags: dto.tags || [],
      nodes: dto.nodes || 0,
      starred: false
    };
    console.log('WorkStore.create: 准备作品数据', work);
    
    // 加密数据
    let key = this.keyManager.getKey();
    console.log('WorkStore.create: 检查加密密钥', key ? '已存在' : '不存在');
    if (!key) {
      // 如果没有密钥，自动生成一个
      console.log('WorkStore.create: 开始生成加密密钥');
      key = await this.keyManager.generateKey();
      console.log('WorkStore.create: 加密密钥生成成功');
    }
    
    const workData = {
      title: work.title,
      nodes: work.nodes,
      category: work.category,
      tags: work.tags
    };
    console.log('WorkStore.create: 准备加密数据', workData);
    
    try {
      console.log('WorkStore.create: 开始加密数据');
      work.encryptedData = await this.encryptionService.encrypt(workData, key);
      console.log('WorkStore.create: 数据加密成功');
      
      console.log('WorkStore.create: 开始生成校验和');
      work.checksum = await this.encryptionService.generateChecksum(workData);
      console.log('WorkStore.create: 校验和生成成功');
    } catch (error) {
      console.warn('WorkStore.create: 加密过程失败，使用备选方案', error);
      // 加密失败时，使用空字符串作为备选方案
      work.encryptedData = '';
      work.checksum = '';
    }
    
    try {
      // 保存到数据库
      console.log('WorkStore.create: 开始保存到数据库');
      await this.dbAdapter.executeTransaction('works', 'readwrite', async (transaction) => {
        const store = transaction.objectStore('works');
        console.log('WorkStore.create: 执行数据库添加操作');
        store.add(work);
        console.log('WorkStore.create: 数据库添加操作完成');
      });
      
      console.log('WorkStore.create: 作品创建完成', work);
      return work;
    } catch (error) {
      console.error('WorkStore.create: 数据库保存失败', error);
      throw error;
    }
  }
  
  // 读取作品
  async read(workId: string): Promise<Work | null> {
    return await this.dbAdapter.executeTransaction('works', 'readonly', async (transaction) => {
      const store = transaction.objectStore('works');
      const request = store.get(workId);
      
      return new Promise((resolve) => {
        request.onsuccess = () => {
          const work = request.result;
          resolve(work || null);
        };
        request.onerror = () => {
          resolve(null);
        };
      });
    });
  }
  
  // 更新作品
  async update(workId: string, dto: WorkUpdateDTO): Promise<Work> {
    const work = await this.read(workId);
    if (!work) {
      throw new Error('Work not found');
    }
    
    // 更新字段
    const now = new Date().toISOString();
    const updatedWork: Work = {
      ...work,
      title: dto.title || work.title,
      category: dto.category !== undefined ? dto.category : work.category,
      tags: dto.tags !== undefined ? dto.tags : work.tags,
      starred: dto.starred !== undefined ? dto.starred : work.starred,
      lastModified: now
    };
    
    // 如果更新了加密数据
    if (dto.encryptedData) {
      updatedWork.encryptedData = dto.encryptedData;
      updatedWork.dataVersion += 1;
      
      // 验证数据完整性
      const key = this.keyManager.getKey();
      if (key) {
        try {
          const decryptedData = await this.encryptionService.decrypt(dto.encryptedData, key);
          updatedWork.checksum = await this.encryptionService.generateChecksum(decryptedData);
        } catch (error) {
          console.error('Data decryption error:', error);
        }
      }
    }
    
    // 保存到数据库
    await this.dbAdapter.executeTransaction('works', 'readwrite', async (transaction) => {
      const store = transaction.objectStore('works');
      store.put(updatedWork);
    });
    
    return updatedWork;
  }
  
  // 删除作品（软删除）
  async delete(workId: string, hardDelete: boolean = false): Promise<boolean> {
    if (hardDelete) {
      // 硬删除
      await this.dbAdapter.executeTransaction('works', 'readwrite', async (transaction) => {
        const store = transaction.objectStore('works');
        store.delete(workId);
      });
    } else {
      // 软删除
      const work = await this.read(workId);
      if (!work) {
        return false;
      }
      
      const updatedWork: Work = {
        ...work,
        isDeleted: true,
        inTrashSince: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };
      
      await this.dbAdapter.executeTransaction('works', 'readwrite', async (transaction) => {
        const store = transaction.objectStore('works');
        store.put(updatedWork);
      });
    }
    
    return true;
  }
  
  // 恢复作品（从废纸篓）
  async restore(workId: string): Promise<Work> {
    const work = await this.read(workId);
    if (!work) {
      throw new Error('Work not found');
    }
    
    const updatedWork: Work = {
      ...work,
      isDeleted: false,
      inTrashSince: undefined,
      lastModified: new Date().toISOString()
    };
    
    await this.dbAdapter.executeTransaction('works', 'readwrite', async (transaction) => {
      const store = transaction.objectStore('works');
      store.put(updatedWork);
    });
    
    return updatedWork;
  }
  
  // 列出作品
  async list(options: QueryOptions): Promise<WorkListResult> {
    // 先获取所有作品
    const works = await this.dbAdapter.executeTransaction('works', 'readonly', async (transaction) => {
      const store = transaction.objectStore('works');
      const collectedWorks: Work[] = [];
      
      // 创建默认游标，获取所有作品
      const cursor = store.openCursor();
      
      await new Promise<void>((resolve) => {
        cursor.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            collectedWorks.push(cursor.value as Work);
            cursor.continue();
          } else {
            resolve();
          }
        };
        
        cursor.onerror = () => {
          resolve();
        };
      });
      
      return collectedWorks;
    });
    
    // 应用过滤
    const filteredWorks = works.filter(work => {
      // 已删除过滤
      if (options.deletedOnly !== undefined && work.isDeleted !== options.deletedOnly) {
        return false;
      }
      
      // 收藏过滤
      if (options.starredOnly && !work.starred) {
        return false;
      }
      
      // 搜索过滤
      if (options.searchText) {
        const searchLower = options.searchText.toLowerCase();
        if (!work.title.toLowerCase().includes(searchLower) && 
            !work.tags?.some(tag => tag.toLowerCase().includes(searchLower)) &&
            !work.category?.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      
      // 分类过滤
      if (options.category && work.category !== options.category) {
        return false;
      }
      
      // 标签过滤
      if (options.tags && options.tags.length > 0) {
        const hasMatchingTag = work.tags?.some(tag => options.tags!.includes(tag));
        if (!hasMatchingTag) {
          return false;
        }
      }
      
      return true;
    });
    
    // 排序
    let sortedWorks = [...filteredWorks];
    if (options.sortBy) {
      sortedWorks.sort((a, b) => {
        switch (options.sortBy) {
          case 'title':
            return a.title.localeCompare(b.title) * (options.sortOrder === 'desc' ? -1 : 1);
          case 'category':
            return (a.category || '').localeCompare(b.category || '') * (options.sortOrder === 'desc' ? -1 : 1);
          case 'lastModified':
            return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
          case 'createdAt':
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case 'nodeCount':
            return (b.nodes || 0) - (a.nodes || 0);
          default:
            return 0;
        }
      });
    } else {
      // 默认按最后修改时间排序
      sortedWorks.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
    }
    
    // 分页
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedWorks = sortedWorks.slice(start, end);
    
    // 数据完整性验证（在事务外进行）
    for (const work of paginatedWorks) {
      if (work.checksum) {
        try {
          const key = this.keyManager.getKey();
          if (key) {
            const decryptedData = await this.encryptionService.decrypt(work.encryptedData, key);
            const currentChecksum = await this.encryptionService.generateChecksum(decryptedData);
            if (work.checksum !== currentChecksum) {
              console.warn(`Data integrity check failed for work ${work.id}`);
              // 触发数据损坏事件
              this.eventEmitter.emit(EventType.DATA_CORRUPTED, {
                workId: work.id,
                data: {
                  expectedChecksum: work.checksum,
                  actualChecksum: currentChecksum
                }
              });
            }
          }
        } catch (error) {
          console.warn(`Data integrity check error for work ${work.id}:`, error);
          // 触发数据损坏事件
          this.eventEmitter.emit(EventType.DATA_CORRUPTED, {
            workId: work.id,
            error: error as Error
          });
        }
      }
    }
    
    return {
      works: paginatedWorks,
      total: sortedWorks.length,
      page,
      pageSize
    };
  }
  
  // 批量创建
  async batchCreate(dtos: WorkCreateDTO[]): Promise<Work[]> {
    const works: Work[] = [];
    
    for (const dto of dtos) {
      const work = await this.create(dto);
      works.push(work);
    }
    
    return works;
  }
  
  // 批量更新
  async batchUpdate(workIds: string[], dto: WorkUpdateDTO): Promise<{
    success: Work[];
    failed: { workId: string; error: string }[];
  }> {
    const success: Work[] = [];
    const failed: { workId: string; error: string }[] = [];
    
    for (const workId of workIds) {
      try {
        const work = await this.update(workId, dto);
        success.push(work);
      } catch (error) {
        failed.push({ workId, error: (error as Error).message });
      }
    }
    
    return { success, failed };
  }
  
  // 批量删除
  async batchDelete(workIds: string[], hardDelete: boolean = false): Promise<{
    success: string[];
    failed: { workId: string; error: string }[];
  }> {
    const success: string[] = [];
    const failed: { workId: string; error: string }[] = [];
    
    for (const workId of workIds) {
      try {
        const result = await this.delete(workId, hardDelete);
        if (result) {
          success.push(workId);
        } else {
          failed.push({ workId, error: 'Delete failed' });
        }
      } catch (error) {
        failed.push({ workId, error: (error as Error).message });
      }
    }
    
    return { success, failed };
  }
  
  // 导出作品
  async export(workId: string, format: 'mm' | 'xmind' | 'json'): Promise<Blob> {
    const work = await this.read(workId);
    if (!work) {
      throw new Error('Work not found');
    }
    
    // 解密数据
    const key = this.keyManager.getKey();
    if (!key) {
      throw new Error('No encryption key available');
    }
    
    const workData = await this.encryptionService.decrypt(work.encryptedData, key);
    
    // 根据格式生成导出内容
    let content: string;
    let mimeType: string;
    
    switch (format) {
      case 'json':
        content = JSON.stringify(workData, null, 2);
        mimeType = 'application/json';
        break;
      case 'mm':
      case 'xmind':
        // 简化的导出格式
        content = JSON.stringify({
          format,
          title: work.title,
          data: workData
        }, null, 2);
        mimeType = 'application/json';
        break;
      default:
        throw new Error('Unsupported export format');
    }
    
    return new Blob([content], { type: mimeType });
  }
  
  // 导入作品
  async import(file: Blob, format: 'mm' | 'xmind' | 'json'): Promise<Work> {
    const content = await file.text();
    const data = JSON.parse(content);
    
    // 提取作品数据
    let workData;
    switch (format) {
      case 'json':
        workData = data;
        break;
      case 'mm':
      case 'xmind':
        workData = data.data || data;
        break;
      default:
        throw new Error('Unsupported import format');
    }
    
    // 创建作品
    const dto: WorkCreateDTO = {
      title: workData.title || '导入的思维导图',
      category: workData.category || '个人',
      tags: workData.tags || [],
      nodes: workData.nodes || 0
    };
    
    return await this.create(dto);
  }
}
