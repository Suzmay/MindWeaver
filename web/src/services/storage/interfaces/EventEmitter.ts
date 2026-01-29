export enum EventType {
  WORK_CREATED = 'work_created',
  WORK_UPDATED = 'work_updated',
  WORK_DELETED = 'work_deleted',
  WORK_RESTORED = 'work_restored',
  TEMPLATE_CREATED = 'template_created',
  TEMPLATE_UPDATED = 'template_updated',
  VERSION_CREATED = 'version_created',
  STORAGE_FULL = 'storage_full',
  DATA_CORRUPTED = 'data_corrupted',
  INITIALIZED = 'initialized',
  ERROR = 'error',
  PREFERENCE_CHANGED = 'preference_changed'
}

export interface EventData {
  type: EventType;
  timestamp: string;
  workId?: string;
  templateId?: string;
  versionId?: string;
  error?: Error;
  data?: any;
}

export interface EventEmitter {
  // 订阅事件
  subscribe(type: EventType, callback: (data: EventData) => void): () => void;
  
  // 发布事件
  emit(type: EventType, data: Partial<EventData>): void;
  
  // 取消所有订阅
  clear(): void;
  
  // 获取订阅数量
  getSubscriptionCount(type: EventType): number;
}
