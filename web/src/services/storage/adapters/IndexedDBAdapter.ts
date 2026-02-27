import { FileInterface } from '../interfaces/FileInterface';
import { EventEmitter, EventType } from '../interfaces/EventEmitter';
import { KeyManager } from '../encryption/KeyManager';

export class IndexedDBAdapter implements FileInterface {
  private static instance: IndexedDBAdapter;
  private db: IDBDatabase | null = null;
  private initialized = false;
  private keyManager = KeyManager.getInstance();
  private eventEmitter: EventEmitter;
  private dbName = 'MindWeaverDB';
  private dbVersion = 2;
  
  private constructor(eventEmitter: EventEmitter) {
    this.eventEmitter = eventEmitter;
  }
  
  static getInstance(eventEmitter: EventEmitter): IndexedDBAdapter {
    if (!IndexedDBAdapter.instance) {
      IndexedDBAdapter.instance = new IndexedDBAdapter(eventEmitter);
    }
    return IndexedDBAdapter.instance;
  }
  
  // 初始化存储服务
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('IndexedDBAdapter.initialize: 已经初始化，跳过');
      return;
    }
    
    console.log('=== IndexedDBAdapter.initialize: 开始初始化 ===');
    try {
      console.log('1. 开始加载密钥');
      try {
        const key = await this.keyManager.loadKey();
        console.log('2. 密钥加载结果:', key ? '成功' : '失败');
        if (!key) {
          console.log('3. 开始生成新密钥');
          await this.keyManager.generateKey();
          console.log('4. 新密钥生成成功');
        }
      } catch (keyError) {
        console.error('密钥管理失败:', keyError);
        throw new Error(`密钥管理失败: ${(keyError as Error).message}`);
      }
      
      console.log('5. 开始打开数据库');
      try {
        this.db = await this.openDatabase();
        console.log('6. 数据库打开成功');
      } catch (dbError) {
        console.error('数据库打开失败:', dbError);
        throw new Error(`数据库打开失败: ${(dbError as Error).message}`);
      }
      
      console.log('7. 设置初始化状态为true');
      this.initialized = true;
      
      console.log('8. 发送初始化成功事件');
      this.eventEmitter.emit(EventType.INITIALIZED, {
        timestamp: new Date().toISOString()
      });
      
      console.log('=== IndexedDBAdapter.initialize: 初始化完成 ===');
    } catch (error) {
      console.error('=== IndexedDBAdapter.initialize: 初始化失败 ===:', error);
      console.error('错误堆栈:', (error as Error).stack);
      this.eventEmitter.emit(EventType.ERROR, {
        timestamp: new Date().toISOString(),
        error: error as Error
      });
      throw error;
    }
  }
  
  // 打开数据库
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      // 数据库升级或创建
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // 创建作品存储
        if (!db.objectStoreNames.contains('works')) {
          const workStore = db.createObjectStore('works', { keyPath: 'id' });
          workStore.createIndex('lastModified', 'lastModified', { unique: false });
          workStore.createIndex('createdAt', 'createdAt', { unique: false });
          workStore.createIndex('category', 'category', { unique: false });
          workStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
          workStore.createIndex('isDeleted', 'isDeleted', { unique: false });
          workStore.createIndex('starred', 'starred', { unique: false });
          workStore.createIndex('nodeCount', 'nodes', { unique: false });
          workStore.createIndex('category_starred', ['category', 'starred'], { unique: false });
          workStore.createIndex('workId', 'id', { unique: false });
        }
        
        // 创建模板存储
        if (!db.objectStoreNames.contains('templates')) {
          const templateStore = db.createObjectStore('templates', { keyPath: 'id' });
          templateStore.createIndex('templateType', 'templateType', { unique: false });
          templateStore.createIndex('isDefault', 'isDefault', { unique: false });
          templateStore.createIndex('usageCount', 'usageCount', { unique: false });
          templateStore.createIndex('lastModified', 'lastModified', { unique: false });
          templateStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
        
        // 创建历史版本存储
        if (!db.objectStoreNames.contains('historyVersions')) {
          const historyStore = db.createObjectStore('historyVersions', { keyPath: 'id' });
          historyStore.createIndex('workId', 'workId', { unique: false });
          historyStore.createIndex('versionNumber', 'versionNumber', { unique: false });
          historyStore.createIndex('createdAt', 'createdAt', { unique: false });
          historyStore.createIndex('workId_createdAt', ['workId', 'createdAt'], { unique: false });
        }
        
        // 创建元数据存储
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }

        // 创建分片存储
        if (!db.objectStoreNames.contains('shards')) {
          const shardStore = db.createObjectStore('shards', { keyPath: 'shardId' });
          shardStore.createIndex('workId', 'workId', { unique: false });
          shardStore.createIndex('levelRange', 'levelRange', { unique: false });
          shardStore.createIndex('lastModified', 'lastModified', { unique: false });
          shardStore.createIndex('workId_levelRange', ['workId', 'levelRange'], { unique: false });
        }
      };
      
      // 数据库打开成功
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        resolve(db);
      };
      
      // 数据库打开失败
      request.onerror = (_) => {
        reject(new Error('Failed to open IndexedDB database'));
      };
    });
  }
  
  // 关闭存储服务
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.initialized = false;
    console.log('IndexedDBAdapter closed');
  }
  
  // 检查存储服务是否初始化
  isInitialized(): boolean {
    return this.initialized;
  }
  
  // 获取存储使用情况
  async getStorageUsage(): Promise<{
    used: number;
    total: number;
    percentage: number;
  }> {
    if (!this.initialized || !this.db) {
      throw new Error('Storage not initialized');
    }
    
    try {
      // 估算使用情况
      let used = 0;
      
      // 遍历所有对象存储
      for (const storeName of this.db.objectStoreNames) {
        const transaction = this.db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.count();
        
        await new Promise<void>((resolve, reject) => {
          request.onsuccess = () => {
            used += request.result * 1024; // 估算每条记录 1KB
            resolve();
          };
          request.onerror = () => reject(new Error('Failed to count records'));
        });
      }
      
      // 假设总存储空间为 50MB
      const total = 50 * 1024 * 1024;
      const percentage = Math.min((used / total) * 100, 100);
      
      return {
        used,
        total,
        percentage
      };
    } catch (error) {
      console.error('Storage usage error:', error);
      throw error;
    }
  }
  
  // 获取数据库连接
  getDatabase(): IDBDatabase {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }
  
  // 执行事务
  async executeTransaction<T>(
    storeNames: string | string[],
    mode: 'readonly' | 'readwrite',
    callback: (transaction: IDBTransaction) => Promise<T>
  ): Promise<T> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction(storeNames, mode);
        
        // 执行回调
        callback(transaction)
          .then(result => {
            // 等待事务完成
            transaction.oncomplete = () => {
              resolve(result);
            };
            
            transaction.onerror = () => {
              reject(new Error('Transaction failed'));
            };
            
            transaction.onabort = () => {
              reject(new Error('Transaction aborted'));
            };
          })
          .catch(error => {
            transaction.abort();
            reject(error);
          });
      } catch (error) {
        reject(error);
      }
    });
  }
  
  // 重试机制
  async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.warn(`Operation failed, retrying ${i + 1}/${maxRetries}...`, error);
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
      }
    }
    
    throw lastError!;
  }
  
  // 删除数据库
  async deleteDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.dbName);
      
      request.onsuccess = () => {
        this.initialized = false;
        this.db = null;
        resolve();
      };
      
      request.onerror = () => {
        reject(new Error('Failed to delete IndexedDB database'));
      };
      
      request.onblocked = () => {
        reject(new Error('Database deletion blocked. Please close all other tabs or windows using this database.'));
      };
    });
  }
}
