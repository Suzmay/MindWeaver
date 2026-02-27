import { HistoryVersion, HistoryVersionCreateDTO, HistoryVersionListResult } from '../../../models/HistoryVersion';
import { HistoryRepository } from '../interfaces/HistoryRepository';
import { IndexedDBAdapter } from './IndexedDBAdapter';
import { WorkStore } from './WorkStore';
import { EventEmitter } from '../interfaces/EventEmitter';

export class HistoryStore implements HistoryRepository {
  private dbAdapter: IndexedDBAdapter;
  private eventEmitter: EventEmitter;
  
  constructor(dbAdapter: IndexedDBAdapter, eventEmitter: EventEmitter) {
    this.dbAdapter = dbAdapter;
    this.eventEmitter = eventEmitter;
  }

  // 创建版本
  async createVersion(dto: HistoryVersionCreateDTO): Promise<HistoryVersion> {
    const now = new Date().toISOString();
    const id = Date.now().toString();
    
    // 获取当前版本号
    let versionNumber = 1;
    const versionsResult = await this.getVersions(dto.workId, 1, 100);
    if (versionsResult.versions.length > 0) {
      const maxVersion = Math.max(...versionsResult.versions.map((v: HistoryVersion) => v.versionNumber));
      versionNumber = maxVersion + 1;
    }
    
    // 准备版本数据
    const version: HistoryVersion = {
      id,
      workId: dto.workId,
      versionNumber,
      snapshotData: dto.snapshotData,
      diffData: dto.diffData,
      createdAt: now,
      operationType: dto.operationType,
      description: dto.description
    };
    
    // 保存到数据库
    await this.dbAdapter.executeTransaction('historyVersions', 'readwrite', async (transaction) => {
      const store = transaction.objectStore('historyVersions');
      store.add(version);
    });
    
    return version;
  }
  
  // 获取版本列表
  async getVersions(workId: string, page: number = 1, pageSize: number = 20): Promise<HistoryVersionListResult> {
    return await this.dbAdapter.executeTransaction('historyVersions', 'readonly', async (transaction) => {
      const store = transaction.objectStore('historyVersions');
      const index = store.index('workId_createdAt');
      const request = index.openCursor(IDBKeyRange.bound([workId], [workId, '']), 'prev');
      
      const versions: HistoryVersion[] = [];
      
      await new Promise<void>((resolve) => {
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            versions.push(cursor.value as HistoryVersion);
            cursor.continue();
          } else {
            resolve();
          }
        };
        
        request.onerror = () => {
          resolve();
        };
      });
      
      // 按版本号排序（如果需要）
      versions.sort((a, b) => b.versionNumber - a.versionNumber);
      
      // 分页
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const paginatedVersions = versions.slice(start, end);
      
      return {
        versions: paginatedVersions,
        total: versions.length,
        page,
        pageSize
      };
    });
  }
  
  // 获取最近版本
  async getLatestVersion(workId: string): Promise<HistoryVersion | null> {
    return await this.dbAdapter.executeTransaction('historyVersions', 'readonly', async (transaction) => {
      const store = transaction.objectStore('historyVersions');
      const index = store.index('workId');
      const request = index.openCursor(IDBKeyRange.only(workId), 'prev');
      
      return new Promise<HistoryVersion | null>((resolve) => {
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            resolve(cursor.value as HistoryVersion);
          } else {
            resolve(null);
          }
        };
        
        request.onerror = () => {
          resolve(null);
        };
      });
    });
  }
  
  // 恢复版本
  async restoreVersion(workId: string, versionId: string): Promise<boolean> {
    try {
      // 获取指定的历史版本
      const version = await this.getVersionById(versionId);
      if (!version || version.workId !== workId) {
        throw new Error('版本未找到或不属于指定作品');
      }

      // 获取当前作品
      const workStore = new WorkStore(this.dbAdapter, this.eventEmitter);
      const currentWork = await workStore.read(workId);
      if (!currentWork) {
        throw new Error('作品未找到');
      }

      // 使用历史版本的快照数据更新作品
      const updatedWork = {
        ...currentWork,
        encryptedData: version.snapshotData,
        lastModified: new Date().toISOString(),
        dataVersion: currentWork.dataVersion + 1
      };

      // 保存更新后的作品
      await this.dbAdapter.executeTransaction('works', 'readwrite', async (transaction) => {
        const store = transaction.objectStore('works');
        store.put(updatedWork);
      });

      // 创建新的版本记录，记录版本恢复操作
      const now = new Date().toISOString();
      const newVersionId = Date.now().toString();
      const versionsResult = await this.getVersions(workId, 1, 100);
      const versionNumber = versionsResult.versions.length > 0 ? Math.max(...versionsResult.versions.map((v: HistoryVersion) => v.versionNumber)) + 1 : 1;

      const newVersion = {
        id: newVersionId,
        workId,
        versionNumber,
        snapshotData: version.snapshotData,
        diffData: version.diffData,
        createdAt: now,
        operationType: 'restore',
        description: `Restored to version ${version.versionNumber}`
      };

      await this.dbAdapter.executeTransaction('historyVersions', 'readwrite', async (transaction) => {
        const store = transaction.objectStore('historyVersions');
        store.add(newVersion);
      });

      return true;
    } catch (error) {
      console.error('Error restoring version:', error);
      throw error;
    }
  }

  // 根据版本ID获取版本
  private async getVersionById(versionId: string): Promise<HistoryVersion | null> {
    return await this.dbAdapter.executeTransaction('historyVersions', 'readonly', async (transaction) => {
      const store = transaction.objectStore('historyVersions');
      const request = store.get(versionId);

      return new Promise<HistoryVersion | null>((resolve) => {
        request.onsuccess = () => {
          const version = request.result;
          resolve(version || null);
        };
        request.onerror = () => {
          resolve(null);
        };
      });
    });
  }
  
  // 清理旧版本
  async cleanupOldVersions(workId: string, keepCount: number): Promise<number> {
    const versionsResult = await this.getVersions(workId, 1, 1000);
    const versionsToDelete = versionsResult.versions.slice(keepCount);
    
    await this.dbAdapter.executeTransaction('historyVersions', 'readwrite', async (transaction) => {
      const store = transaction.objectStore('historyVersions');
      
      for (const version of versionsToDelete) {
        store.delete(version.id);
      }
    });
    
    return versionsToDelete.length;
  }
  
  // 删除版本
  async deleteVersion(versionId: string): Promise<boolean> {
    await this.dbAdapter.executeTransaction('historyVersions', 'readwrite', async (transaction) => {
      const store = transaction.objectStore('historyVersions');
      store.delete(versionId);
    });
    
    return true;
  }
  
  // 批量删除版本
  async deleteVersionsByWorkId(workId: string): Promise<number> {
    const versionsResult = await this.getVersions(workId, 1, 1000);
    const versionCount = versionsResult.versions.length;
    
    await this.dbAdapter.executeTransaction('historyVersions', 'readwrite', async (transaction) => {
      const store = transaction.objectStore('historyVersions');
      const index = store.index('workId');
      const request = index.openCursor(IDBKeyRange.only(workId));
      
      await new Promise<void>((resolve) => {
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            store.delete(cursor.primaryKey);
            cursor.continue();
          } else {
            resolve();
          }
        };
        
        request.onerror = () => {
          resolve();
        };
      });
    });
    
    return versionCount;
  }
}
