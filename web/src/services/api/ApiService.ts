// API服务层，处理与服务端的通信

// 素材类型定义
export interface Asset {
  id: string;
  name: string;
  type: string;
  tags: string[];
  fileName?: string;
  fileType?: string;
  fileKey?: string;
  thumbnail?: string;
  data?: any;
  createdAt?: string;
}

// API响应类型
export interface ApiResponse<T> {
  success: boolean;
  error?: string;
  data?: T;
  asset?: Asset;
  assets?: Asset[];
}

class ApiService {
  private baseUrl: string;

  constructor() {
    // 确定API基础URL
    const isProd = typeof window !== 'undefined' && window.location.hostname !== 'localhost';
    this.baseUrl = isProd 
      ? '' // 生产环境使用相对路径
      : 'http://localhost:8787'; // 开发环境使用本地Worker预览地址
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      if (!response.ok) {
        throw new Error('健康检查失败');
      }
      const data = await response.json();
      return data.status === 'ok';
    } catch (error) {
      console.error('健康检查失败:', error);
      return false;
    }
  }

  /**
   * 上传素材
   * @param file 素材文件
   * @param name 素材名称
   * @param type 素材类型
   * @param tags 素材标签
   * @param onProgress 进度回调
   */
  async uploadAsset(
    file: File,
    name: string,
    type: string,
    tags: string[]
  ): Promise<ApiResponse<Asset>> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name);
      formData.append('type', type);
      formData.append('tags', JSON.stringify(tags));

      const response = await fetch(`${this.baseUrl}/api/assets/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('上传失败');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('上传素材失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '上传失败'
      };
    }
  }

  /**
   * 获取素材列表
   */
  async getAssets(): Promise<ApiResponse<Asset[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/assets/list`);
      if (!response.ok) {
        throw new Error('获取素材列表失败');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('获取素材列表失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取素材列表失败'
      };
    }
  }

  /**
   * 删除素材
   * @param assetId 素材ID
   */
  async deleteAsset(assetId: string): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/assets/delete/${assetId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error('删除素材失败');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('删除素材失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除素材失败'
      };
    }
  }

  /**
   * 获取素材预览
   * @param assetId 素材ID
   */
  async getAssetPreview(assetId: string): Promise<Blob | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/assets/preview/${assetId}`);
      if (!response.ok) {
        throw new Error('获取预览失败');
      }
      const blob = await response.blob();
      return blob;
    } catch (error) {
      console.error('获取素材预览失败:', error);
      return null;
    }
  }

  /**
   * 检查API是否可用
   */
  async isApiAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`${this.baseUrl}/api/health`, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.log('API不可用，将使用本地存储:', error);
      return false;
    }
  }

  /**
   * 检查网络连接状态
   */
  isOnline(): boolean {
    return navigator.onLine;
  }
}

export const apiService = new ApiService();
