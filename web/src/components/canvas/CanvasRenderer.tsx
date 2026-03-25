import React, { useRef, useEffect, useState } from 'react';
import { MindMapNode } from '../../models/Work';
import { useTheme } from '../../context/ThemeContext';

interface CanvasRendererProps {
  nodes: MindMapNode[];
  zoom: number;
  pan: { x: number; y: number };
  onPanChange: (pan: { x: number; y: number }) => void;
  selectedNode: string | null;
  onCanvasClick: () => void;
  onNodeSelect: (nodeId: string) => void;
  expandedNodes: Set<string>;
  onNodeExpand: (nodeId: string, expand?: boolean) => void;
  onNodeMove: (nodeId: string, x: number, y: number) => void;
  onNodeMenu: (nodeId: string, x: number, y: number) => void;
  hiddenLevels: Set<number>;
  onBubbleInfoChange: (bubbleInfo: { nodeId: string; position: { x: number; y: number }; direction: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'; showContent: boolean } | null) => void;
  bubbleInfo: { nodeId: string; position: { x: number; y: number }; direction: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'; showContent: boolean } | null;
  showGrid?: boolean;
  showAnimation?: boolean;
  readOnly?: boolean;
  onNodeFocus?: (nodeId: string) => void;
  focusState?: {
    focusedNode: string | null;
    isFocusMode: boolean;
    focusAnimationProgress: number;
  };
  parentMap?: Map<string, string>; // 子节点 ID 到父节点 ID 的映射表
  onFocusContentCardPosition?: (position: { x: number; y: number; width: number; height: number } | null) => void;
}

export const CanvasRenderer: React.FC<CanvasRendererProps> = ({
  nodes,
  zoom,
  pan,
  onPanChange,
  selectedNode,
  onCanvasClick,
  onNodeSelect,
  expandedNodes,
  onNodeExpand,
  onNodeMove,
  onNodeMenu,
  hiddenLevels,
  onBubbleInfoChange,
  bubbleInfo,
  showGrid = true,
  showAnimation = false,
  readOnly = false,
  onNodeFocus,
  focusState,
  parentMap,
  onFocusContentCardPosition,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const webglCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isWebGLAvailable, setIsWebGLAvailable] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isNodeDragging, setIsNodeDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const rafRef = useRef<number | null>(null);
  const animationRafRef = useRef<number | null>(null);
  const animationTimeRef = useRef(0);
  // 使用 refs 进行实时位置跟踪，避免 React 状态延迟
  const draggedNodePositionRef = useRef<{ x: number; y: number } | null>(null);
  const isNodeDraggingRef = useRef(false);
  const draggedNodeRef = useRef<string | null>(null);
  const { theme } = useTheme();
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 监听主题变化
  useEffect(() => {
    if (theme === 'auto') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(isDark);
    } else {
      setIsDarkMode(theme === 'dark');
    }
  }, [theme]);

  // 检查 WebGL 可用性
  useEffect(() => {
    const checkWebGL = () => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        setIsWebGLAvailable(!!gl);
      } catch (e) {
        setIsWebGLAvailable(false);
      }
    };
    checkWebGL();
  }, []);

