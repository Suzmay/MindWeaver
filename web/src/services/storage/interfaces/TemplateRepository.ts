import { Template, TemplateCreateDTO, TemplateUpdateDTO } from '../../../models/Template';
import { WorkRepository } from './WorkRepository';
import { WorkListResult, QueryOptions } from '../../../models/Work';

export interface TemplateRepository extends WorkRepository {
  // 按模板类型查询
  findByType(templateType: string): Promise<Template[]>;
  
  // 获取默认模板列表
  getDefaultTemplates(): Promise<Template[]>;
  
  // 创建模板
  createTemplate(dto: TemplateCreateDTO): Promise<Template>;
  
  // 更新模板
  updateTemplate(templateId: string, dto: TemplateUpdateDTO): Promise<Template>;
  
  // 复制模板
  copyTemplate(templateId: string, newTitle: string): Promise<Template>;
  
  // 列出模板
  listTemplates(options: QueryOptions): Promise<WorkListResult>;
  
  // 增加使用次数
  incrementUsage(templateId: string): Promise<void>;
}
