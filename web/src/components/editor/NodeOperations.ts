import { MindMapNode } from '../../models/Work';

export class NodeOperations {
  // 检查两个节点是否重叠
  private static doNodesOverlap(node1: { x: number; y: number; shape: MindMapNode['shape'] }, node2: { x: number; y: number; shape: MindMapNode['shape'] }): boolean {
    // 根据形状估计节点边界
    let node1Width, node1Height, node2Width, node2Height;
    
    // 根据形状设置边界大小
    switch (node1.shape) {
      case 'circle':
        node1Width = 80; // 直径
        node1Height = 80;
        break;
      case 'cloud':
        node1Width = 160;
        node1Height = 120;
        break;
      default: // rectangle, rounded
        node1Width = 120;
        node1Height = 50;
    }
    
    switch (node2.shape) {
      case 'circle':
        node2Width = 80;
        node2Height = 80;
        break;
      case 'cloud':
        node2Width = 160;
        node2Height = 120;
        break;
      default:
        node2Width = 120;
        node2Height = 50;
    }
    
    // 检查是否重叠
    return (
      node1.x - node1Width/2 < node2.x + node2Width/2 &&
      node1.x + node1Width/2 > node2.x - node2Width/2 &&
      node1.y - node1Height/2 < node2.y + node2Height/2 &&
      node1.y + node1Height/2 > node2.y - node2Height/2
    );
  }

  // 为新节点寻找不重叠的位置
  private static findNonOverlappingPosition(nodes: MindMapNode[], initialX: number, initialY: number): { x: number; y: number } {
    let x = initialX;
    let y = initialY;
    let attempts = 0;
    const maxAttempts = 50;
    const offset = 150; // 重叠时移动的距离
    
    while (attempts < maxAttempts) {
      let overlapping = false;
      
      // 检查与现有节点的重叠
      for (const node of nodes) {
        if (this.doNodesOverlap({ ...node }, { x, y, shape: 'rounded' as const })) {
          overlapping = true;
          break;
        }
      }
      
      if (!overlapping) {
        return { x, y };
      }
      
      // 尝试新位置（螺旋模式）
      const angle = attempts * Math.PI / 4;
      const distance = offset * Math.sqrt(attempts + 1);
      x = initialX + Math.cos(angle) * distance;
      y = initialY + Math.sin(angle) * distance;
      
      attempts++;
    }
    
    // 如果在最大尝试次数后未找到位置，返回原始位置
    return { x: initialX, y: initialY };
  }

  // 创建新节点
  static createNode(
    nodes: MindMapNode[],
    options: {
      x: number;
      y: number;
      title?: string;
      summary?: string;
      content?: string;
      type?: 'person' | 'event' | 'concept' | 'task' | 'other';
      shape?: 'rectangle' | 'rounded' | 'circle' | 'cloud';
      color?: string;
      fontSize?: number;
      icon?: string;
      parentId?: string;
    }
  ): MindMapNode[] {
    // 寻找不重叠的位置
    const { x, y } = this.findNonOverlappingPosition(nodes, options.x, options.y);
    
    const newNode: MindMapNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x,
      y,
      title: options.title || '新节点',
      summary: options.summary,
      content: options.content,
      type: options.type || 'concept',
      shape: options.shape || 'rounded',
      color: options.color || '#3B82F6',
      fontSize: options.fontSize || 14,
      icon: options.icon,
      children: [],
      expanded: true,
      level: 0,
    };

    // 将新节点添加到列表
    const updatedNodes = [...nodes, newNode];

    // 如果提供了parentId，将新节点添加为子节点
    if (options.parentId) {
      return updatedNodes.map((node) => {
        if (node.id === options.parentId) {
          return {
            ...node,
            children: [...node.children, newNode.id],
          };
        }
        return node;
      });
    }

