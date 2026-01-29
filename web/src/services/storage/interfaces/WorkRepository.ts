import { Work, WorkCreateDTO, WorkUpdateDTO, WorkListResult, QueryOptions } from '../../../models/Work';

export interface WorkRepository {
  // 创建作品
  create(dto: WorkCreateDTO): Promise<Work>;
  
  // 读取作品
  read(workId: string): Promise<Work | null>;
  
  // 更新作品
  update(workId: string, dto: WorkUpdateDTO): Promise<Work>;
  
  // 删除作品（软删除）
  delete(workId: string, hardDelete?: boolean): Promise<boolean>;
  
  // 恢复作品（从废纸篓）
  restore(workId: string): Promise<Work>;
  
  // 列出作品
  list(options: QueryOptions): Promise<WorkListResult>;
  
  // 批量操作
  batchCreate(dtos: WorkCreateDTO[]): Promise<Work[]>;
  batchUpdate(workIds: string[], dto: WorkUpdateDTO): Promise<{
    success: Work[];
    failed: { workId: string; error: string }[];
  }>;
  batchDelete(workIds: string[], hardDelete?: boolean): Promise<{
    success: string[];
    failed: { workId: string; error: string }[];
  }>;
  
  // 导出作品
  export(workId: string, format: 'mm' | 'xmind' | 'json'): Promise<Blob>;
  
  // 导入作品
  import(file: Blob, format: 'mm' | 'xmind' | 'json'): Promise<Work>;
}
