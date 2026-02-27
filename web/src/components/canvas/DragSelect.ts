import { MindMapNode } from '../../models/Work';

export class DragSelect {
  private isDragging: boolean;
  private isSelecting: boolean;
  private startPos: { x: number; y: number };
  private currentPos: { x: number; y: number };
  private selectedNodes: Set<string>;
  private draggedNode: string | null;

  constructor() {
    this.isDragging = false;
    this.isSelecting = false;
    this.startPos = { x: 0, y: 0 };
    this.currentPos = { x: 0, y: 0 };
    this.selectedNodes = new Set<string>();
    this.draggedNode = null;
  }

  // 开始拖拽操作
  startDrag(x: number, y: number): void {
    this.isDragging = true;
    this.startPos = { x, y };
    this.currentPos = { x, y };
  }

  // 开始选择操作
  startSelection(x: number, y: number): void {
    this.isSelecting = true;
    this.startPos = { x, y };
    this.currentPos = { x, y };
  }

  // 更新拖拽/选择位置
  updatePosition(x: number, y: number): void {
    this.currentPos = { x, y };
  }

  // 结束拖拽/选择操作
  endOperation(): void {
    this.isDragging = false;
    this.isSelecting = false;
    this.draggedNode = null;
  }

  // 检查是否正在拖拽
  getIsDragging(): boolean {
    return this.isDragging;
  }

  // 检查是否正在选择
  getIsSelecting(): boolean {
    return this.isSelecting;
  }

  // 获取选择矩形
  getSelectionRect(): {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null {
    if (!this.isSelecting) return null;

    const x = Math.min(this.startPos.x, this.currentPos.x);
    const y = Math.min(this.startPos.y, this.currentPos.y);
    const width = Math.abs(this.currentPos.x - this.startPos.x);
    const height = Math.abs(this.currentPos.y - this.startPos.y);

    return { x, y, width, height };
  }

  // 获取拖拽偏移量
  getDragDelta(): { x: number; y: number } {
    return {
      x: this.currentPos.x - this.startPos.x,
      y: this.currentPos.y - this.startPos.y,
    };
  }

  // 选择节点
  selectNode(nodeId: string, multiple: boolean = false): void {
    if (!multiple) {
      this.selectedNodes.clear();
    }
    this.selectedNodes.add(nodeId);
  }

  // 取消选择节点
  deselectNode(nodeId: string): void {
    this.selectedNodes.delete(nodeId);
  }

  // 清除选择
  clearSelection(): void {
    this.selectedNodes.clear();
  }

  // 获取已选择的节点
  getSelectedNodes(): string[] {
    return Array.from(this.selectedNodes);
  }

  // 检查节点是否被选择
  isNodeSelected(nodeId: string): boolean {
    return this.selectedNodes.has(nodeId);
  }

  // 设置被拖拽的节点
  setDraggedNode(nodeId: string | null): void {
    this.draggedNode = nodeId;
  }

  // 获取被拖拽的节点
  getDraggedNode(): string | null {
    return this.draggedNode;
  }

  // 执行框选
  performBoxSelection(
    nodes: MindMapNode[],
    rect: { x: number; y: number; width: number; height: number },
    zoom: number,
    pan: { x: number; y: number }
  ): string[] {
    const selected: string[] = [];

    // 将屏幕矩形转换为画布坐标
    const canvasRect = {
      x: (rect.x - pan.x) / zoom,
      y: (rect.y - pan.y) / zoom,
      width: rect.width / zoom,
      height: rect.height / zoom,
    };

    for (const node of nodes) {
      let nodeRect: { x: number; y: number; width: number; height: number };

      switch (node.shape) {
        case 'rectangle':
        case 'rounded':
          nodeRect = {
            x: node.x - 60,
            y: node.y - 25,
            width: 120,
            height: 50,
          };
          break;
        case 'circle':
          nodeRect = {
            x: node.x - 40,
            y: node.y - 40,
            width: 80,
            height: 80,
          };
          break;
        case 'cloud':
          nodeRect = {
            x: node.x - 80,
            y: node.y - 60,
            width: 160,
            height: 120,
          };
          break;
      }

      // 检查节点是否与选择矩形相交
      if (
        nodeRect.x < canvasRect.x + canvasRect.width &&
        nodeRect.x + nodeRect.width > canvasRect.x &&
        nodeRect.y < canvasRect.y + canvasRect.height &&
        nodeRect.y + nodeRect.height > canvasRect.y
      ) {
        selected.push(node.id);
      }
    }

    return selected;
  }

  // 按偏移量移动已选择的节点
  moveSelectedNodes(
    nodes: MindMapNode[],
    deltaX: number,
    deltaY: number,
    zoom: number
  ): MindMapNode[] {
    // 根据缩放调整偏移量
    const adjustedDeltaX = deltaX / zoom;
    const adjustedDeltaY = deltaY / zoom;

    return nodes.map((node) => {
      if (this.selectedNodes.has(node.id)) {
        return {
          ...node,
          x: node.x + adjustedDeltaX,
          y: node.y + adjustedDeltaY,
        };
      }
      return node;
    });
  }
}
