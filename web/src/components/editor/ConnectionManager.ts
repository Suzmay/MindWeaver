import { MindMapNode } from '../../models/Work';

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'default' | 'dependency' | 'association' | 'inheritance';
  style: 'straight' | 'curve' | 'bezier';
  color: string;
  width: number;
  arrowType: 'none' | 'normal' | 'diamond' | 'circle';
}

export class ConnectionManager {
  // 创建新连接
  static createConnection(
    connections: Connection[],
    options: {
      sourceId: string;
      targetId: string;
      type?: 'default' | 'dependency' | 'association' | 'inheritance';
      style?: 'straight' | 'curve' | 'bezier';
      color?: string;
      width?: number;
      arrowType?: 'none' | 'normal' | 'diamond' | 'circle';
    }
  ): Connection[] {
    const newConnection: Connection = {
      id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sourceId: options.sourceId,
      targetId: options.targetId,
      type: options.type || 'default',
      style: options.style || 'bezier',
      color: options.color || '#64748B',
      width: options.width || 2,
      arrowType: options.arrowType || 'normal',
    };

    // 检查连接是否已存在
    const existingConnection = connections.find(
      (conn) => conn.sourceId === options.sourceId && conn.targetId === options.targetId
    );

    if (existingConnection) {
      // 更新现有连接
      return connections.map((conn) =>
        conn.id === existingConnection.id ? newConnection : conn
      );
    }

    return [...connections, newConnection];
  }

  // 删除连接
  static deleteConnection(connections: Connection[], connectionId: string): Connection[] {
    return connections.filter((conn) => conn.id !== connectionId);
  }

  // 更新连接属性
  static updateConnection(
    connections: Connection[],
    connectionId: string,
    updates: Partial<Connection>
  ): Connection[] {
    return connections.map((conn) =>
      conn.id === connectionId ? { ...conn, ...updates } : conn
    );
  }

  // 获取节点的连接
  static getNodeConnections(
    connections: Connection[],
    nodeId: string
  ): Connection[] {
    return connections.filter(
      (conn) => conn.sourceId === nodeId || conn.targetId === nodeId
    );
  }

  // 使用智能算法获取连接路径点
  static getConnectionPath(
    sourceNode: MindMapNode,
    targetNode: MindMapNode,
    style: 'straight' | 'curve' | 'bezier',
    nodes: MindMapNode[]
  ): {
    path: string;
    points: { x: number; y: number }[];
  } {
    switch (style) {
      case 'straight':
        return this.getStraightPath(sourceNode, targetNode);
      case 'curve':
        return this.getCurvePath(sourceNode, targetNode);
      case 'bezier':
        return this.getBezierPath(sourceNode, targetNode, nodes);
      default:
        return this.getBezierPath(sourceNode, targetNode, nodes);
    }
  }

  // 获取直线路径
  private static getStraightPath(
    sourceNode: MindMapNode,
    targetNode: MindMapNode
  ): {
    path: string;
    points: { x: number; y: number }[];
  } {
    const points = [
      { x: sourceNode.x, y: sourceNode.y },
      { x: targetNode.x, y: targetNode.y },
    ];

    const path = `M ${sourceNode.x} ${sourceNode.y} L ${targetNode.x} ${targetNode.y}`;

    return { path, points };
  }

  // 获取曲线路径
  private static getCurvePath(
    sourceNode: MindMapNode,
    targetNode: MindMapNode
  ): {
    path: string;
    points: { x: number; y: number }[];
  } {
    const midX = (sourceNode.x + targetNode.x) / 2;
    const midY = (sourceNode.y + targetNode.y) / 2 - 50;

    const points = [
      { x: sourceNode.x, y: sourceNode.y },
      { x: midX, y: midY },
      { x: targetNode.x, y: targetNode.y },
    ];

    const path = `M ${sourceNode.x} ${sourceNode.y} Q ${midX} ${midY} ${targetNode.x} ${targetNode.y}`;

    return { path, points };
  }

  // 获取带障碍规避的贝塞尔路径
  private static getBezierPath(
    sourceNode: MindMapNode,
    targetNode: MindMapNode,
    nodes: MindMapNode[]
  ): {
    path: string;
    points: { x: number; y: number }[];
  } {
    // 计算带障碍规避的控制点
    const controlPoint1 = this.calculateControlPoint(sourceNode, targetNode, nodes, 0.3);
    const controlPoint2 = this.calculateControlPoint(sourceNode, targetNode, nodes, 0.7);

    const points = [
      { x: sourceNode.x, y: sourceNode.y },
      controlPoint1,
      controlPoint2,
      { x: targetNode.x, y: targetNode.y },
    ];

    const path = `M ${sourceNode.x} ${sourceNode.y} C ${controlPoint1.x} ${controlPoint1.y}, ${controlPoint2.x} ${controlPoint2.y}, ${targetNode.x} ${targetNode.y}`;

    return { path, points };
  }

