import { MindMapNode } from '../../models/Work';

export type LayoutMode = 'mindmap' | 'tree' | 'organization' | 'fishbone';
export type LayoutDirection = 'horizontal' | 'vertical' | 'radial';

export interface LayoutOptions {
  mode: LayoutMode;
  direction: LayoutDirection;
  levelSpacing: number;
  nodeSpacing: number;
  centerX: number;
  centerY: number;
}

export class LayoutManager {
  // 应用布局到节点
  static applyLayout(
    nodes: MindMapNode[],
    options: LayoutOptions
  ): MindMapNode[] {
    switch (options.mode) {
      case 'mindmap':
        return this.applyMindMapLayout(nodes, options);
      case 'tree':
        return this.applyTreeLayout(nodes, options);
      case 'organization':
        return this.applyOrganizationLayout(nodes, options);
      case 'fishbone':
        return this.applyFishboneLayout(nodes, options);
      default:
        return this.applyMindMapLayout(nodes, options);
    }
  }

  // 应用思维导图布局
  private static applyMindMapLayout(
    nodes: MindMapNode[],
    options: LayoutOptions
  ): MindMapNode[] {
    const { centerX, centerY, levelSpacing, nodeSpacing, direction } = options;
    
    // 找到根节点（假设第一个节点是根节点）
    const rootNode = nodes[0];
    if (!rootNode) return nodes;

    // 创建节点映射以快速查找
    const nodeMap = new Map<string, MindMapNode>();
    nodes.forEach((node) => nodeMap.set(node.id, node));

    // 计算布局
    const updatedNodes = [...nodes];
    
    // 设置根节点位置
    updatedNodes[0] = {
      ...rootNode,
      x: centerX,
      y: centerY,
    };

    // 递归布局子节点
    this.layoutMindMapChildren(
      updatedNodes,
      nodeMap,
      rootNode.id,
      1,
      centerX,
      centerY,
      levelSpacing,
      nodeSpacing,
      direction
    );

    return updatedNodes;
  }

  // 递归布局思维导图子节点
  private static layoutMindMapChildren(
    nodes: MindMapNode[],
    nodeMap: Map<string, MindMapNode>,
    parentId: string,
    level: number,
    parentX: number,
    parentY: number,
    levelSpacing: number,
    nodeSpacing: number,
    direction: LayoutDirection
  ): void {
    const parentNode = nodeMap.get(parentId);
    if (!parentNode) return;

    const children = parentNode.children;
    if (children.length === 0) return;

    // 根据方向计算子节点位置
    children.forEach((childId, index) => {
      const childNode = nodeMap.get(childId);
      if (!childNode) return;

      let childX: number;
      let childY: number;

      switch (direction) {
        case 'horizontal':
          // 左右交替以产生思维导图效果
          const side = index % 2 === 0 ? 1 : -1;
          childX = parentX + side * levelSpacing * level;
          childY = parentY + (index - children.length / 2) * nodeSpacing;
          break;
        case 'vertical':
          // 上下交替
          const topBottom = index % 2 === 0 ? -1 : 1;
          childX = parentX + (index - children.length / 2) * nodeSpacing;
          childY = parentY + topBottom * levelSpacing * level;
          break;
        case 'radial':
          // 径向布局
          const angle = (index / children.length) * Math.PI * 2;
          const radius = levelSpacing * level;
          childX = parentX + Math.cos(angle) * radius;
          childY = parentY + Math.sin(angle) * radius;
          break;
        default:
          childX = parentX + levelSpacing * level;
          childY = parentY + (index - children.length / 2) * nodeSpacing;
      }

      // 更新子节点位置
      const nodeIndex = nodes.findIndex((node) => node.id === childId);
      if (nodeIndex !== -1) {
        nodes[nodeIndex] = {
          ...childNode,
          x: childX,
          y: childY,
        };

        // 递归布局孙子节点
        this.layoutMindMapChildren(
          nodes,
          nodeMap,
          childId,
          level + 1,
          childX,
          childY,
          levelSpacing,
          nodeSpacing,
          direction
        );
      }
    });
  }

