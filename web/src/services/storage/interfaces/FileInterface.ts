export interface FileInterface {
  // 初始化存储服务
  initialize(): Promise<void>;
  
  // 关闭存储服务
  close(): Promise<void>;
  
  // 检查存储服务是否初始化
  isInitialized(): boolean;
  
  // 获取存储使用情况
  getStorageUsage(): Promise<{
    used: number;
    total: number;
    percentage: number;
  }>;
}
