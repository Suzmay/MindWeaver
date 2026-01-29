import { IndexedDBAdapter } from './IndexedDBAdapter';
import { WorkShard } from '../utils/ShardManager';
import { EncryptionService } from '../encryption/EncryptionService';
import { KeyManager } from '../encryption/KeyManager';
import { EventEmitter } from '../interfaces/EventEmitter';
import { EventType } from '../interfaces/EventEmitter';

export class ShardStore {
  private dbAdapter: IndexedDBAdapter;
  private encryptionService = EncryptionService.getInstance();
  private keyManager = KeyManager.getInstance();
  private eventEmitter: EventEmitter;

  constructor(dbAdapter: IndexedDBAdapter, eventEmitter: EventEmitter) {
    this.dbAdapter = dbAdapter;
    this.eventEmitter = eventEmitter;
  }

  // 保存分片
  async saveShard(shard: WorkShard): Promise<void> {
    // 加密分片数据
    const key = this.keyManager.getKey();
    if (!key) {
      throw new Error('No encryption key available');
    }

    const encryptedShard = {
      ...shard,
      data: await this.encryptionService.encrypt(shard.data, key),
      checksum: await this.encryptionService.generateChecksum(shard.data)
    };

    await this.dbAdapter.executeTransaction('shards', 'readwrite', async (transaction) => {
      const store = transaction.objectStore('shards');
      store.put(encryptedShard);
    });
  }

  // 批量保存分片
  async saveShards(shards: WorkShard[]): Promise<void> {
    await this.dbAdapter.executeTransaction('shards', 'readwrite', async (transaction) => {
      const store = transaction.objectStore('shards');
      const key = this.keyManager.getKey();

      for (const shard of shards) {
        // 加密分片数据
        let encryptedData = shard.data;
        let checksum = shard.checksum;

        if (key) {
          encryptedData = await this.encryptionService.encrypt(shard.data, key);
          checksum = await this.encryptionService.generateChecksum(shard.data);
        }

        const encryptedShard = {
          ...shard,
          data: encryptedData,
          checksum
        };

        store.put(encryptedShard);
      }
    });
  }

  // 获取分片
  async getShard(shardId: string): Promise<WorkShard | null> {
    return await this.dbAdapter.executeTransaction('shards', 'readonly', async (transaction) => {
      const store = transaction.objectStore('shards');
      const request = store.get(shardId);

      return new Promise<WorkShard | null>((resolve) => {
        request.onsuccess = async () => {
          const shard = request.result;
          if (!shard) {
            resolve(null);
            return;
          }

          // 解密分片数据
          const key = this.keyManager.getKey();
          if (key) {
            try {
              shard.data = await this.encryptionService.decrypt(shard.data, key);
              // 验证数据完整性
              if (shard.checksum) {
                const currentChecksum = await this.encryptionService.generateChecksum(shard.data);
                if (shard.checksum !== currentChecksum) {
                  console.warn(`Data integrity check failed for shard ${shard.shardId}`);
                  // 触发数据损坏事件
                  this.eventEmitter.emit(EventType.DATA_CORRUPTED, {
                    data: {
                      shardId: shard.shardId,
                      expectedChecksum: shard.checksum,
                      actualChecksum: currentChecksum
                    }
                  });
                  resolve(null);
                  return;
                }
              }
            } catch (error) {
              console.error('Error decrypting shard:', error);
              // 触发数据损坏事件
              this.eventEmitter.emit(EventType.DATA_CORRUPTED, {
                data: {
                  shardId: shard.shardId
                },
                error: error as Error
              });
              resolve(null);
              return;
            }
          }

          resolve(shard);
        };

        request.onerror = () => {
          resolve(null);
        };
      });
    });
  }

  // 获取作品的所有分片
  async getShardsByWorkId(workId: string): Promise<WorkShard[]> {
    return await this.dbAdapter.executeTransaction('shards', 'readonly', async (transaction) => {
      const store = transaction.objectStore('shards');
      const index = store.index('workId');
      const request = index.openCursor(IDBKeyRange.only(workId));

      const shards: WorkShard[] = [];
      const key = this.keyManager.getKey();

      await new Promise<void>((resolve) => {
        request.onsuccess = async (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            let shard = cursor.value as WorkShard;

            // 解密分片数据
            if (key) {
              try {
                shard.data = await this.encryptionService.decrypt(shard.data, key);
                // 验证数据完整性
                if (shard.checksum) {
                  const currentChecksum = await this.encryptionService.generateChecksum(shard.data);
                  if (shard.checksum !== currentChecksum) {
                    // 触发数据损坏事件
                    this.eventEmitter.emit(EventType.DATA_CORRUPTED, {
                      data: {
                        shardId: shard.shardId,
                        expectedChecksum: shard.checksum,
                        actualChecksum: currentChecksum
                      }
                    });
                    // 跳过损坏的分片
                  } else {
                    shards.push(shard);
                  }
                } else {
                  shards.push(shard);
                }
              } catch (error) {
                // 触发数据损坏事件
                this.eventEmitter.emit(EventType.DATA_CORRUPTED, {
                  data: {
                    shardId: shard.shardId
                  },
                  error: error as Error
                });
                // 跳过损坏的分片
              }
            } else {
              shards.push(shard);
            }

            cursor.continue();
          } else {
            resolve();
          }
        };

        request.onerror = () => {
          resolve();
        };
      });

      return shards;
    });
  }

  // 删除分片
  async deleteShard(shardId: string): Promise<boolean> {
    try {
      await this.dbAdapter.executeTransaction('shards', 'readwrite', async (transaction) => {
        const store = transaction.objectStore('shards');
        store.delete(shardId);
      });
      return true;
    } catch (error) {
      console.error('Error deleting shard:', error);
      return false;
    }
  }

  // 删除作品的所有分片
  async deleteShardsByWorkId(workId: string): Promise<number> {
    const shards = await this.getShardsByWorkId(workId);
    const shardCount = shards.length;

    await this.dbAdapter.executeTransaction('shards', 'readwrite', async (transaction) => {
      const store = transaction.objectStore('shards');
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

    return shardCount;
  }

  // 更新分片
  async updateShard(shardId: string, updates: Partial<WorkShard>): Promise<WorkShard | null> {
    const existingShard = await this.getShard(shardId);
    if (!existingShard) {
      return null;
    }

    const updatedShard = {
      ...existingShard,
      ...updates,
      lastModified: new Date().toISOString()
    };

    // 重新计算校验和
    if (updates.data) {
      const key = this.keyManager.getKey();
      if (key) {
        updatedShard.checksum = await this.encryptionService.generateChecksum(updates.data);
      }
    }

    await this.saveShard(updatedShard);
    return updatedShard;
  }

  // 获取分片数量
  async getShardCount(workId: string): Promise<number> {
    return await this.dbAdapter.executeTransaction('shards', 'readonly', async (transaction) => {
      const store = transaction.objectStore('shards');
      const index = store.index('workId');
      const request = index.count(IDBKeyRange.only(workId));

      return new Promise<number>((resolve) => {
        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          resolve(0);
        };
      });
    });
  }

  // 清理过期分片
  async cleanupOldShards(workId: string, keepCount: number): Promise<number> {
    const shards = await this.getShardsByWorkId(workId);
    
    // 按修改时间排序
    shards.sort((a, b) => {
      return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
    });

    // 保留最新的分片
    const shardsToDelete = shards.slice(keepCount);
    const deleteCount = shardsToDelete.length;

    for (const shard of shardsToDelete) {
      await this.deleteShard(shard.shardId);
    }

    return deleteCount;
  }
}
