import { MindMapNode } from '../../models/Work';
import { HistoryVersion } from '../../models/HistoryVersion';

export interface HistoryState {
  nodes: MindMapNode[];
  connections: any[];
  timestamp: number;
  description?: string;
}

export class HistoryManager {
  private history: HistoryState[];
  private currentIndex: number;
  private maxHistorySize: number;
  private autoSaveInterval: number | null;

  constructor(maxHistorySize: number = 50) {
    this.history = [];
    this.currentIndex = -1;
    this.maxHistorySize = maxHistorySize;
    this.autoSaveInterval = null;
  }

  // 开始自动保存间隔
  startAutoSave(intervalMs: number = 30000, workId: string = 'unknown', onAutoSave?: () => void): void {
    this.stopAutoSave();
    this.autoSaveInterval = setInterval(() => {
      if (this.history.length > 0) {
        const currentState = this.history[this.currentIndex];
        this.createSnapshot(currentState, '自动保存', workId);
        if (onAutoSave) {
          onAutoSave();
        }
      }
    }, intervalMs);
  }

  // 停止自动保存间隔
  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  // 向历史记录添加新状态
  addState(state: HistoryState): void {
    // 如果不在历史记录末尾，删除未来的历史
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // 添加新状态
    this.history.push(state);
    this.currentIndex++;

    // 限制历史记录大小
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
      this.currentIndex--;
    }
  }

  // 撤销到上一个状态
  undo(): HistoryState | null {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return this.history[this.currentIndex];
    }
    return null;
  }

  // 重做到下一个状态
  redo(): HistoryState | null {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      return this.history[this.currentIndex];
    }
    return null;
  }

  // 创建当前状态的快照
  createSnapshot(state: HistoryState, description: string, workId: string = 'unknown'): HistoryVersion {
    const snapshot: HistoryVersion = {
      id: `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      workId,
      versionNumber: this.history.length + 1,
      snapshotData: JSON.stringify(state),
      createdAt: new Date().toISOString(),
      operationType: 'manual_save',
      description,
    };
    return snapshot;
  }

  // 获取当前状态
  getCurrentState(): HistoryState | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      return this.history[this.currentIndex];
    }
    return null;
  }

  // 获取历史状态
  getHistory(): HistoryState[] {
    return this.history;
  }

  // 获取当前索引
  getCurrentIndex(): number {
    return this.currentIndex;
  }

  // 计算两个状态之间的差异
  calculateDifference(oldState: HistoryState, newState: HistoryState): any {
    const differences = {
      addedNodes: [] as MindMapNode[],
      updatedNodes: [] as { id: string; changes: any }[],
      deletedNodes: [] as string[],
      addedConnections: [] as any[],
      deletedConnections: [] as string[],
    };

    // 检查节点
    const oldNodeMap = new Map(oldState.nodes.map((node) => [node.id, node]));
    const newNodeMap = new Map(newState.nodes.map((node) => [node.id, node]));

    // 新增的节点
    newState.nodes.forEach((node) => {
      if (!oldNodeMap.has(node.id)) {
        differences.addedNodes.push(node);
      }
    });

    // 更新的节点
    newState.nodes.forEach((node) => {
      const oldNode = oldNodeMap.get(node.id);
      if (oldNode) {
        const nodeChanges = this.calculateNodeDifference(oldNode, node);
        if (Object.keys(nodeChanges).length > 0) {
          differences.updatedNodes.push({ id: node.id, changes: nodeChanges });
        }
      }
    });

    // 删除的节点
    oldState.nodes.forEach((node) => {
      if (!newNodeMap.has(node.id)) {
        differences.deletedNodes.push(node.id);
      }
    });

    // 检查连接（简化版）
    const oldConnectionIds = new Set(oldState.connections.map((conn: any) => conn.id));
    const newConnectionIds = new Set(newState.connections.map((conn: any) => conn.id));

    // 新增的连接
    newState.connections.forEach((conn: any) => {
      if (!oldConnectionIds.has(conn.id)) {
        differences.addedConnections.push(conn);
      }
    });

    // 删除的连接
    oldState.connections.forEach((conn: any) => {
      if (!newConnectionIds.has(conn.id)) {
        differences.deletedConnections.push(conn.id);
      }
    });

    return differences;
  }

  // 计算两个节点之间的差异
  private calculateNodeDifference(oldNode: MindMapNode, newNode: MindMapNode): any {
    const changes: any = {};

    if (oldNode.title !== newNode.title) {
      changes.title = newNode.title;
    }
    if (oldNode.summary !== newNode.summary) {
      changes.summary = newNode.summary;
    }
    if (oldNode.content !== newNode.content) {
      changes.content = newNode.content;
    }
    if (oldNode.type !== newNode.type) {
      changes.type = newNode.type;
    }
    if (oldNode.shape !== newNode.shape) {
      changes.shape = newNode.shape;
    }
    if (oldNode.color !== newNode.color) {
      changes.color = newNode.color;
    }
    if (oldNode.fontSize !== newNode.fontSize) {
      changes.fontSize = newNode.fontSize;
    }
    if (oldNode.icon !== newNode.icon) {
      changes.icon = newNode.icon;
    }
    if (oldNode.expanded !== newNode.expanded) {
      changes.expanded = newNode.expanded;
    }
    if (oldNode.x !== newNode.x || oldNode.y !== newNode.y) {
      changes.position = { x: newNode.x, y: newNode.y };
    }
    if (JSON.stringify(oldNode.children) !== JSON.stringify(newNode.children)) {
      changes.children = newNode.children;
    }

    return changes;
  }

  // 将差异应用到状态
  applyDifference(state: HistoryState, difference: any): HistoryState {
    const newState = JSON.parse(JSON.stringify(state)) as HistoryState;

    // 应用节点变化
    if (difference.addedNodes) {
      newState.nodes = [...newState.nodes, ...difference.addedNodes];
    }

    if (difference.updatedNodes) {
      newState.nodes = newState.nodes.map((node) => {
        const update = difference.updatedNodes.find((u: any) => u.id === node.id);
        if (update) {
          if (update.changes.position) {
            return {
              ...node,
              x: update.changes.position.x,
              y: update.changes.position.y,
              ...update.changes,
            };
          }
          return { ...node, ...update.changes };
        }
        return node;
      });
    }

    if (difference.deletedNodes) {
      const deletedIds = new Set(difference.deletedNodes);
      newState.nodes = newState.nodes.filter((node) => !deletedIds.has(node.id));
      // 同时从其他节点中移除引用
      newState.nodes = newState.nodes.map((node) => {
        return {
          ...node,
          children: node.children.filter((childId) => !deletedIds.has(childId)),
        };
      });
    }

    // 应用连接变化
    if (difference.addedConnections) {
      newState.connections = [...newState.connections, ...difference.addedConnections];
    }

    if (difference.deletedConnections) {
      const deletedIds = new Set(difference.deletedConnections);
      newState.connections = newState.connections.filter(
        (conn: any) => !deletedIds.has(conn.id)
      );
    }

    return newState;
  }

  // 清除历史记录
  clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }

  // 检查是否可以撤销
  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  // 检查是否可以重做
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  // 将历史记录导出为JSON
  exportHistory(): string {
    return JSON.stringify(this.history, null, 2);
  }

  // 从JSON导入历史记录
  importHistory(json: string): boolean {
    try {
      const importedHistory = JSON.parse(json) as HistoryState[];
      if (Array.isArray(importedHistory)) {
        this.history = importedHistory;
        this.currentIndex = this.history.length - 1;
        return true;
      }
      return false;
    } catch (error) {
      console.error('导入历史记录失败:', error);
      return false;
    }
  }
}
