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
  colorSchemeAssetId?: string; // 配色方案素材ID
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
  // 形状和连接线改为字符串类型，支持动态素材
  shape: string;
  shapeAssetId?: string; // 关联的形状素材ID
  color: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  icon?: string;
  connectionType?: string;
  connectorAssetId?: string; // 关联的连接线素材ID
  fontStyleAssetId?: string; // 关联的字体样式素材ID
  fontFamily?: string; // 字体家族
  size?: number;
  children: string[];
  metadata?: Record<string, any>;
  expanded?: boolean;
  level?: number;
}
