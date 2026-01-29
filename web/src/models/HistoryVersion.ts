export interface DiffData {
  operation: 'insert' | 'update' | 'delete';
  targetId: string;
  parentId?: string;
  data?: any;
}

export interface HistoryVersion {
  id: string;
  workId: string;
  versionNumber: number;
  snapshotData: string;
  diffData?: DiffData;
  createdAt: string;
  operationType: 'auto_save' | 'manual_save' | 'undo' | 'redo';
  description?: string;
}

export interface HistoryVersionCreateDTO {
  workId: string;
  snapshotData: string;
  diffData?: DiffData;
  operationType: 'auto_save' | 'manual_save' | 'undo' | 'redo';
  description?: string;
}

export interface HistoryVersionListResult {
  versions: HistoryVersion[];
  total: number;
  page: number;
  pageSize: number;
}
