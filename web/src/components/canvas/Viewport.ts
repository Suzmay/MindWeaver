import { MindMapNode } from '../../models/Work';
import { Connection } from '../editor/ConnectionManager';

export class Viewport {
  private width: number;
  private height: number;
  private zoom: number;
  private pan: { x: number; y: number };

  constructor(
    width: number = 800,
    height: number = 600,
    zoom: number = 1,
    pan: { x: number; y: number } = { x: 0, y: 0 }
  ) {
    this.width = width;
    this.height = height;
    this.zoom = zoom;
    this.pan = pan;
  }

  // 更新视口大小
  updateSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  // 更新缩放和平移
  updateTransform(zoom: number, pan: { x: number; y: number }): void {
    this.zoom = zoom;
    this.pan = pan;
  }

  // 获取画布坐标中的可见边界
  getVisibleBounds(): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    const scale = 1 / this.zoom;
    return {
      x: -this.pan.x * scale,
      y: -this.pan.y * scale,
      width: this.width * scale,
      height: this.height * scale,
    };
  }

  // 检查节点是否在视口中可见
  isNodeVisible(node: MindMapNode): boolean {
    const bounds = this.getVisibleBounds();
    const nodeRadius = this.getNodeRadius(node);

    // 检查节点边界框是否与视口相交
    return (
      node.x + nodeRadius > bounds.x &&
      node.x - nodeRadius < bounds.x + bounds.width &&
      node.y + nodeRadius > bounds.y &&
      node.y - nodeRadius < bounds.y + bounds.height
    );
  }

  // 检查连接是否在视口中可见
  isConnectionVisible(
    connection: Connection,
    nodes: MindMapNode[]
  ): boolean {
    const sourceNode = nodes.find((n) => n.id === connection.sourceId);
    const targetNode = nodes.find((n) => n.id === connection.targetId);

    if (!sourceNode || !targetNode) {
      return false;
    }

    // 如果任一节点可见，则连接可能可见
    if (this.isNodeVisible(sourceNode) || this.isNodeVisible(targetNode)) {
      return true;
    }

    // 检查连接线是否与视口相交
    const bounds = this.getVisibleBounds();
    return this.lineIntersectsRect(
      sourceNode.x,
      sourceNode.y,
      targetNode.x,
      targetNode.y,
      bounds
    );
  }

  // 获取视口中可见的节点
  getVisibleNodes(nodes: MindMapNode[]): MindMapNode[] {
    return nodes.filter((node) => this.isNodeVisible(node));
  }

  // 获取视口中可见的连接
  getVisibleConnections(
    connections: Connection[],
    nodes: MindMapNode[]
  ): Connection[] {
    return connections.filter((connection) =>
      this.isConnectionVisible(connection, nodes)
    );
  }

  // 根据形状获取节点半径
  private getNodeRadius(node: MindMapNode): number {
    switch (node.shape) {
      case 'rectangle':
      case 'rounded':
        return Math.sqrt(60 * 60 + 25 * 25); // 120x50的对角线
      case 'circle':
        return 40;
      case 'cloud':
        return 80;
      default:
        return 60;
    }
  }

  // 检查直线是否与矩形相交
  private lineIntersectsRect(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    rect: { x: number; y: number; width: number; height: number }
  ): boolean {
    // 检查直线是否起始或结束于矩形内部
    if (
      (x1 >= rect.x && x1 <= rect.x + rect.width &&
       y1 >= rect.y && y1 <= rect.y + rect.height) ||
      (x2 >= rect.x && x2 <= rect.x + rect.width &&
       y2 >= rect.y && y2 <= rect.y + rect.height)
    ) {
      return true;
    }

    // 检查直线是否与矩形的任何边相交
    return (
      this.lineIntersectsLine(x1, y1, x2, y2, rect.x, rect.y, rect.x + rect.width, rect.y) ||
      this.lineIntersectsLine(x1, y1, x2, y2, rect.x + rect.width, rect.y, rect.x + rect.width, rect.y + rect.height) ||
      this.lineIntersectsLine(x1, y1, x2, y2, rect.x + rect.width, rect.y + rect.height, rect.x, rect.y + rect.height) ||
      this.lineIntersectsLine(x1, y1, x2, y2, rect.x, rect.y + rect.height, rect.x, rect.y)
    );
  }

  // 检查两条直线是否相交
  private lineIntersectsLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    x4: number,
    y4: number
  ): boolean {
    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (denom === 0) {
      return false; // 直线平行
    }

    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
  }

  // 计算最佳渲染顺序
  getOptimalRenderOrder(
    nodes: MindMapNode[],
    connections: Connection[]
  ): {
    nodes: MindMapNode[];
    connections: Connection[];
  } {
    const visibleNodes = this.getVisibleNodes(nodes);
    const visibleConnections = this.getVisibleConnections(connections, nodes);

    // 按深度排序节点（从前到后）
    const sortedNodes = visibleNodes.sort((a, b) => {
      // 基于y坐标的简单深度排序
      return a.y - b.y;
    });

    return {
      nodes: sortedNodes,
      connections: visibleConnections,
    };
  }

  // 计算渲染优先级
  getRenderingPriority(
    nodes: MindMapNode[],
    connections: Connection[]
  ): {
    high: { nodes: MindMapNode[]; connections: Connection[] };
    medium: { nodes: MindMapNode[]; connections: Connection[] };
    low: { nodes: MindMapNode[]; connections: Connection[] };
  } {
    const visibleNodes = this.getVisibleNodes(nodes);
    const visibleConnections = this.getVisibleConnections(connections, nodes);

    // 高优先级：完全在视口内的节点和连接
    const highPriorityNodes = visibleNodes.filter((node) => {
      const bounds = this.getVisibleBounds();
      const nodeRadius = this.getNodeRadius(node);
      return (
        node.x - nodeRadius >= bounds.x &&
        node.x + nodeRadius <= bounds.x + bounds.width &&
        node.y - nodeRadius >= bounds.y &&
        node.y + nodeRadius <= bounds.y + bounds.height
      );
    });

    // 中优先级：部分在视口内的节点和连接
    const mediumPriorityNodes = visibleNodes.filter(
      (node) => !highPriorityNodes.includes(node)
    );

    // 低优先级：可能部分可见的连接
    const lowPriorityConnections = visibleConnections.filter((connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.sourceId);
      const targetNode = nodes.find((n) => n.id === connection.targetId);
      return !sourceNode || !targetNode ||
        (!highPriorityNodes.includes(sourceNode) || !highPriorityNodes.includes(targetNode));
    });

    const highPriorityConnections = visibleConnections.filter(
      (connection) => !lowPriorityConnections.includes(connection)
    );

    return {
      high: {
        nodes: highPriorityNodes,
        connections: highPriorityConnections,
      },
      medium: {
        nodes: mediumPriorityNodes,
        connections: [],
      },
      low: {
        nodes: [],
        connections: lowPriorityConnections,
      },
    };
  }

  // 检查视口是否需要更新
  needsUpdate(
    previousZoom: number,
    previousPan: { x: number; y: number },
    previousWidth: number,
    previousHeight: number
  ): boolean {
    return (
      this.zoom !== previousZoom ||
      this.pan.x !== previousPan.x ||
      this.pan.y !== previousPan.y ||
      this.width !== previousWidth ||
      this.height !== previousHeight
    );
  }

  // 计算画布坐标中的视口中心
  getCenter(): { x: number; y: number } {
    const bounds = this.getVisibleBounds();
    return {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    };
  }

  // 使视口适应内容
  fitToContent(nodes: MindMapNode[]): { zoom: number; pan: { x: number; y: number } } {
    if (nodes.length === 0) {
      return { zoom: 1, pan: { x: 0, y: 0 } };
    }

    // 计算内容边界
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    nodes.forEach((node) => {
      const radius = this.getNodeRadius(node);
      minX = Math.min(minX, node.x - radius);
      minY = Math.min(minY, node.y - radius);
      maxX = Math.max(maxX, node.x + radius);
      maxY = Math.max(maxY, node.y + radius);
    });

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const contentCenterX = (minX + maxX) / 2;
    const contentCenterY = (minY + maxY) / 2;

    // 计算适应内容的缩放
    const zoomX = (this.width * 0.8) / contentWidth;
    const zoomY = (this.height * 0.8) / contentHeight;
    const newZoom = Math.min(zoomX, zoomY, 3); // 限制最大缩放

    // 计算使内容居中的平移
    const newPan = {
      x: (this.width / 2) - (contentCenterX * newZoom),
      y: (this.height / 2) - (contentCenterY * newZoom),
    };

    return { zoom: newZoom, pan: newPan };
  }
}