    return updatedNodes;
  }

  // 删除节点及其子节点
  static deleteNode(nodes: MindMapNode[], nodeId: string): MindMapNode[] {
    // 找出所有要删除的节点（包括子节点）
    const nodesToDelete = new Set<string>();
    const collectNodesToDelete = (id: string) => {
      nodesToDelete.add(id);
      const node = nodes.find((n) => n.id === id);
      if (node) {
        node.children.forEach(collectNodesToDelete);
      }
    };
    collectNodesToDelete(nodeId);

    // 从列表中移除节点
    const filteredNodes = nodes.filter((node) => !nodesToDelete.has(node.id));

    // 从父节点中移除引用
    return filteredNodes.map((node) => {
      return {
        ...node,
        children: node.children.filter((childId) => !nodesToDelete.has(childId)),
      };
    });
  }

  // 更新节点属性
  static updateNode(
    nodes: MindMapNode[],
    nodeId: string,
    updates: Partial<MindMapNode>
  ): MindMapNode[] {
    return nodes.map((node) => {
      if (node.id === nodeId) {
        return {
          ...node,
          ...updates,
        };
      }
      return node;
    });
  }

  // 更新节点标题
  static updateNodeTitle(
    nodes: MindMapNode[],
    nodeId: string,
    title: string
  ): MindMapNode[] {
    return nodes.map((node) => {
      if (node.id === nodeId) {
        return {
          ...node,
          title,
        };
      }
      return node;
    });
  }

  // 更新节点摘要
  static updateNodeSummary(
    nodes: MindMapNode[],
    nodeId: string,
    summary: string
  ): MindMapNode[] {
    return nodes.map((node) => {
      if (node.id === nodeId) {
        return {
          ...node,
          summary,
        };
      }
      return node;
    });
  }

  // 更新节点内容
  static updateNodeContent(
    nodes: MindMapNode[],
    nodeId: string,
    content: string
  ): MindMapNode[] {
    return nodes.map((node) => {
      if (node.id === nodeId) {
        return {
          ...node,
          content,
        };
      }
      return node;
    });
  }

  // 更新节点类型
  static updateNodeType(
    nodes: MindMapNode[],
    nodeId: string,
    type: 'person' | 'event' | 'concept' | 'task' | 'other'
  ): MindMapNode[] {
    return nodes.map((node) => {
      if (node.id === nodeId) {
        return {
          ...node,
          type,
        };
      }
      return node;
    });
  }

  // 更新节点样式
  static updateNodeStyle(
    nodes: MindMapNode[],
    nodeId: string,
    style: {
      shape?: 'rectangle' | 'rounded' | 'circle' | 'cloud';
      color?: string;
    }
  ): MindMapNode[] {
    return nodes.map((node) => {
      if (node.id === nodeId) {
        return {
          ...node,
          shape: style.shape || node.shape,
          color: style.color || node.color,
        };
      }
      return node;
    });
  }

  // 批量更新节点
  static batchUpdateNodes(
    nodes: MindMapNode[],
    nodeIds: string[],
    updates: Partial<MindMapNode>
  ): MindMapNode[] {
    return nodes.map((node) => {
      if (nodeIds.includes(node.id)) {
        return {
          ...node,
          ...updates,
        };
      }
      return node;
    });
  }

  // 向节点添加子节点
  static addChild(
    nodes: MindMapNode[],
    parentId: string,
    childId: string
  ): MindMapNode[] {
    return nodes.map((node) => {
      if (node.id === parentId && !node.children.includes(childId)) {
        return {
          ...node,
          children: [...node.children, childId],
        };
      }
      return node;
    });
  }

  // 从节点移除子节点
  static removeChild(
    nodes: MindMapNode[],
    parentId: string,
    childId: string
  ): MindMapNode[] {
    return nodes.map((node) => {
      if (node.id === parentId) {
        return {
          ...node,
          children: node.children.filter((id) => id !== childId),
        };
      }
      return node;
    });
  }

  // 根据ID查找节点
  static findNode(nodes: MindMapNode[], nodeId: string): MindMapNode | undefined {
    return nodes.find((node) => node.id === nodeId);
  }

  // 查找节点的父节点
  static findParent(nodes: MindMapNode[], nodeId: string): MindMapNode | undefined {
    return nodes.find((node) => node.children.includes(nodeId));
  }

  // 获取节点在层次结构中的深度
  static getNodeDepth(nodes: MindMapNode[], nodeId: string): number {
    let depth = 0;
    let currentNodeId = nodeId;

    while (true) {
      const parent = this.findParent(nodes, currentNodeId);
      if (!parent) break;
      depth++;
      currentNodeId = parent.id;
    }

    return depth;
  }

  // 获取所有子节点
  static getDescendants(nodes: MindMapNode[], nodeId: string): MindMapNode[] {
    const descendants: MindMapNode[] = [];
    const collectDescendants = (id: string) => {
      const node = nodes.find((n) => n.id === id);
      if (node) {
        node.children.forEach((childId) => {
          const childNode = nodes.find((n) => n.id === childId);
          if (childNode) {
            descendants.push(childNode);
            collectDescendants(childId);
          }
        });
      }
    };
    collectDescendants(nodeId);
    return descendants;
  }

  // 获取节点及其所有子节点
  static getNodeWithDescendants(nodes: MindMapNode[], nodeId: string): MindMapNode[] {
    const result: MindMapNode[] = [];
    const rootNode = this.findNode(nodes, nodeId);
    if (rootNode) {
      result.push(rootNode);
      result.push(...this.getDescendants(nodes, nodeId));
    }
    return result;
  }
}
