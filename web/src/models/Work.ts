export interface Work {
  id: string;
  title: string;
  lastModified: string;
  thumbnail?: string;
  starred?: boolean;
  nodes?: number;
  category?: string;
  tags?: string[];
  layout?: {
    mode: string;
    direction: string;
  };
  // 新增字段 - 持久化存储
  createdAt: string; // ISO 8601 格式时间戳
  isDeleted: boolean; // 软删除标记
  inTrashSince?: string; // 移入废纸篓时间
  dataVersion: number; // 数据版本号
  checksum: string; // 数据校验和
  encryptedData: string; // 加密后的完整思维导图数据
  // 新增字段 - 默认作品和只读状态
  isDefault?: boolean; // 标记是否为默认作品
  isReadonly?: boolean; // 标记是否为只读作品
}

export interface WorkCreateDTO {
  title: string;
  category?: string;
  tags?: string[];
  nodes?: number;
  layout?: {
    mode: string;
    direction: string;
  };
  isDefault?: boolean;
  isReadonly?: boolean;
}

export interface WorkUpdateDTO {
  title?: string;
  category?: string;
  tags?: string[];
  starred?: boolean;
  layout?: {
    mode: string;
    direction: string;
  };
  encryptedData?: string;
  isDefault?: boolean;
  isReadonly?: boolean;
}

export interface WorkListResult {
  works: Work[];
  total: number;
  page: number;
  pageSize: number;
}

export interface QueryOptions {
  searchText?: string;
  category?: string;
  tags?: string[];
  starredOnly?: boolean;
  deletedOnly?: boolean;
  dateRange?: {
    startDate?: string;
    endDate?: string;
  };
  sortBy?: 'title' | 'lastModified' | 'createdAt' | 'nodeCount' | 'category';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface MindMapNode {
  id: string;
  x: number;
  y: number;
  title: string;
  summary?: string;
  content?: string;
  type: 'person' | 'event' | 'concept' | 'task' | 'other';
  shape: 'rectangle' | 'rounded' | 'circle' | 'cloud';
  color: string;
  fontSize?: number;
  icon?: string;
  connectionType?: 'straight' | 'curved' | 'dashed' | 'wavy';
  children: string[];
  metadata?: Record<string, any>;
  expanded?: boolean;
  level?: number;
}
