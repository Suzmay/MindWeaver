import { Work, WorkCreateDTO, WorkUpdateDTO } from '../../models/Work';
import { StorageService } from './StorageService';

/**
 * 兼容层，用于支持现有代码的平滑迁移
 * 提供从内存存储到新存储系统的转换方法
 */
export class CompatibilityLayer {
  private static instance: CompatibilityLayer;
  private storageService: StorageService;

  private constructor() {
    this.storageService = StorageService.getInstance();
  }

  static getInstance(): CompatibilityLayer {
    if (!CompatibilityLayer.instance) {
      CompatibilityLayer.instance = new CompatibilityLayer();
    }
    return CompatibilityLayer.instance;
  }

  /**
   * 从内存创建作品
   * 接收原有 Work 对象，自动补充新字段并存储
   * @param memoryWork 内存中的 Work 对象
   * @returns 存储后的 Work 对象
   */
  async createWorkFromMemory(memoryWork: any): Promise<Work> {
    // 确保存储服务已初始化
    await this.storageService.initialize();

    // 转换为 WorkCreateDTO
    const dto: WorkCreateDTO = {
      title: memoryWork.title || '未命名作品',
      category: memoryWork.category || '个人',
      tags: memoryWork.tags || [],
      nodes: memoryWork.nodes || 0
    };

    // 创建作品
    return await this.storageService.createWork(dto);
  }

  /**
   * 从内存更新作品
   * 接收原有 Work 对象，更新存储中的对应记录
   * @param memoryWork 内存中的 Work 对象
   * @returns 更新后的 Work 对象
   */
  async updateWorkInMemory(memoryWork: any): Promise<Work> {
    // 确保存储服务已初始化
    await this.storageService.initialize();

    // 检查作品是否存在
    const existingWork = await this.storageService.readWork(memoryWork.id);
    if (!existingWork) {
      // 如果不存在，创建新作品
      return await this.createWorkFromMemory(memoryWork);
    }

    // 转换为 WorkUpdateDTO
    const dto: WorkUpdateDTO = {
      title: memoryWork.title,
      category: memoryWork.category,
      tags: memoryWork.tags,
      starred: memoryWork.starred,
      encryptedData: memoryWork.encryptedData
    };

    // 更新作品
    return await this.storageService.updateWork(memoryWork.id, dto);
  }

  /**
   * 从内存删除作品
   * 接收 workId，执行软删除
   * @param workId 作品 ID
   * @returns 是否删除成功
   */
  async deleteWorkFromMemory(workId: string): Promise<boolean> {
    // 确保存储服务已初始化
    await this.storageService.initialize();

    // 执行软删除
    return await this.storageService.deleteWork(workId, false);
  }

  /**
   * 批量从内存创建作品
   * @param memoryWorks 内存中的 Work 对象数组
   * @returns 存储后的 Work 对象数组
   */
  async batchCreateWorksFromMemory(memoryWorks: any[]): Promise<Work[]> {
    // 确保存储服务已初始化
    await this.storageService.initialize();

    const works: Work[] = [];
    for (const memoryWork of memoryWorks) {
      const work = await this.createWorkFromMemory(memoryWork);
      works.push(work);
    }

    return works;
  }

  /**
   * 从内存获取作品列表
   * 兼容旧的 works 状态结构
   * @returns 作品列表
   */
  async getWorksFromMemory(): Promise<Work[]> {
    // 确保存储服务已初始化
    await this.storageService.initialize();

    // 获取所有未删除的作品
    const result = await this.storageService.listWorks({ deletedOnly: false });
    return result.works;
  }

  /**
   * 检查作品是否已存在于存储中
   * @param workId 作品 ID
   * @returns 是否已存在
   */
  async workExists(workId: string): Promise<boolean> {
    // 确保存储服务已初始化
    await this.storageService.initialize();

    const work = await this.storageService.readWork(workId);
    return work !== null;
  }

  /**
   * 迁移所有内存作品到存储系统
   * @param memoryWorks 内存中的 Work 对象数组
   * @returns 迁移结果
   */
  async migrateFromMemory(memoryWorks: any[]): Promise<{
    success: number;
    failed: number;
    works: Work[];
  }> {
    // 确保存储服务已初始化
    await this.storageService.initialize();

    const works: Work[] = [];
    let success = 0;
    let failed = 0;

    for (const memoryWork of memoryWorks) {
      try {
        // 检查作品是否已存在
        const exists = await this.workExists(memoryWork.id);
        let work: Work;

        if (exists) {
          // 更新现有作品
          work = await this.updateWorkInMemory(memoryWork);
        } else {
          // 创建新作品
          work = await this.createWorkFromMemory(memoryWork);
        }

        works.push(work);
        success++;
      } catch (error) {
        console.error('Failed to migrate work:', memoryWork.id, error);
        failed++;
      }
    }

    return {
      success,
      failed,
      works
    };
  }
}