  // 应用树状布局
  private static applyTreeLayout(
    nodes: MindMapNode[],
    options: LayoutOptions
  ): MindMapNode[] {
    const { centerX, centerY, levelSpacing, nodeSpacing, direction } = options;
    
    // 找到根节点
    const rootNode = nodes[0];
    if (!rootNode) return nodes;

    // 创建节点映射
    const nodeMap = new Map<string, MindMapNode>();
    nodes.forEach((node) => nodeMap.set(node.id, node));

    const updatedNodes = [...nodes];

    // 设置根节点位置
    updatedNodes[0] = {
      ...rootNode,
      x: centerX,
      y: centerY,
    };

    // 布局子节点
    this.layoutTreeChildren(
      updatedNodes,
      nodeMap,
      rootNode.id,
      1,
      centerX,
      centerY,
      levelSpacing,
      nodeSpacing,
      direction
    );

    return updatedNodes;
  }

  // 布局树状子节点
  private static layoutTreeChildren(
    nodes: MindMapNode[],
    nodeMap: Map<string, MindMapNode>,
    parentId: string,
    level: number,
    parentX: number,
    parentY: number,
    levelSpacing: number,
    nodeSpacing: number,
    direction: LayoutDirection
  ): void {
    const parentNode = nodeMap.get(parentId);
    if (!parentNode) return;

    const children = parentNode.children;
    if (children.length === 0) return;

    children.forEach((childId, index) => {
      const childNode = nodeMap.get(childId);
      if (!childNode) return;

      let childX: number;
      let childY: number;

      switch (direction) {
        case 'horizontal':
          childX = parentX + levelSpacing;
          childY = parentY + (index - children.length / 2) * nodeSpacing;
          break;
        case 'vertical':
          childX = parentX + (index - children.length / 2) * nodeSpacing;
          childY = parentY + levelSpacing;
          break;
        case 'radial':
          const angle = (index / children.length) * Math.PI * 2;
          const radius = levelSpacing * level;
          childX = parentX + Math.cos(angle) * radius;
          childY = parentY + Math.sin(angle) * radius;
          break;
        default:
          childX = parentX + levelSpacing;
          childY = parentY + (index - children.length / 2) * nodeSpacing;
      }

      const nodeIndex = nodes.findIndex((node) => node.id === childId);
      if (nodeIndex !== -1) {
        nodes[nodeIndex] = {
          ...childNode,
          x: childX,
          y: childY,
        };

        this.layoutTreeChildren(
          nodes,
          nodeMap,
          childId,
          level + 1,
          childX,
          childY,
          levelSpacing,
          nodeSpacing,
          direction
        );
      }
    });
  }

  // 应用组织结构图布局
  private static applyOrganizationLayout(
    nodes: MindMapNode[],
    options: LayoutOptions
  ): MindMapNode[] {
    const { centerX, centerY, levelSpacing, nodeSpacing } = options;
    
    // 找到根节点
    const rootNode = nodes[0];
    if (!rootNode) return nodes;

    const nodeMap = new Map<string, MindMapNode>();
    nodes.forEach((node) => nodeMap.set(node.id, node));

    const updatedNodes = [...nodes];

    // 设置根节点位置
    updatedNodes[0] = {
      ...rootNode,
      x: centerX,
      y: centerY,
    };

    // 以层次结构布局子节点
    this.layoutOrganizationChildren(
      updatedNodes,
      nodeMap,
      rootNode.id,
      1,
      centerX,
      centerY,
      levelSpacing,
      nodeSpacing
    );

    return updatedNodes;
  }

  // 布局组织结构图子节点
  private static layoutOrganizationChildren(
    nodes: MindMapNode[],
    nodeMap: Map<string, MindMapNode>,
    parentId: string,
    level: number,
    parentX: number,
    parentY: number,
    levelSpacing: number,
    nodeSpacing: number
  ): void {
    const parentNode = nodeMap.get(parentId);
    if (!parentNode) return;

    const children = parentNode.children;
    if (children.length === 0) return;

    // 计算子节点所需的总宽度
    const totalWidth = children.length * nodeSpacing;
    const startX = parentX - (totalWidth / 2) + (nodeSpacing / 2);

    children.forEach((childId, index) => {
      const childNode = nodeMap.get(childId);
      if (!childNode) return;

      const childX = startX + index * nodeSpacing;
      const childY = parentY + levelSpacing;

      const nodeIndex = nodes.findIndex((node) => node.id === childId);
      if (nodeIndex !== -1) {
        nodes[nodeIndex] = {
          ...childNode,
          x: childX,
          y: childY,
        };

        this.layoutOrganizationChildren(
          nodes,
          nodeMap,
          childId,
          level + 1,
          childX,
          childY,
          levelSpacing,
          nodeSpacing
        );
      }
    });
  }