  // 计算带障碍规避的控制点
  private static calculateControlPoint(
    sourceNode: MindMapNode,
    targetNode: MindMapNode,
    nodes: MindMapNode[],
    t: number
  ): { x: number; y: number } {
    // 基本控制点计算
    const baseX = sourceNode.x + (targetNode.x - sourceNode.x) * t;
    const baseY = sourceNode.y + (targetNode.y - sourceNode.y) * t - 100;

    // 检查障碍
    const obstacle = nodes.find((node) => {
      if (node.id === sourceNode.id || node.id === targetNode.id) return false;

      // 计算控制点到节点的距离
      const distance = Math.sqrt(
        Math.pow(node.x - baseX, 2) + Math.pow(node.y - baseY, 2)
      );

      // 如果太近则视为障碍
      return distance < 80; // 节点半径 + 缓冲区
    });

    if (obstacle) {
      // 调整控制点以避开障碍
      const angle = Math.atan2(
        obstacle.y - baseY,
        obstacle.x - baseX
      ) + Math.PI;
      const distance = 100; // 远离障碍的距离

      return {
        x: baseX + Math.cos(angle) * distance,
        y: baseY + Math.sin(angle) * distance,
      };
    }

    return { x: baseX, y: baseY };
  }

  // 绘制带箭头的连接
  static drawConnection(
    ctx: CanvasRenderingContext2D,
    connection: Connection,
    sourceNode: MindMapNode,
    targetNode: MindMapNode,
    nodes: MindMapNode[]
  ): void {
    // 设置连接样式
    ctx.strokeStyle = connection.color;
    ctx.lineWidth = connection.width;
    ctx.fillStyle = connection.color;

    // 获取路径点
    const { path, points } = this.getConnectionPath(
      sourceNode,
      targetNode,
      connection.style,
      nodes
    );

    // 绘制路径
    ctx.beginPath();
    const pathParts = path.split(' ');
    ctx.moveTo(parseFloat(pathParts[1]), parseFloat(pathParts[2]));

    if (connection.style === 'straight') {
      ctx.lineTo(parseFloat(pathParts[4]), parseFloat(pathParts[5]));
    } else if (connection.style === 'curve') {
      ctx.quadraticCurveTo(
        parseFloat(pathParts[4]),
        parseFloat(pathParts[5]),
        parseFloat(pathParts[6]),
        parseFloat(pathParts[7])
      );
    } else if (connection.style === 'bezier') {
      ctx.bezierCurveTo(
        parseFloat(pathParts[4]),
        parseFloat(pathParts[5]),
        parseFloat(pathParts[6]),
        parseFloat(pathParts[7]),
        parseFloat(pathParts[8]),
        parseFloat(pathParts[9])
      );
    }

    ctx.stroke();

    // 绘制箭头（如果需要）
    if (connection.arrowType !== 'none') {
      this.drawArrow(
        ctx,
        points[points.length - 2],
        points[points.length - 1],
        connection.arrowType
      );
    }
  }

  // 绘制箭头头部
  private static drawArrow(
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number },
    to: { x: number; y: number },
    arrowType: 'none' | 'normal' | 'diamond' | 'circle'
  ): void {
    const headLength = 15;
    const angle = Math.atan2(to.y - from.y, to.x - from.x);

    ctx.save();
    ctx.translate(to.x, to.y);
    ctx.rotate(angle);

    switch (arrowType) {
      case 'normal':
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-headLength, headLength / 2);
        ctx.lineTo(-headLength, -headLength / 2);
        ctx.closePath();
        ctx.fill();
        break;

      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-headLength, headLength / 2);
        ctx.lineTo(-headLength * 1.5, 0);
        ctx.lineTo(-headLength, -headLength / 2);
        ctx.closePath();
        ctx.fill();
        break;

      case 'circle':
        ctx.beginPath();
        ctx.arc(-headLength / 2, 0, headLength / 3, 0, Math.PI * 2);
        ctx.fill();
        break;
    }

    ctx.restore();
  }

  // 检查连接是否与另一个节点相交
  static doesConnectionIntersectNode(
    connection: Connection,
    sourceNode: MindMapNode,
    targetNode: MindMapNode,
    node: MindMapNode,
    nodes: MindMapNode[]
  ): boolean {
    if (node.id === sourceNode.id || node.id === targetNode.id) {
      return false;
    }

    const { points } = this.getConnectionPath(
      sourceNode,
      targetNode,
      connection.style,
      nodes
    );

    // 检查线段是否与节点相交
    for (let i = 0; i < points.length - 1; i++) {
      if (this.lineIntersectsCircle(
        points[i],
        points[i + 1],
        node,
        40 // 节点半径
      )) {
        return true;
      }
    }

    return false;
  }

  // 检查线段是否与圆相交
  private static lineIntersectsCircle(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    center: { x: number; y: number },
    radius: number
  ): boolean {
    const dist = this.distanceToLineSegment(p1, p2, center);
    return dist < radius;
  }

  // 计算点到线段的距离
  private static distanceToLineSegment(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    p: { x: number; y: number }
  ): number {
    const A = p.x - p1.x;
    const B = p.y - p1.y;
    const C = p2.x - p1.x;
    const D = p2.y - p1.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx, yy;

    if (param < 0) {
      xx = p1.x;
      yy = p1.y;
    } else if (param > 1) {
      xx = p2.x;
      yy = p2.y;
    } else {
      xx = p1.x + param * C;
      yy = p1.y + param * D;
    }

    const dx = p.x - xx;
    const dy = p.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
