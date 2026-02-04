// Encryption Worker Service

interface EncryptionRequest {
  id: string;
  action: 'encrypt' | 'decrypt' | 'generateChecksum';
  data: any;
  key?: CryptoKey;
}

interface EncryptionResponse {
  id: string;
  result?: any;
  error?: string;
}

type WorkerCallback = (result: any, error: string | undefined) => void;

class EncryptionWorkerService {
  private static instance: EncryptionWorkerService;
  private worker: Worker | null = null;
  private callbacks: Map<string, WorkerCallback> = new Map();
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): EncryptionWorkerService {
    if (!EncryptionWorkerService.instance) {
      EncryptionWorkerService.instance = new EncryptionWorkerService();
    }
    return EncryptionWorkerService.instance;
  }

  // 初始化 Worker
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.initializeWorker();
    return this.initializationPromise;
  }

  private async initializeWorker(): Promise<void> {
    try {
      // 创建 Worker
      this.worker = new Worker(new URL('./encryption.worker.ts', import.meta.url));

      // 监听 Worker 消息
      this.worker.onmessage = (event: MessageEvent<EncryptionResponse>) => {
        const { id, result, error } = event.data;
        const callback = this.callbacks.get(id);
        if (callback) {
          callback(result, error);
          this.callbacks.delete(id);
        }
      };

      // 监听 Worker 错误
      this.worker.onerror = (_) => {
        // 静默处理错误
      };

      this.isInitialized = true;
    } catch (error) {
      throw error;
    } finally {
      this.initializationPromise = null;
    }
  }

  // 发送加密请求
  async encrypt(data: any, key: CryptoKey): Promise<string> {
    await this.initialize();
    return this.sendRequest('encrypt', data, key);
  }

  // 发送解密请求
  async decrypt(encryptedData: string, key: CryptoKey): Promise<any> {
    await this.initialize();
    return this.sendRequest('decrypt', encryptedData, key);
  }

  // 发送生成校验和请求
  async generateChecksum(data: any): Promise<string> {
    await this.initialize();
    return this.sendRequest('generateChecksum', data);
  }

  // 发送请求到 Worker
  private sendRequest(action: 'encrypt' | 'decrypt' | 'generateChecksum', data: any, key?: CryptoKey): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const id = this.generateId();

      const request: EncryptionRequest = {
        id,
        action,
        data,
        key
      };

      this.callbacks.set(id, (result, error) => {
        if (error) {
          reject(new Error(error));
        } else {
          resolve(result);
        }
      });

      try {
        this.worker.postMessage(request);
      } catch (error) {
        this.callbacks.delete(id);
        reject(error);
      }
    });
  }

  // 生成唯一 ID
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 终止 Worker
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isInitialized = false;
    this.callbacks.clear();
  }

  // 检查是否初始化
  isReady(): boolean {
    return this.isInitialized && this.worker !== null;
  }
}

export { EncryptionWorkerService };