  // 应用鱼骨图布局
  private static applyFishboneLayout(
    nodes: MindMapNode[],
    options: LayoutOptions
  ): MindMapNode[] {
    const { centerX, centerY, levelSpacing, nodeSpacing } = options;
    
    // 找到根节点
    const rootNode = nodes[0];
    if (!rootNode) return nodes;

    const nodeMap = new Map<string, MindMapNode>();
    nodes.forEach((node) => nodeMap.set(node.id, node));

    const updatedNodes = [...nodes];

    // 设置根节点位置（主骨）
    updatedNodes[0] = {
      ...rootNode,
      x: centerX,
      y: centerY,
    };

    // 将子节点布局为鱼骨分支
    const children = rootNode.children;
    children.forEach((childId, index) => {
      const childNode = nodeMap.get(childId);
      if (!childNode) return;

      // 左右交替分支
      const side = index % 2 === 0 ? -1 : 1;
      const branchX = centerX + side * levelSpacing;
      const branchY = centerY + (index - children.length / 2) * nodeSpacing;

      const nodeIndex = nodes.findIndex((node) => node.id === childId);
      if (nodeIndex !== -1) {
        updatedNodes[nodeIndex] = {
          ...childNode,
          x: branchX,
          y: branchY,
        };

        // 将孙子节点布局为子分支
        this.layoutFishboneSubBranches(
          updatedNodes,
          nodeMap,
          childId,
          branchX,
          branchY,
          side,
          levelSpacing,
          nodeSpacing
        );
      }
    });

    return updatedNodes;
  }

  // 布局鱼骨图子分支
  private static layoutFishboneSubBranches(
    nodes: MindMapNode[],
    nodeMap: Map<string, MindMapNode>,
    parentId: string,
    parentX: number,
    parentY: number,
    side: number,
    levelSpacing: number,
    nodeSpacing: number
  ): void {
    const parentNode = nodeMap.get(parentId);
    if (!parentNode) return;

    const children = parentNode.children;
    children.forEach((childId, index) => {
      const childNode = nodeMap.get(childId);
      if (!childNode) return;

      const subBranchX = parentX + side * levelSpacing;
      const subBranchY = parentY + (index - children.length / 2) * nodeSpacing;

      const nodeIndex = nodes.findIndex((node) => node.id === childId);
      if (nodeIndex !== -1) {
        nodes[nodeIndex] = {
          ...childNode,
          x: subBranchX,
          y: subBranchY,
        };
      }
    });
  }

  // 计算最佳布局参数
  static calculateOptimalLayout(
    nodes: MindMapNode[],
    containerWidth: number,
    containerHeight: number
  ): {
    levelSpacing: number;
    nodeSpacing: number;
    centerX: number;
    centerY: number;
  } {
    const totalNodes = nodes.length;
    const maxDepth = this.calculateMaxDepth(nodes);

    // 计算最佳间距
    const levelSpacing = Math.min(150, containerWidth / (maxDepth + 1));
    const nodeSpacing = Math.min(80, containerHeight / (totalNodes / maxDepth + 1));

    return {
      levelSpacing,
      nodeSpacing,
      centerX: containerWidth / 2,
      centerY: containerHeight / 2,
    };
  }

  // 计算树的最大深度
  private static calculateMaxDepth(nodes: MindMapNode[]): number {
    const nodeMap = new Map<string, MindMapNode>();
    nodes.forEach((node) => nodeMap.set(node.id, node));

    const calculateDepth = (nodeId: string): number => {
      const node = nodeMap.get(nodeId);
      if (!node || node.children.length === 0) {
        return 1;
      }

      const childDepths = node.children.map((childId) => calculateDepth(childId));
      return 1 + Math.max(...childDepths);
    };

    if (nodes.length === 0) return 0;
    return calculateDepth(nodes[0].id);
  }
}