  // 如果 WebGL 可用则初始化
  useEffect(() => {
    if (isWebGLAvailable && webglCanvasRef.current) {
      const canvas = webglCanvasRef.current;
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        // WebGL initialization code here
        const webgl = gl as WebGLRenderingContext;
        webgl.clearColor(0, 0, 0, 0);
        webgl.clear(webgl.COLOR_BUFFER_BIT);
      }
    }
  }, [isWebGLAvailable]);

  // 获取与聚焦节点相关的所有节点（只包括直接关系）
  const getRelatedNodesSet = (focusedNodeId: string): Set<string> => {
    const relatedNodes = new Set<string>();
    relatedNodes.add(focusedNodeId);

    const parentId = parentMap?.get(focusedNodeId);
    if (parentId) {
      relatedNodes.add(parentId);
    }

    const node = nodes.find(n => n.id === focusedNodeId);
    if (node && node.children) {
      for (const childId of node.children) {
        relatedNodes.add(childId);
      }
    }

    return relatedNodes;
  };

  // 计算节点在聚焦模式下的位置（考虑卡片位置和避免重叠）
  const getFocusNodePosition = (
    nodeId: string, 
    relatedNodes: Set<string>, 
    focusState: any,
    cardPosition?: { x: number; y: number; width: number; height: number } | null
  ) => {
    if (!focusState?.isFocusMode || !focusState.focusedNode) {
      const node = nodes.find(n => n.id === nodeId);
      return { x: node?.x || 0, y: node?.y || 0 };
    }

    if (nodeId === focusState.focusedNode) {
      return { x: 0, y: 0 };
    }

    const focusedNode = nodes.find(n => n.id === focusState.focusedNode);
    const canvas = canvasRef.current;
    if (!canvas || !focusedNode) return { x: 0, y: 0 };
    
    const canvasWidth = canvas.width / zoom;
    const canvasHeight = canvas.height / zoom;
    const padding = 15;
    
    const relatedNodeIds = Array.from(relatedNodes).filter(id => id !== focusState.focusedNode);
    const nodeIndex = relatedNodeIds.indexOf(nodeId);
    
    if (nodeIndex === -1) return { x: 0, y: 0 };

    const nodeCount = relatedNodeIds.length;
    
    let x, y, radius;
    
    if (nodeCount === 1) {
      // 只有一个节点，放在左侧与卡片对称
      x = -canvasWidth / 4;
      y = 0;
    } else if (nodeCount === 2) {
      // 两个节点，左侧上下分布
      if (nodeIndex === 0) {
        x = -canvasWidth / 3;
        y = -canvasHeight / 6;
      } else {
        x = -canvasWidth / 3;
        y = canvasHeight / 6;
      }
    } else if (nodeCount === 3) {
      // 三个节点，左侧和上方分布
      const angles = [Math.PI, Math.PI * 0.75, Math.PI * 1.25]; // 左、左上、左下
      radius = Math.min(canvasWidth, canvasHeight) / 3;
      x = Math.cos(angles[nodeIndex]) * radius;
      y = Math.sin(angles[nodeIndex]) * radius;
    } else {
      // 多个节点，使用扇形布局（避开右侧卡片区域）
      // 角度范围：从 30° (右上) 到 210° (左下)，即避开右侧 60° 扇形
      const startAngle = Math.PI / 6; // 30°
      const endAngle = Math.PI * 1.166; // 210°
      const angleRange = endAngle - startAngle;
      
      const angle = startAngle + (nodeIndex / (nodeCount - 1)) * angleRange;
      radius = Math.min(canvasWidth, canvasHeight) / 3;
      
      x = Math.cos(angle) * radius;
      y = Math.sin(angle) * radius;
    }

    // 检测与卡片的碰撞，如果重叠则向外移动
    if (cardPosition) {
      const nodeSize = 60; // 节点半宽
      const nodeHeight = 40; // 节点半高
      
      // 检查是否与卡片重叠
      const overlapX = Math.abs(x - cardPosition.x) < (nodeSize + cardPosition.width / 2);
      const overlapY = Math.abs(y - cardPosition.y) < (nodeHeight + cardPosition.height / 2);
      
      if (overlapX && overlapY) {
        // 计算从卡片中心到节点的方向
        const dx = x - cardPosition.x;
        const dy = y - cardPosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
          // 沿远离卡片的方向移动
          const minDistance = Math.max(cardPosition.width, cardPosition.height) / 2 + Math.max(nodeSize, nodeHeight) + 20;
          const scale = minDistance / distance;
          x = cardPosition.x + dx * scale;
          y = cardPosition.y + dy * scale;
        }
      }
    }

    // 确保节点不超出屏幕
    x = Math.max(-canvasWidth / 2 + padding, Math.min(canvasWidth / 2 - padding, x));
    y = Math.max(-canvasHeight / 2 + padding, Math.min(canvasHeight / 2 - padding, y));

    return { x, y };
  };

  // 计算内容卡片在聚焦模式下的位置（固定右侧，根据内容动态调整高度）
  const getContentCardPosition = (_relatedNodes: Set<string>, focusState: any) => {
    if (!focusState?.isFocusMode || !focusState.focusedNode) {
      return null;
    }

    const focusedNode = nodes.find(n => n.id === focusState.focusedNode);
    const canvas = canvasRef.current;
    if (!canvas || !focusedNode) return null;
    
    const canvasWidth = canvas.width / zoom;
    const canvasHeight = canvas.height / zoom;
    const padding = 15;
    
    // 计算卡片尺寸
    const sizeFactor = (focusedNode.size || 100) / 100;
    const cardWidth = Math.max(120 * sizeFactor, 280);
    
    // 固定放在右侧，确保与右边缘有15px距离
    // x坐标 = (画布宽度/2 - 卡片宽度/2 - 边距)
    const x = canvasWidth / 2 - cardWidth / 2 - padding;
    let y = 0;
    
    // 根据实际内容行数计算高度
    const content = focusedNode.content || '';
    const title = focusedNode.title || '';
    
    // 计算标题行数（标题通常较短，一行或两行）
    const titleLines = title.length > 0 ? Math.ceil(title.length / 25) : 0;
    
    // 计算内容行数
    const contentLines = content.split('\n').reduce((total, line) => {
      // 每行根据长度计算需要的行数（假设每行约35个字符）
      const lineCount = Math.ceil(line.length / 35);
      return total + Math.max(1, lineCount);
    }, 0);
    
    // 空行也占一行
    const emptyLines = (content.match(/\n\n/g) || []).length;
    
    // 总高度 = 标题区域 + 内容区域 + 内边距
    // 标题：每行20px，内容：每行18px，内边距：上下各16px，标题和内容间距：8px
    const cardHeight = Math.max(100, Math.min(
      titleLines * 22 + contentLines * 20 + emptyLines * 10 + 60,
      canvasHeight * 0.7
    ));
    
    // 确保卡片不超出画布上下边界
    const halfHeight = cardHeight / 2;
    y = Math.max(-canvasHeight / 2 + halfHeight + padding, 
                 Math.min(canvasHeight / 2 - halfHeight - padding, y));

    return { x, y, width: cardWidth, height: cardHeight };
  };

  // 获取在聚焦模式下应该检查的节点列表
  const getNodesToCheck = () => {
    if (!focusState?.isFocusMode || !focusState.focusedNode) {
      return nodes;
    }
    const relatedNodes = getRelatedNodesSet(focusState.focusedNode);
    return nodes.filter(node => relatedNodes.has(node.id));
  };

  // 使用 Canvas 2D 绘制
  const drawWithCanvas2D = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 获取与聚焦节点相关的所有节点（只包括直接关系）
    const getRelatedNodes = (focusedNodeId: string): Set<string> => {
      return getRelatedNodesSet(focusedNodeId);
    };

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 应用变换
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // 绘制网格（如果启用）
    if (showGrid) {
      ctx.strokeStyle = isDarkMode ? '#333333' : '#e0e0e0';
      ctx.lineWidth = 1;
      const gridSize = 50;
      
      const extendedRange = 100;
      const totalGridLines = extendedRange * 2;
      
      const panGridX = pan.x / zoom;
      const panGridY = pan.y / zoom;
      
      const centerX = panGridX;
      const centerY = panGridY;
      
      const gridStartX = centerX - (gridSize * totalGridLines);
      const gridEndX = centerX + (gridSize * totalGridLines);
      const gridStartY = centerY - (gridSize * totalGridLines);
      const gridEndY = centerY + (gridSize * totalGridLines);
      
      for (let x = Math.floor(gridStartX / gridSize) * gridSize; x <= gridEndX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, gridStartY);
        ctx.lineTo(x, gridEndY);
        ctx.stroke();
      }
      
      for (let y = Math.floor(gridStartY / gridSize) * gridSize; y <= gridEndY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(gridStartX, y);
        ctx.lineTo(gridEndX, y);
        ctx.stroke();
      }
    }

    // 聚焦模式相关节点集合
    const relatedNodes = focusState?.isFocusMode && focusState.focusedNode 
      ? getRelatedNodes(focusState.focusedNode)
      : new Set<string>();

    // 计算内容卡片位置（固定右侧）
    const contentCardPos = focusState?.isFocusMode && focusState.focusedNode
      ? getContentCardPosition(relatedNodes, focusState)
      : null;

    // 为聚焦模式准备节点布局数据
    const focusLayout = focusState?.isFocusMode ? {
      focusedNode: nodes.find(n => n.id === focusState.focusedNode),
      relatedNodes: Array.from(relatedNodes).filter(id => id !== focusState.focusedNode),
      canvasWidth: canvas.width / zoom,
      canvasHeight: canvas.height / zoom,
      padding: 15,
      contentCardPos,
    } : null;

    // 计算节点在聚焦模式下的位置（考虑卡片位置，避开右侧）
    const getFocusNodePosition = (nodeId: string) => {
      if (!focusLayout || !focusLayout.focusedNode) return { x: nodes.find(n => n.id === nodeId)?.x || 0, y: nodes.find(n => n.id === nodeId)?.y || 0 };

      if (nodeId === focusLayout.focusedNode.id) {
        // 聚焦节点在中心
        return { x: 0, y: 0 };
      }

      const nodeIndex = focusLayout.relatedNodes.indexOf(nodeId);
      if (nodeIndex === -1) return { x: 0, y: 0 };

      const { canvasWidth, canvasHeight, padding, contentCardPos } = focusLayout;
      const nodeCount = focusLayout.relatedNodes.length;

      let x, y;

      // 卡片占据的右侧区域
      const cardX = contentCardPos ? contentCardPos.x : canvasWidth / 3;
      const cardWidth = contentCardPos ? contentCardPos.width : 250;
      const cardHeight = contentCardPos ? contentCardPos.height : 150;
      const cardLeftEdge = cardX - cardWidth / 2 - 20; // 左边缘 + 间距
      
      if (nodeCount === 1) {
        // 1个相关节点：放在左侧
        x = -canvasWidth / 4;
        y = 0;
      } else if (nodeCount === 2) {
        // 2个相关节点：左侧上下分布
        if (nodeIndex === 0) {
          x = -canvasWidth / 3;
          y = -canvasHeight / 6;
        } else {
          x = -canvasWidth / 3;
          y = canvasHeight / 6;
        }
      } else if (nodeCount === 3) {
        // 3个相关节点：左侧和上方分布
        const angles = [Math.PI, Math.PI * 0.75, Math.PI * 1.25];
        const radius = Math.min(canvasWidth, canvasHeight) / 3;
        x = Math.cos(angles[nodeIndex]) * radius;
        y = Math.sin(angles[nodeIndex]) * radius;
      } else {
        // 多个相关节点：扇形布局（避开右侧卡片区域）
        // 角度范围：从 30° (右上) 到 210° (左下)，避开右侧 60° 扇形
        const startAngle = Math.PI / 6; // 30°
        const endAngle = Math.PI * 1.166; // 210°
        const angleRange = endAngle - startAngle;
        
        const angle = startAngle + (nodeIndex / (nodeCount - 1)) * angleRange;
        const radius = Math.min(canvasWidth, canvasHeight) / 3;
        x = Math.cos(angle) * radius;
        y = Math.sin(angle) * radius;
      }

      // 检测与卡片的碰撞，如果重叠则向外移动
      if (contentCardPos) {
        const nodeSize = 60; // 节点半宽
        const nodeHeight = 40; // 节点半高
        
        // 检查是否与卡片重叠
        const overlapX = x > cardLeftEdge - nodeSize;
        const overlapY = Math.abs(y - contentCardPos.y) < (nodeHeight + cardHeight / 2);
        
        if (overlapX && overlapY) {
          // 向左移动，避开卡片
          x = cardLeftEdge - nodeSize;
        }
      }

      // 确保节点不超出屏幕
      x = Math.max(-canvasWidth / 2 + padding, Math.min(canvasWidth / 2 - padding, x));
      y = Math.max(-canvasHeight / 2 + padding, Math.min(canvasHeight / 2 - padding, y));

      return { x, y };
    };

    // 只为展开的节点和可见子节点绘制连接
    nodes.forEach((node) => {
      const isExpanded = expandedNodes.has(node.id);
      if (isExpanded) {
        node.children.forEach((childId) => {
          const child = nodes.find((n) => n.id === childId);
          if (child && !hiddenLevels.has(child.level || 0)) {
            // 聚焦模式下，只绘制与聚焦节点相关的连接
            if (focusState?.isFocusMode) {
              const isRelated = relatedNodes.has(node.id) && relatedNodes.has(childId);
              if (!isRelated) {
                return; // 跳过非相关连接
              }
            }
            
            // 获取节点位置
            let parentX = node.x;
            let parentY = node.y;
            let childX = child.x;
            let childY = child.y;
            
            // 聚焦模式下调整位置
            if (focusState?.isFocusMode) {
              const parentPos = getFocusNodePosition(node.id);
              const childPos = getFocusNodePosition(childId);
              parentX = parentPos.x;
              parentY = parentPos.y;
              childX = childPos.x;
              childY = childPos.y;
            }
            
            // 拖拽时的位置调整
            if (isNodeDragging || isNodeDraggingRef.current) {
              if ((draggedNode === node.id || draggedNodeRef.current === node.id) && draggedNodePositionRef.current) {
                parentX = draggedNodePositionRef.current.x;
                parentY = draggedNodePositionRef.current.y;
              }
              if ((draggedNode === child.id || draggedNodeRef.current === child.id) && draggedNodePositionRef.current) {
                childX = draggedNodePositionRef.current.x;
                childY = draggedNodePositionRef.current.y;
              }
            }
            
            // 绘制连接线
            if (showAnimation) {
              const connectionHash = (node.id + child.id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
              const waveOffset = connectionHash * 0.1;
              const waveAmplitude = 8;
              const waveFrequency = 0.5;
              
              const midX = (parentX + childX) / 2;
              const midY = (parentY + childY) / 2 - 50;
              const animatedMidY = midY + Math.sin(animationTimeRef.current * waveFrequency + waveOffset) * waveAmplitude;
              
              ctx.strokeStyle = node.color;
              ctx.lineWidth = 3;
              
              // 聚焦模式下，为连接线添加不透明度
              if (focusState?.isFocusMode) {
                const isFocusedConnection = (node.id === focusState.focusedNode || child.id === focusState.focusedNode);
                if (!isFocusedConnection) {
                  ctx.globalAlpha = 0.5; // 非聚焦连接50%透明度
                }
              }
              
              if (child.connectionType === 'dashed') {
                ctx.setLineDash([5, 5]);
              } else {
                ctx.setLineDash([]);
              }
              
              ctx.beginPath();
              if (child.connectionType === 'straight') {
                ctx.moveTo(parentX, parentY);
                ctx.lineTo(childX, childY);
              } else if (child.connectionType === 'wavy') {
                const dx = childX - parentX;
                const dy = childY - parentY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const waveCount = Math.max(3, Math.floor(distance / 50));
                const waveHeight = 15;
                
                ctx.moveTo(parentX, parentY);
                
                for (let i = 0; i < waveCount; i++) {
                  const t1 = (i + 0.25) / waveCount;
                  const t2 = (i + 0.75) / waveCount;
                  const t3 = (i + 1) / waveCount;
                  
                  const x1 = parentX + dx * t1;
                  const y1 = parentY + dy * t1 + (i % 2 === 0 ? -waveHeight : waveHeight) + Math.sin(animationTimeRef.current * waveFrequency + waveOffset + i) * 3;
                  
                  const x2 = parentX + dx * t2;
                  const y2 = parentY + dy * t2 + (i % 2 === 0 ? waveHeight : -waveHeight) + Math.sin(animationTimeRef.current * waveFrequency + waveOffset + i + 1) * 3;
                  
                  const x3 = parentX + dx * t3;
                  const y3 = parentY + dy * t3 + (i % 2 === 0 ? waveHeight : -waveHeight) + Math.sin(animationTimeRef.current * waveFrequency + waveOffset + i + 2) * 3;
                  
                  ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3);
                }
              } else {
                ctx.moveTo(parentX, parentY);
                ctx.quadraticCurveTo(midX, animatedMidY, childX, childY);
              }
              ctx.stroke();
              ctx.setLineDash([]);
              
              // 恢复透明度
              if (focusState?.isFocusMode) {
                ctx.globalAlpha = 1;
              }
            } else {
              ctx.strokeStyle = node.color;
              ctx.lineWidth = 3;
              
              // 聚焦模式下，为连接线添加不透明度
              if (focusState?.isFocusMode) {
                const isFocusedConnection = (node.id === focusState.focusedNode || child.id === focusState.focusedNode);
                if (!isFocusedConnection) {
                  ctx.globalAlpha = 0.5; // 非聚焦连接50%透明度
                }
              }
              
              if (child.connectionType === 'dashed') {
                ctx.setLineDash([5, 5]);
              } else {
                ctx.setLineDash([]);
              }
              
              ctx.beginPath();
              if (child.connectionType === 'straight') {
                ctx.moveTo(parentX, parentY);
                ctx.lineTo(childX, childY);
              } else if (child.connectionType === 'wavy') {
                const dx = childX - parentX;
                const dy = childY - parentY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const waveCount = Math.max(3, Math.floor(distance / 50));
                const waveHeight = 15;
                
                ctx.moveTo(parentX, parentY);
                
                for (let i = 0; i < waveCount; i++) {
                  const t1 = (i + 0.25) / waveCount;
                  const t2 = (i + 0.75) / waveCount;
                  const t3 = (i + 1) / waveCount;
                  
                  const x1 = parentX + dx * t1;
                  const y1 = parentY + dy * t1 + (i % 2 === 0 ? -waveHeight : waveHeight);
                  
                  const x2 = parentX + dx * t2;
                  const y2 = parentY + dy * t2 + (i % 2 === 0 ? waveHeight : -waveHeight);
                  
                  const x3 = parentX + dx * t3;
                  const y3 = parentY + dy * t3 + (i % 2 === 0 ? waveHeight : -waveHeight);
                  
                  ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3);
                }
              } else {
                ctx.moveTo(parentX, parentY);
                ctx.quadraticCurveTo(
                  (parentX + childX) / 2,
                  (parentY + childY) / 2 - 50,
                  childX,
                  childY
                );
              }
              ctx.stroke();
              ctx.setLineDash([]);
              
              // 恢复透明度
              if (focusState?.isFocusMode) {
                ctx.globalAlpha = 1;
              }
            }
          }
        });
      }
    });

    // 绘制内容卡片和聚焦节点之间的连接线
    if (focusState?.isFocusMode && focusState.focusedNode) {
      const contentCardPos = getContentCardPosition(relatedNodes, focusState);
      if (contentCardPos) {
        const focusedNode = nodes.find(n => n.id === focusState.focusedNode);
        if (focusedNode) {
          ctx.strokeStyle = focusedNode.color;
          ctx.lineWidth = 3;
          ctx.globalAlpha = 0.75;
          
          const focusNodeX = 0;
          const focusNodeY = 0;
          const contentCardCenterX = contentCardPos.x;
          const contentCardCenterY = contentCardPos.y;
          const cardWidth = contentCardPos.width;
          const cardHeight = contentCardPos.height;
          
          // 计算卡片边缘的连接点（而不是中心）
          let contentCardEdgeX = contentCardCenterX;
          let contentCardEdgeY = contentCardCenterY;
          
          // 根据卡片相对于聚焦节点的位置，确定连接到哪条边
          const dx = contentCardCenterX - focusNodeX;
          const dy = contentCardCenterY - focusNodeY;
          
          if (Math.abs(dx) > Math.abs(dy)) {
            // 卡片主要在水平方向，连接到左边缘或右边缘
            if (dx > 0) {
              // 卡片在右侧，连接到左边缘
              contentCardEdgeX = contentCardCenterX - cardWidth / 2;
            } else {
              // 卡片在左侧，连接到右边缘
              contentCardEdgeX = contentCardCenterX + cardWidth / 2;
            }
          } else {
            // 卡片主要在垂直方向，连接到上边缘或下边缘
            if (dy > 0) {
              // 卡片在下方，连接到上边缘
              contentCardEdgeY = contentCardCenterY - cardHeight / 2;
            } else {
              // 卡片在上方，连接到下边缘
              contentCardEdgeY = contentCardCenterY + cardHeight / 2;
            }
          }
          
          ctx.beginPath();
          ctx.moveTo(focusNodeX, focusNodeY);
          ctx.quadraticCurveTo(
            (focusNodeX + contentCardEdgeX) / 2,
            (focusNodeY + contentCardEdgeY) / 2 - 50,
            contentCardEdgeX,
            contentCardEdgeY
          );
          ctx.stroke();
          
          ctx.globalAlpha = 1;
        }
      }
    }

  // 绘制节点
  nodes.forEach((node) => {
    if (isNodeDragging && draggedNode === node.id) return;
    
    if (node.id !== 'root' && hiddenLevels.has(node.level || 0)) return;
    
    if (node.id !== 'root') {
      let parentExpanded = false;
      for (const potentialParent of nodes) {
        if (potentialParent.children.includes(node.id)) {
          parentExpanded = expandedNodes.has(potentialParent.id);
          break;
        }
      }
      if (!parentExpanded) return;
    }
    
    const isSelected = selectedNode === node.id;
    const isExpanded = expandedNodes.has(node.id);
    const isFocused = focusState?.focusedNode === node.id;
    const isFocusRelated = focusState?.isFocusMode ? relatedNodes.has(node.id) : false;
    
    // 聚焦模式下，只显示与聚焦节点相关的节点
    if (focusState?.isFocusMode && !isFocusRelated) {
      return; // 跳过非相关节点
    }
    
    // 获取节点位置
    let drawX = node.x;
    let drawY = node.y;
    
    // 聚焦模式下调整位置
    if (focusState?.isFocusMode && isFocusRelated) {
      const pos = getFocusNodePosition(node.id);
      drawX = pos.x;
      drawY = pos.y;
    }
    
    // 动画效果
    if (showAnimation) {
      const nodeHash = node.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const nodeOffset = nodeHash * 0.2;
      const nodeWaveAmplitude = 3;
      drawY += Math.sin(animationTimeRef.current * 0.7 + nodeOffset) * nodeWaveAmplitude;
    }

    // 聚焦模式下的特殊处理
    if (focusState?.isFocusMode) {
      if (isFocused) {
        // 聚焦节点：放大、但保持原始颜色
        // 固定缩放比例为 1.2，避免在动画时继续放大
        const scale = 1.2;
        ctx.fillStyle = node.color; // 使用原始颜色，不增加亮度
        ctx.strokeStyle = '#1E40AF'; // 改为深蓝色，与编辑时的选中边框颜色一致
        ctx.lineWidth = 3;
        
        // 绘制放大的节点
        const sizeFactor = (node.size || 100) / 100;
        const width = 120 * sizeFactor * scale;
        const halfWidth = width / 2;
        
        switch (node.shape) {
          case 'rectangle':
            ctx.fillRect(drawX - halfWidth, drawY - 25 * scale, width, 50 * scale);
            ctx.strokeRect(drawX - halfWidth, drawY - 25 * scale, width, 50 * scale);
            break;
          case 'rounded':
            ctx.beginPath();
            roundRect(ctx, drawX - halfWidth, drawY - 25 * scale, width, 50 * scale, 12 * scale);
            ctx.fill();
            ctx.stroke();
            break;
          case 'circle':
            ctx.beginPath();
            const radiusX = halfWidth;
            const radiusY = 40 * scale;
            ctx.ellipse(drawX, drawY, radiusX, radiusY, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            break;
          case 'diamond':
            ctx.beginPath();
            ctx.moveTo(drawX, drawY - 40 * scale);
            ctx.lineTo(drawX + halfWidth, drawY);
            ctx.lineTo(drawX, drawY + 40 * scale);
            ctx.lineTo(drawX - halfWidth, drawY);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        }
        
        // 绘制节点文本（支持换行）
        ctx.fillStyle = '#FFFFFF';
        let fontWeight = node.fontWeight || 'normal';
        let fontStyle = node.fontStyle || 'normal';
        let fontSize = (node.fontSize || 14) * scale;
        ctx.font = `${fontWeight} ${fontStyle} ${fontSize}px -apple-system, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // 计算最大文本宽度（节点宽度减去边距）
        const nodeWidth = 120 * sizeFactor * scale;
        const maxTextWidth = nodeWidth - 20; // 左右各留10px边距
        const lineHeight = fontSize * 1.2;
        
        drawWrappedText(ctx, node.title, drawX, drawY, maxTextWidth, lineHeight);
        
        if (node.textDecoration === 'underline') {
          const textMetrics = ctx.measureText(node.title);
          const textWidth = Math.min(textMetrics.width, maxTextWidth);
          ctx.beginPath();
          ctx.moveTo(drawX - textWidth / 2, drawY + fontSize / 2);
          ctx.lineTo(drawX + textWidth / 2, drawY + fontSize / 2);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      } else if (isFocusRelated) {
        // 相关节点：虚化
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = node.color;
        ctx.strokeStyle = isSelected ? '#1E40AF' : node.color;
        ctx.lineWidth = isSelected ? 3 : 1;
        
        // 绘制虚化的节点
        const sizeFactor = (node.size || 100) / 100;
        const width = 120 * sizeFactor;
        const halfWidth = width / 2;

        switch (node.shape) {
          case 'rectangle':
            ctx.fillRect(drawX - halfWidth, drawY - 25, width, 50);
            ctx.strokeRect(drawX - halfWidth, drawY - 25, width, 50);
            break;
          case 'rounded':
            ctx.beginPath();
            roundRect(ctx, drawX - halfWidth, drawY - 25, width, 50, 12);
            ctx.fill();
            ctx.stroke();
            break;
          case 'circle':
              ctx.beginPath();
              const radiusX = halfWidth;
              const radiusY = 40;
              ctx.ellipse(drawX, drawY, radiusX, radiusY, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
              break;
            case 'diamond':
              ctx.beginPath();
              ctx.moveTo(drawX, drawY - 40);
              ctx.lineTo(drawX + halfWidth, drawY);
              ctx.lineTo(drawX, drawY + 40);
              ctx.lineTo(drawX - halfWidth, drawY);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
              break;
        }

        if (!readOnly && node.children.length > 0) {
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const sizeFactor = (node.size || 100) / 100;
          const halfWidth = 60 * sizeFactor;
          const indicatorX = drawX + halfWidth - 10;
          ctx.fillText(isExpanded ? '▼' : '►', indicatorX, drawY);
        }

        // 绘制节点文本（支持换行）
        ctx.fillStyle = '#FFFFFF';
        let fontWeight = node.fontWeight || 'normal';
        let fontStyle = node.fontStyle || 'normal';
        let fontSize = node.fontSize || 14;
        ctx.font = `${fontWeight} ${fontStyle} ${fontSize}px -apple-system, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // 计算最大文本宽度（节点宽度减去边距）
        const relatedSizeFactor = (node.size || 100) / 100;
        const relatedNodeWidth = 120 * relatedSizeFactor;
        const maxTextWidth = relatedNodeWidth - 20; // 左右各留10px边距
        const lineHeight = fontSize * 1.2;
        
        drawWrappedText(ctx, node.title, drawX, drawY, maxTextWidth, lineHeight);
        
        if (node.textDecoration === 'underline') {
          const textMetrics = ctx.measureText(node.title);
          const textWidth = Math.min(textMetrics.width, maxTextWidth);
          ctx.beginPath();
          ctx.moveTo(drawX - textWidth / 2, drawY + fontSize / 2);
          ctx.lineTo(drawX + textWidth / 2, drawY + fontSize / 2);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        
        ctx.globalAlpha = 1; // 恢复透明度
      }
    } else {
      // 正常模式下的绘制
      ctx.fillStyle = node.color;
      ctx.strokeStyle = isSelected ? '#1E40AF' : node.color;
      ctx.lineWidth = isSelected ? 3 : 1;

      const sizeFactor = (node.size || 100) / 100;
      const width = 120 * sizeFactor;
      const halfWidth = width / 2;

      switch (node.shape) {
        case 'rectangle':
          ctx.fillRect(drawX - halfWidth, drawY - 25, width, 50);
          ctx.strokeRect(drawX - halfWidth, drawY - 25, width, 50);
          break;
        case 'rounded':
          ctx.beginPath();
          roundRect(ctx, drawX - halfWidth, drawY - 25, width, 50, 12);
          ctx.fill();
          ctx.stroke();
          break;
        case 'circle':
            ctx.beginPath();
            const radiusX = halfWidth;
            const radiusY = 40;
            ctx.ellipse(drawX, drawY, radiusX, radiusY, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            break;
          case 'diamond':
            ctx.beginPath();
            ctx.moveTo(drawX, drawY - 40);
            ctx.lineTo(drawX + halfWidth, drawY);
            ctx.lineTo(drawX, drawY + 40);
            ctx.lineTo(drawX - halfWidth, drawY);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
      }

      if (!readOnly && node.children.length > 0) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const sizeFactor = (node.size || 100) / 100;
        const halfWidth = 60 * sizeFactor;
        const indicatorX = drawX + halfWidth - 10;
        ctx.fillText(isExpanded ? '▼' : '►', indicatorX, drawY);
      }

      // 绘制节点文本（支持换行）
      ctx.fillStyle = '#FFFFFF';
      let fontWeight = node.fontWeight || 'normal';
      let fontStyle = node.fontStyle || 'normal';
      let fontSize = node.fontSize || 14;
      ctx.font = `${fontWeight} ${fontStyle} ${fontSize}px -apple-system, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // 计算最大文本宽度（节点宽度减去边距）
      const textSizeFactor = (node.size || 100) / 100;
      const textNodeWidth = 120 * textSizeFactor;
      const maxTextWidth = textNodeWidth - 20; // 左右各留10px边距
      const lineHeight = fontSize * 1.2;
      
      drawWrappedText(ctx, node.title, drawX, drawY, maxTextWidth, lineHeight);
      
      if (node.textDecoration === 'underline') {
        const textMetrics = ctx.measureText(node.title);
        const textWidth = Math.min(textMetrics.width, maxTextWidth);
        ctx.beginPath();
        ctx.moveTo(drawX - textWidth / 2, drawY + fontSize / 2);
        ctx.lineTo(drawX + textWidth / 2, drawY + fontSize / 2);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  });
    
    // 在当前鼠标位置单独绘制被拖拽的节点
    if ((isNodeDragging || isNodeDraggingRef.current) && (draggedNode || draggedNodeRef.current) && draggedNodePositionRef.current) {
      const node = nodes.find(n => n.id === (draggedNode || draggedNodeRef.current));
      if (node) {
        const { x, y } = draggedNodePositionRef.current;
        
        // 节点背景
        ctx.fillStyle = node.color;
        ctx.strokeStyle = '#1E40AF'; // 高亮被拖拽的节点
        ctx.lineWidth = 3;

        // 计算宽度缩放因子，范围75-275%
        const sizeFactor = (node.size || 100) / 100;
        const width = 120 * sizeFactor;
        const halfWidth = width / 2;

        switch (node.shape) {
          case 'rectangle':
            ctx.fillRect(x - halfWidth, y - 25, width, 50);
            ctx.strokeRect(x - halfWidth, y - 25, width, 50);
            break;
          case 'rounded':
            ctx.beginPath();
            roundRect(ctx, x - halfWidth, y - 25, width, 50, 12);
            ctx.fill();
            ctx.stroke();
            break;
          case 'circle':
            ctx.beginPath();
            // 绘制椭圆，宽度根据size调整，高度80
            const radiusX = halfWidth; // 宽度的一半
            const radiusY = 40; // 高度的一半
            ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            break;
          case 'diamond':
            ctx.beginPath();
            // 绘制菱形，宽度根据size调整，高度80
            ctx.moveTo(x, y - 40); // 顶部点
            ctx.lineTo(x + halfWidth, y); // 右侧点
            ctx.lineTo(x, y + 40); // 底部点
            ctx.lineTo(x - halfWidth, y); // 左侧点
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
        }

        // 如果节点有子节点，绘制展开/折叠指示器
        if (!readOnly && node.children.length > 0) {
          const isExpanded = expandedNodes.has(node.id);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          // 根据节点大小计算右侧位置
          const sizeFactor = (node.size || 100) / 100;
          const halfWidth = 60 * sizeFactor;
          const indicatorX = x + halfWidth - 10; // 距离右侧边缘10px
          ctx.fillText(isExpanded ? '▼' : '►', indicatorX, y);
        }

        // 节点文本（支持换行）
        ctx.fillStyle = '#FFFFFF';
        let fontWeight = node.fontWeight || 'normal';
        let fontStyle = node.fontStyle || 'normal';
        let fontSize = node.fontSize || 14;
        ctx.font = `${fontWeight} ${fontStyle} ${fontSize}px -apple-system, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // 计算最大文本宽度（节点宽度减去边距）
        const dragSizeFactor = (node.size || 100) / 100;
        const dragNodeWidth = 120 * dragSizeFactor;
        const maxTextWidth = dragNodeWidth - 20; // 左右各留10px边距
        const lineHeight = fontSize * 1.2;
        
        drawWrappedText(ctx, node.title, x, y, maxTextWidth, lineHeight);
        
        // 绘制下划线
        if (node.textDecoration === 'underline') {
          const textMetrics = ctx.measureText(node.title);
          const textWidth = Math.min(textMetrics.width, maxTextWidth);
          ctx.beginPath();
          ctx.moveTo(x - textWidth / 2, y + fontSize / 2);
          ctx.lineTo(x + textWidth / 2, y + fontSize / 2);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
    
    ctx.restore();

    // 暴露内容卡片位置给 HTML 使用
    if (onFocusContentCardPosition) {
      if (focusState?.isFocusMode && focusState.focusedNode) {
        const contentCardPos = getContentCardPosition(relatedNodes, focusState);
        onFocusContentCardPosition(contentCardPos);
      } else {
        onFocusContentCardPosition(null);
      }
    }
  };

  // 绘制换行文本的辅助函数
  const drawWrappedText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ) => {
    // 如果文本很短，直接绘制
    const metrics = ctx.measureText(text);
    if (metrics.width <= maxWidth) {
      ctx.fillText(text, x, y);
      return;
    }

    // 按字符分割文本并换行
    const chars = text.split('');
    let line = '';
    const lines: string[] = [];

    for (let i = 0; i < chars.length; i++) {
      const testLine = line + chars[i];
      const testMetrics = ctx.measureText(testLine);
      if (testMetrics.width > maxWidth && i > 0) {
        lines.push(line);
        line = chars[i];
      } else {
        line = testLine;
      }
    }
    lines.push(line);

    // 限制最大行数为2行
    const displayLines = lines.slice(0, 2);
    if (lines.length > 2) {
      displayLines[1] = displayLines[1].slice(0, -1) + '...';
    }

    // 计算起始Y坐标（垂直居中）
    const totalHeight = displayLines.length * lineHeight;
    let startY = y - totalHeight / 2 + lineHeight / 2;

    // 逐行绘制
    displayLines.forEach((lineText, index) => {
      ctx.fillText(lineText, x, startY + index * lineHeight);
    });
  };

  // 绘制圆角矩形的辅助函数
  const roundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) => {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  };



  // 处理画布大小调整
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const webglCanvas = webglCanvasRef.current;
      if (canvas && webglCanvas) {
        const container = canvas.parentElement;
        if (container) {
          const { width, height } = container.getBoundingClientRect();
          canvas.width = width;
          canvas.height = height;
          webglCanvas.width = width;
          webglCanvas.height = height;
          drawWithCanvas2D();
        }
      }
    };

    // 组件挂载时的初始调整
    handleResize();

    // 使用 ResizeObserver 更好地监控大小变化
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    // 为父容器设置观察器
    const setupObserver = () => {
      const canvas = canvasRef.current;
      if (canvas && canvas.parentElement) {
        resizeObserver.observe(canvas.parentElement);
      }
    };

    setupObserver();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, []);

  // 确保组件挂载时画布大小调整
  useEffect(() => {
    // 组件挂载后强制调整大小
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      const webglCanvas = webglCanvasRef.current;
      if (canvas && webglCanvas) {
        const container = canvas.parentElement;
        if (container) {
          const { width, height } = container.getBoundingClientRect();
          canvas.width = width;
          canvas.height = height;
          webglCanvas.width = width;
          webglCanvas.height = height;
          drawWithCanvas2D();
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // 动画循环
  useEffect(() => {
    if (showAnimation) {
      const animate = () => {
        animationTimeRef.current += 0.05;
        drawWithCanvas2D();
        animationRafRef.current = requestAnimationFrame(animate);
      };
      animationRafRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRafRef.current) {
        cancelAnimationFrame(animationRafRef.current);
        animationRafRef.current = null;
      }
    }
    
    return () => {
      if (animationRafRef.current) {
        cancelAnimationFrame(animationRafRef.current);
      }
    };
  }, [showAnimation]);

  // 当节点、缩放、平移、选中节点、展开节点或隐藏层级变化时重绘
  useEffect(() => {
    if (!showAnimation) {
      drawWithCanvas2D();
    }
  }, [nodes, zoom, pan, selectedNode, expandedNodes, hiddenLevels, bubbleInfo, showAnimation, showGrid]);

  // 处理鼠标按下（开始拖拽或长按节点移动）
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseY = (e.clientY - rect.top - pan.y) / zoom;

    const relatedNodes = focusState?.isFocusMode && focusState.focusedNode 
      ? getRelatedNodesSet(focusState.focusedNode)
      : new Set<string>();
    
    const nodesToCheck = getNodesToCheck();
    let clickedOnNode = false;
    
    for (const node of nodesToCheck) {
      let isClicked = false;
      
      const nodePos = getFocusNodePosition(node.id, relatedNodes, focusState);
      const sizeFactor = (node.size || 100) / 100;
      const halfWidth = 60 * sizeFactor;

      switch (node.shape) {
        case 'rectangle':
        case 'rounded':
          isClicked = mouseX >= nodePos.x - halfWidth && mouseX <= nodePos.x + halfWidth &&
                     mouseY >= nodePos.y - 25 && mouseY <= nodePos.y + 25;
          break;
        case 'circle':
          const radiusX = halfWidth;
          const radiusY = 40;
          const normalizedX = (mouseX - nodePos.x) / radiusX;
          const normalizedY = (mouseY - nodePos.y) / radiusY;
          isClicked = normalizedX * normalizedX + normalizedY * normalizedY <= 1;
          break;
        case 'diamond':
          isClicked = mouseX >= nodePos.x - halfWidth && mouseX <= nodePos.x + halfWidth &&
                     mouseY >= nodePos.y - 40 && mouseY <= nodePos.y + 40;
          break;
      }

      if (isClicked) {
        clickedOnNode = true;
        
        if (focusState?.isFocusMode && onNodeFocus) {
          const focusedNodeId = focusState.focusedNode;
          if (focusedNodeId && node.id !== focusedNodeId) {
            const isParent = parentMap?.get(focusedNodeId) === node.id;
            const focusedNode = nodes.find(n => n.id === focusedNodeId);
            const isChild = focusedNode?.children.includes(node.id);
            
            if (isParent || isChild) {
              onNodeFocus(node.id);
              return;
            }
          }
        }
        
        if (!readOnly && node.children && node.children.length > 0) {
          const sizeFactor = (node.size || 100) / 100;
          const halfWidth = 60 * sizeFactor;
          const indicatorX = nodePos.x + halfWidth - 10;
          const indicatorY = nodePos.y;
          const indicatorSize = 12;
          
          const isClickOnIndicator = mouseX >= indicatorX - indicatorSize/2 && 
                                    mouseX <= indicatorX + indicatorSize/2 && 
                                    mouseY >= indicatorY - indicatorSize/2 && 
                                    mouseY <= indicatorY + indicatorSize/2;
          
          if (isClickOnIndicator) {
            const isExpanded = expandedNodes.has(node.id);
            onNodeExpand(node.id, !isExpanded);
          }
        }
        
        if (!readOnly && node.id !== 'root') {
          const timer = setTimeout(() => {
            setIsNodeDragging(true);
            setDraggedNode(node.id);
            setDragStart({ x: e.clientX, y: e.clientY });
            isNodeDraggingRef.current = true;
            draggedNodeRef.current = node.id;
          }, 500);
          
          setLongPressTimer(timer);
        }
        break;
      }
    }

    // 如果没有点击节点，则开始画布拖拽并关闭气泡
    if (!clickedOnNode) {
      // 关闭气泡
      onBubbleInfoChange(null);
      // 调用 onCanvasClick 取消选择节点
      onCanvasClick();
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  // 处理鼠标释放（结束拖拽或取消长按）
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // 如果存在长按计时器，则清除它
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    // 取消任何待处理的动画帧
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    
    // 如果正在拖拽节点，更新其位置
    if ((isNodeDragging || isNodeDraggingRef.current) && (draggedNode || draggedNodeRef.current)) {
      const canvas = canvasRef.current;
      if (canvas) {
        let mouseX, mouseY;
        
        // 如果有拖拽位置，则使用最新的拖拽位置
        if (draggedNodePositionRef.current) {
          mouseX = draggedNodePositionRef.current.x;
          mouseY = draggedNodePositionRef.current.y;
        } else {
          // 回退到当前鼠标位置
          const rect = canvas.getBoundingClientRect();
          mouseX = (e.clientX - rect.left - pan.x) / zoom;
          mouseY = (e.clientY - rect.top - pan.y) / zoom;
        }
        
        const nodeId = draggedNode || draggedNodeRef.current;
        if (nodeId) {
          onNodeMove(nodeId, mouseX, mouseY);
        }
      }
    }
    
    // 重置拖拽状态
    setIsDragging(false);
    setIsNodeDragging(false);
    setDraggedNode(null);
    // 重置引用
    isNodeDraggingRef.current = false;
    draggedNodeRef.current = null;
    draggedNodePositionRef.current = null;
  };

  // 处理鼠标离开（结束拖拽）
  const handleMouseLeave = () => {
    // 如果存在长按计时器，则清除它
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    // 取消任何待处理的动画帧
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    
    // 重置所有拖拽状态
    setIsDragging(false);
    setIsNodeDragging(false);
    setDraggedNode(null);
    // 重置引用
    isNodeDraggingRef.current = false;
    draggedNodeRef.current = null;
    draggedNodePositionRef.current = null;
  };

  // 处理上下文菜单（右键点击）
  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // 阻止默认上下文菜单
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseY = (e.clientY - rect.top - pan.y) / zoom;

    // 检查是否右键点击了节点
    for (const node of nodes) {
      let isClicked = false;
      
      // 计算宽度缩放因子，范围75-275%
      const sizeFactor = (node.size || 100) / 100;
      const halfWidth = 60 * sizeFactor;

      switch (node.shape) {
        case 'rectangle':
          isClicked = mouseX >= node.x - halfWidth && mouseX <= node.x + halfWidth &&
                     mouseY >= node.y - 25 && mouseY <= node.y + 25;
          break;
        case 'rounded':
          isClicked = mouseX >= node.x - halfWidth && mouseX <= node.x + halfWidth &&
                     mouseY >= node.y - 25 && mouseY <= node.y + 25;
          break;
        case 'circle':
          // 椭圆的点击检测
          const radiusX = halfWidth;
          const radiusY = 40;
          const normalizedX = (mouseX - node.x) / radiusX;
          const normalizedY = (mouseY - node.y) / radiusY;
          isClicked = normalizedX * normalizedX + normalizedY * normalizedY <= 1;
          break;
        case 'diamond':
          // 菱形的点击检测，使用菱形的边界
          isClicked = mouseX >= node.x - halfWidth && mouseX <= node.x + halfWidth &&
                     mouseY >= node.y - 40 && mouseY <= node.y + 40;
          break;
      }

      if (isClicked) {
        // 打开节点上下文菜单
        onNodeMenu(node.id, e.clientX, e.clientY);
        break;
      }
    }
  };



  // 处理双击事件
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseY = (e.clientY - rect.top - pan.y) / zoom;

    const relatedNodes = focusState?.isFocusMode && focusState.focusedNode 
      ? getRelatedNodesSet(focusState.focusedNode)
      : new Set<string>();
    
    const nodesToCheck = getNodesToCheck();

    for (const node of nodesToCheck) {
      let isClicked = false;
      
      const nodePos = getFocusNodePosition(node.id, relatedNodes, focusState);
      const sizeFactor = (node.size || 100) / 100;
      const halfWidth = 60 * sizeFactor;

      switch (node.shape) {
        case 'rectangle':
        case 'rounded':
          isClicked = mouseX >= nodePos.x - halfWidth && mouseX <= nodePos.x + halfWidth &&
                     mouseY >= nodePos.y - 25 && mouseY <= nodePos.y + 25;
          break;
        case 'circle':
          const radiusX = halfWidth;
          const radiusY = 40;
          const normalizedX = (mouseX - nodePos.x) / radiusX;
          const normalizedY = (mouseY - nodePos.y) / radiusY;
          isClicked = normalizedX * normalizedX + normalizedY * normalizedY <= 1;
          break;
        case 'diamond':
          isClicked = mouseX >= nodePos.x - halfWidth && mouseX <= nodePos.x + halfWidth &&
                     mouseY >= nodePos.y - 40 && mouseY <= nodePos.y + 40;
          break;
      }

      if (isClicked) {
        console.log('Double clicked on node:', node.id);
        if (onNodeFocus) {
          console.log('Calling onNodeFocus with nodeId:', node.id);
          onNodeFocus(node.id);
        } else {
          onNodeSelect(node.id);
          const bubbleDirection = calculateBubbleDirection(node);
          onBubbleInfoChange({
            nodeId: node.id,
            position: { x: node.x, y: node.y },
            direction: bubbleDirection,
            showContent: false
          });
        }
        break;
      }
    }
  };

  // 计算气泡的最优位置
  const calculateBubbleDirection = (node: MindMapNode): 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' => {
    // 计算宽度缩放因子
    const sizeFactor = (node.size || 100) / 100;
    const halfWidth = 60 * sizeFactor;
    
    // 气泡实际尺寸
    const bubbleWidth = 320;
    const bubbleHeight = 200;
    
    // 画布边界
    const canvas = canvasRef.current;
    const canvasWidth = canvas?.width || window.innerWidth;
    const canvasHeight = canvas?.height || window.innerHeight;
    
    // 小地图位置和大小（左上角，48x32）
    const miniMapX = 16; // top-4
    const miniMapY = 16; // left-4
    const miniMapWidth = 192; // w-48
    const miniMapHeight = 128; // h-32
    
    // 计算节点在画布上的实际位置
    const nodeScreenX = node.x * zoom + pan.x;
    const nodeScreenY = node.y * zoom + pan.y;
    
    // 计算四个方向的可用空间
    const directions = [
      {
        direction: 'top-left' as const,
        x: node.x - halfWidth - bubbleWidth,
        y: node.y - bubbleHeight - 20,
        screenX: nodeScreenX - halfWidth * zoom - bubbleWidth * zoom,
        screenY: nodeScreenY - bubbleHeight * zoom - 20 * zoom
      },
      {
        direction: 'top-right' as const,
        x: node.x + halfWidth + 20,
        y: node.y - bubbleHeight - 20,
        screenX: nodeScreenX + halfWidth * zoom + 20 * zoom,
        screenY: nodeScreenY - bubbleHeight * zoom - 20 * zoom
      },
      {
        direction: 'bottom-left' as const,
        x: node.x - halfWidth - bubbleWidth,
        y: node.y + 40 + 20,
        screenX: nodeScreenX - halfWidth * zoom - bubbleWidth * zoom,
        screenY: nodeScreenY + 40 * zoom + 20 * zoom
      },
      {
        direction: 'bottom-right' as const,
        x: node.x + halfWidth + 20,
        y: node.y + 40 + 20,
        screenX: nodeScreenX + halfWidth * zoom + 20 * zoom,
        screenY: nodeScreenY + 40 * zoom + 20 * zoom
      }
    ];
    
    // 筛选出在画布内且不与小地图重叠的方向
    const validDirections = directions.filter(dir => {
      const bubbleEndX = dir.screenX + bubbleWidth * zoom;
      const bubbleEndY = dir.screenY + bubbleHeight * zoom;
      
      // 检查是否在画布内
      const inCanvas = dir.screenX >= 0 && 
                      dir.screenY >= 0 && 
                      bubbleEndX <= canvasWidth && 
                      bubbleEndY <= canvasHeight;
      
      // 检查是否与小地图重叠
      const overlapsMiniMap = !(bubbleEndX < miniMapX ||
                               dir.screenX > miniMapX + miniMapWidth ||
                               bubbleEndY < miniMapY ||
                               dir.screenY > miniMapY + miniMapHeight);
      
      return inCanvas && !overlapsMiniMap;
    });
    
    // 检查是否与其他节点重叠
    const availableDirections = validDirections.filter(dir => {
      for (const otherNode of nodes) {
        if (otherNode.id === node.id) continue;
        
        const otherSizeFactor = (otherNode.size || 100) / 100;
        const otherHalfWidth = 60 * otherSizeFactor;
        
        const otherScreenX = otherNode.x * zoom + pan.x;
        const otherScreenY = otherNode.y * zoom + pan.y;
        
        // 检查是否重叠
        const isOverlap = !(dir.screenX + bubbleWidth * zoom < otherScreenX - otherHalfWidth * zoom ||
                          dir.screenX > otherScreenX + otherHalfWidth * zoom ||
                          dir.screenY + bubbleHeight * zoom < otherScreenY - 40 * zoom ||
                          dir.screenY > otherScreenY + 40 * zoom);
        
        if (isOverlap) return false;
      }
      return true;
    });
    
    // 如果有可用方向，返回第一个
    if (availableDirections.length > 0) {
      return availableDirections[0].direction;
    }
    
    // 如果没有完全可用的方向，返回第一个有效的方向
    if (validDirections.length > 0) {
      return validDirections[0].direction;
    }
    
    // 默认为右下角
    return 'bottom-right';
  };



  // 处理鼠标移动（拖拽期间和悬停检测）
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseY = (e.clientY - rect.top - pan.y) / zoom;
      
      let isOverIndicator = false;
      let isOverNode = false;
      
      const relatedNodes = focusState?.isFocusMode && focusState.focusedNode 
        ? getRelatedNodesSet(focusState.focusedNode)
        : new Set<string>();
      
      const nodesToCheck = getNodesToCheck();
      
      if (!readOnly) {
        for (const node of nodesToCheck) {
          if (node.children && node.children.length > 0) {
            const nodePos = getFocusNodePosition(node.id, relatedNodes, focusState);
            const sizeFactor = (node.size || 100) / 100;
            const halfWidth = 60 * sizeFactor;
            const indicatorX = nodePos.x + halfWidth - 10;
            const indicatorY = nodePos.y;
            const indicatorSize = 12;
            
            if (mouseX >= indicatorX - indicatorSize/2 && 
                mouseX <= indicatorX + indicatorSize/2 && 
                mouseY >= indicatorY - indicatorSize/2 && 
                mouseY <= indicatorY + indicatorSize/2) {
              isOverIndicator = true;
              break;
            }
          }
        }
      }
      
      for (const node of nodesToCheck) {
        const nodePos = getFocusNodePosition(node.id, relatedNodes, focusState);
        const sizeFactor = (node.size || 100) / 100;
        const halfWidth = 60 * sizeFactor;
        
        let isHovering = false;
        switch (node.shape) {
          case 'rectangle':
          case 'rounded':
            isHovering = mouseX >= nodePos.x - halfWidth && 
                        mouseX <= nodePos.x + halfWidth && 
                        mouseY >= nodePos.y - 25 && 
                        mouseY <= nodePos.y + 25;
            break;
          case 'circle':
            const radiusX = halfWidth;
            const radiusY = 40;
            const normalizedX = (mouseX - nodePos.x) / radiusX;
            const normalizedY = (mouseY - nodePos.y) / radiusY;
            isHovering = (normalizedX * normalizedX + normalizedY * normalizedY) <= 1;
            break;
          case 'diamond':
            isHovering = mouseX >= nodePos.x - halfWidth && 
                        mouseX <= nodePos.x + halfWidth && 
                        mouseY >= nodePos.y - 40 && 
                        mouseY <= nodePos.y + 40;
            break;
        }
        
        if (isHovering) {
          isOverNode = true;
          break;
        }
      }
      
      // 根据悬停状态改变鼠标样式
      if (isOverIndicator) {
        canvas.style.cursor = 'pointer';
      } else if (isOverNode) {
        canvas.style.cursor = 'pointer'; // 节点上显示手型指针
      } else {
        canvas.style.cursor = 'grab';
      }
    }
    
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      onPanChange({ x: pan.x + deltaX, y: pan.y + deltaY });
      setDragStart({ x: e.clientX, y: e.clientY });
    }
    else if (isNodeDragging || isNodeDraggingRef.current) {
      // 取消之前的动画帧以避免累积
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      
      // 使用 requestAnimationFrame 实现更平滑的拖拽
      rafRef.current = requestAnimationFrame(() => {
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const mouseX = (e.clientX - rect.left - pan.x) / zoom;
          const mouseY = (e.clientY - rect.top - pan.y) / zoom;
          
          // 更新实时跟踪的引用（避免 React 状态延迟）
          draggedNodePositionRef.current = { x: mouseX, y: mouseY };
          
          // 强制重绘以获得即时视觉反馈
          drawWithCanvas2D();
          
          // 更新拖拽起始位置以保持一致性
          setDragStart({ x: e.clientX, y: e.clientY });
        }
      });
    }
  };



  return (
    <div className="relative w-full h-full">
      {/* WebGL 画布（用于高性能渲染） */}
      {isWebGLAvailable && (
        <canvas
          ref={webglCanvasRef}
          className="absolute inset-0 pointer-events-none"
        />
      )}
      
      {/* Canvas 2D（用于基本渲染和交互） */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
        onDoubleClick={handleDoubleClick}
      />
    </div>
  );
};
