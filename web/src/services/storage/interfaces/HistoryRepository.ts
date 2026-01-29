import { HistoryVersion, HistoryVersionCreateDTO, HistoryVersionListResult } from '../../../models/HistoryVersion';

export interface HistoryRepository {
  // 创建版本
  createVersion(dto: HistoryVersionCreateDTO): Promise<HistoryVersion>;
  
  // 获取版本列表
  getVersions(workId: string, page?: number, pageSize?: number): Promise<HistoryVersionListResult>;
  
  // 获取最近版本
  getLatestVersion(workId: string): Promise<HistoryVersion | null>;
  
  // 恢复版本
  restoreVersion(workId: string, versionId: string): Promise<boolean>;
  
  // 清理旧版本
  cleanupOldVersions(workId: string, keepCount: number): Promise<number>;
  
  // 删除版本
  deleteVersion(versionId: string): Promise<boolean>;
  
  // 批量删除版本
  deleteVersionsByWorkId(workId: string): Promise<number>;
}
