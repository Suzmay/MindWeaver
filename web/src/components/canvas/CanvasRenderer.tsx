import React, { useRef, useEffect, useState } from 'react';
import { MindMapNode } from '../../models/Work';
import { useTheme } from '../../context/ThemeContext';
import { assetService } from '../../services/assets/AssetService';

// 缓动函数
const EasingFunctions = {
  'ease-out': (t: number) => 1 - Math.pow(1 - t, 3),
  'ease-in': (t: number) => t * t * t,
  'ease-in-out': (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  'cubic-bezier(0.68, -0.55, 0.265, 1.55)': (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  'linear': (t: number) => t
};



// 计算节点动画变换
interface NodeTransform {
  opacity: number;
  scale: number;
  translateX: number;
  translateY: number;
}

const calculateNodeTransform = (
  _node: MindMapNode,
  animationData: any,
  animationTime: number,
  nodeIndex: number
): NodeTransform => {
  const defaultTransform: NodeTransform = {
    opacity: 1,
    scale: 1,
    translateX: 0,
    translateY: 0
  };

  if (!animationData) return defaultTransform;

  const easingFn = EasingFunctions[animationData.easing as keyof typeof EasingFunctions] || EasingFunctions['ease-out'];

  // 节点揭示动画处理 - 循环播放
  if (animationData.type === 'nodeReveal' && animationData.sequence) {
    // 使用素材中的 duration 作为循环周期
    const durationMs = parseInt(animationData.duration) || 1000;
    const loopTime = animationTime % (durationMs * 2); // 循环周期为两倍的 duration
    const sequenceItem = animationData.sequence[nodeIndex % animationData.sequence.length];
    if (sequenceItem) {
      const delay = parseInt(sequenceItem.delay) || 0;
      // 在循环中应用延迟
      const adjustedTime = loopTime - delay;
      
      let sequenceProgress = 0;
      if (adjustedTime >= 0) {
        // 使用 ping-pong 进度，0-1-0 的曲线
        const progressWithinLoop = adjustedTime / durationMs; // 在素材的 duration 内完成一次动画
        const pingPongProgress = progressWithinLoop < 0.5 ? progressWithinLoop * 2 : 2 - progressWithinLoop * 2;
        sequenceProgress = easingFn(Math.max(0, Math.min(1, pingPongProgress)));
      }

      const keyframes = animationData.keyframes || [
        { opacity: 0, transform: 'scale(0.8)' },
        { opacity: 1, transform: 'scale(1)' }
      ];

      const startFrame = keyframes[0] || { opacity: 0, transform: 'scale(0.8)' };
      const endFrame = keyframes[keyframes.length - 1] || { opacity: 1, transform: 'scale(1)' };

      return {
        opacity: startFrame.opacity + (endFrame.opacity - startFrame.opacity) * sequenceProgress,
        scale: parseFloat((startFrame.transform || 'scale(0.8)').match(/scale\(([\d.]+)\)/)?.[1] || '0.8') +
               (parseFloat((endFrame.transform || 'scale(1)').match(/scale\(([\d.]+)\)/)?.[1] || '1') -
                parseFloat((startFrame.transform || 'scale(0.8)').match(/scale\(([\d.]+)\)/)?.[1] || '0.8')) * sequenceProgress,
        translateX: 0,
        translateY: 0
      };
    }
    return defaultTransform;
  }

  // 处理关键帧动画
  const keyframes = animationData.keyframes || [];
  if (keyframes.length >= 2) {
    const startFrame = keyframes[0];
    const endFrame = keyframes[keyframes.length - 1];

    // 弹跳动画特殊处理 - 循环播放
    if (animationData.type === 'bounce') {
      // 使用素材中的 duration 作为循环周期
      const durationMs = parseInt(animationData.duration) || 800;
      const frequency = animationData.frequency || 1; // 默认为 1
      const loopTime = animationTime % durationMs;
      const loopProgress = (loopTime / durationMs) * frequency;
      return {
        opacity: 1,
        scale: 1,
        translateX: 0,
        translateY: Math.sin(loopProgress * Math.PI * 2) * -10
      };
    }

    // 根据动画类型分别处理
    if (animationData.type === 'fadeIn' || animationData.type === 'scaleIn') {
      // 淡入和缩放动画 - 循环播放
      // 使用素材中的 duration 作为循环周期
      const durationMs = parseInt(animationData.duration) || 800;
      const loopTime = animationTime % (durationMs * 2); // 循环周期为两倍的 duration
      const loopProgress = loopTime / (durationMs * 2);
      // 使用循环进度，0-1-0 的曲线
      const pingPongProgress = loopProgress < 0.5 ? loopProgress * 2 : 2 - loopProgress * 2;
      const loopEasedProgress = easingFn(pingPongProgress);

      const startOpacity = startFrame.opacity !== undefined ? startFrame.opacity : 0;
      const endOpacity = endFrame.opacity !== undefined ? endFrame.opacity : 1;
      const startScaleMatch = (startFrame.transform || '').match(/scale\(([\d.]+)\)/);
      const endScaleMatch = (endFrame.transform || '').match(/scale\(([\d.]+)\)/);
      const startScale = startScaleMatch ? parseFloat(startScaleMatch[1]) : 1;
      const endScale = endScaleMatch ? parseFloat(endScaleMatch[1]) : 1;

      return {
        opacity: startOpacity + (endOpacity - startOpacity) * loopEasedProgress,
        scale: startScale + (endScale - startScale) * loopEasedProgress,
        translateX: 0,
        translateY: 0
      };
    } else {
      // 对于其他类型的关键帧动画，不修改透明度和缩放
      return {
        opacity: 1,
        scale: 1,
        translateX: 0,
        translateY: 0
      };
    }
  }

  return defaultTransform;
};

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
  currentAssetAnimation?: any; // 当前使用的动画素材
  animationVersion?: number; // 动画版本号，用于触发重新渲染
  isAnimationPaused?: boolean; // 动画是否暂停
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
  currentAssetAnimation,
  animationVersion,
  isAnimationPaused,
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
  const animationVersionRef = useRef(0);
  // 使用 refs 进行实时位置跟踪，避免 React 状态延迟
  const draggedNodePositionRef = useRef<{ x: number; y: number } | null>(null);
  const isNodeDraggingRef = useRef(false);
  const draggedNodeRef = useRef<string | null>(null);
  const { theme } = useTheme();
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Tooltip 状态
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    title: string;
  }>({ visible: false, x: 0, y: 0, title: '' });

  // 监听主题变化
  useEffect(() => {
    if (theme === 'auto') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(isDark);
    } else {
      setIsDarkMode(theme === 'dark');
    }
  }, [theme]);

  // 当动画素材或版本号变化时重置动画时间戳
  useEffect(() => {
    // 重置动画时间戳
    animationTimeRef.current = 0;
    // 增加动画版本号，强制重新渲染
    animationVersionRef.current += 1;
  }, [currentAssetAnimation, showAnimation, animationVersion]);

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

    // 通用形状绘制函数
    const drawShape = (
      ctx: CanvasRenderingContext2D,
      node: MindMapNode,
      drawX: number,
      drawY: number,
      scale: number = 1
    ) => {
      const sizeFactor = (node.size || 100) / 100;
      const baseWidth = 120 * sizeFactor * scale;
      const baseHeight = 80 * scale; // 基础高度，不考虑 sizeFactor，保持高度不变
      
      // 尝试从 shapeAssetId 获取素材
      const shapeAssetId = node.shapeAssetId;
      let shapeAsset = shapeAssetId ? assetService.getAssetById(shapeAssetId) : null;
      
      // 如果没有找到素材，尝试通过 shape 类型查找
      if (!shapeAsset) {
        // 查找内置素材中匹配的类型
        const allAssets = assetService.getAllAssets();
        shapeAsset = allAssets.find(a => 
          a.type === 'shape' && a.data?.type === node.shape
        );
      }
      
      // 如果找到素材且有绘制配置
      if (shapeAsset?.data?.render) {
        const render = shapeAsset.data.render;
        const widthRatio = render.widthRatio || 1.5;
        const heightRatio = render.heightRatio || 1;
        
        // 宽度考虑 sizeFactor，高度保持不变
        const width = baseWidth * (widthRatio / 1.5); // 调整比例以匹配基础宽度
        const height = baseHeight * heightRatio;
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        
        if (render.type === 'path' && render.points) {
          ctx.beginPath();
          render.points.forEach((point: { x: number; y: number }, index: number) => {
            const x = drawX + point.x * halfWidth;
            const y = drawY + point.y * halfHeight;
            if (index === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          });
          if (render.closePath) {
            ctx.closePath();
          }
          ctx.fill();
          ctx.stroke();
          return;
        }
      }
      
      // 处理内置的基本形状
      const width = baseWidth;
      const height = 50 * scale;
      const halfWidth = width / 2;
      const halfHeight = height / 2;
      
      switch (node.shape) {
        case 'rectangle':
          ctx.fillRect(drawX - halfWidth, drawY - halfHeight, width, height);
          ctx.strokeRect(drawX - halfWidth, drawY - halfHeight, width, height);
          break;
        case 'rounded':
          // 绘制圆角矩形
          const radius = 12 * scale;
          ctx.beginPath();
          ctx.moveTo(drawX - halfWidth + radius, drawY - halfHeight);
          ctx.lineTo(drawX + halfWidth - radius, drawY - halfHeight);
          ctx.quadraticCurveTo(drawX + halfWidth, drawY - halfHeight, drawX + halfWidth, drawY - halfHeight + radius);
          ctx.lineTo(drawX + halfWidth, drawY + halfHeight - radius);
          ctx.quadraticCurveTo(drawX + halfWidth, drawY + halfHeight, drawX + halfWidth - radius, drawY + halfHeight);
          ctx.lineTo(drawX - halfWidth + radius, drawY + halfHeight);
          ctx.quadraticCurveTo(drawX - halfWidth, drawY + halfHeight, drawX - halfWidth, drawY + halfHeight - radius);
          ctx.lineTo(drawX - halfWidth, drawY - halfHeight + radius);
          ctx.quadraticCurveTo(drawX - halfWidth, drawY - halfHeight, drawX - halfWidth + radius, drawY - halfHeight);
          ctx.fill();
          ctx.stroke();
          break;
        case 'circle':
          // 绘制圆形（椭圆）
          ctx.beginPath();
          const radiusX = halfWidth;
          const radiusY = halfHeight;
          ctx.ellipse(drawX, drawY, radiusX, radiusY, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          break;
        case 'diamond':
          // 绘制菱形
          ctx.beginPath();
          ctx.moveTo(drawX, drawY - halfHeight * 1.6); // 顶部点
          ctx.lineTo(drawX + halfWidth, drawY); // 右侧点
          ctx.lineTo(drawX, drawY + halfHeight * 1.6); // 底部点
          ctx.lineTo(drawX - halfWidth, drawY); // 左侧点
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
        default:
          // 回退到默认形状（矩形）
          ctx.fillRect(drawX - halfWidth, drawY - halfHeight, width, height);
          ctx.strokeRect(drawX - halfWidth, drawY - halfHeight, width, height);
          break;
      }
    };

    // 通用连接线绘制函数
    const drawConnector = (
      ctx: CanvasRenderingContext2D,
      parentX: number,
      parentY: number,
      childX: number,
      childY: number,
      child: MindMapNode,
      color: string,
      isAnimated: boolean = false,
      animationOffset: number = 0
    ) => {
      // 获取连接线素材
      const connectorAssetId = child.connectorAssetId;
      let connectorAsset = connectorAssetId ? assetService.getAssetById(connectorAssetId) : null;
      
      // 如果没有找到素材，尝试通过 connectionType 查找
      if (!connectorAsset && child.connectionType) {
        const allAssets = assetService.getAllAssets();
        connectorAsset = allAssets.find(a => 
          a.type === 'connector' && a.data?.type === child.connectionType
        );
      }
      
      // 获取渲染配置
      const render = connectorAsset?.data?.render;
      
      // 设置线条样式
      ctx.strokeStyle = color;
      ctx.lineWidth = render?.lineWidth || 3;
      
      // 设置虚线样式
      if (render?.lineDash && render.lineDash.length > 0) {
        ctx.setLineDash(render.lineDash);
      } else {
        ctx.setLineDash([]);
      }
      
      ctx.beginPath();
      
      // 优先使用素材的绘制类型，否则使用节点的 connectionType
      let drawType = render?.drawType;
      
      // 处理内置的连接线类型
      if (!drawType && child.connectionType) {
        switch (child.connectionType) {
          case 'straight':
            drawType = 'straight';
            break;
          case 'dashed':
            drawType = 'straight';
            ctx.setLineDash([5, 5]);
            break;
          case 'wavy':
            drawType = 'wavy';
            break;
          default:
            drawType = 'curved';
        }
      }
      
      drawType = drawType || 'curved';
      
      switch (drawType) {
        case 'straight':
          if (isAnimated) {
            const waveOffset = animationOffset;
            const waveAmplitude = 5;
            const waveFrequency = 0.003;
            
            ctx.moveTo(parentX, parentY);
            
            // 分段绘制带有动画的直线
            const segments = 5;
            for (let i = 0; i < segments; i++) {
              const t2 = (i + 1) / segments;
              
              
              const x2 = parentX + (childX - parentX) * t2;
              const y2 = parentY + (childY - parentY) * t2 + Math.sin(animationTimeRef.current * waveFrequency + waveOffset + i + 1) * waveAmplitude;
              
              ctx.lineTo(x2, y2);
            }
          } else {
            ctx.moveTo(parentX, parentY);
            ctx.lineTo(childX, childY);
          }
          break;
          
        case 'step':
          // 阶梯连线：先水平再垂直再水平
          const midX = (parentX + childX) / 2;
          if (isAnimated) {
            const waveOffset = animationOffset;
            const waveAmplitude = 5;
            const waveFrequency = 0.003;
            
            ctx.moveTo(parentX, parentY);
            
            // 第一段水平
            const midX1 = parentX + (midX - parentX) / 2;
            const y1 = parentY + Math.sin(animationTimeRef.current * waveFrequency + waveOffset) * waveAmplitude;
            ctx.quadraticCurveTo(midX1, y1, midX, parentY);
            
            // 垂直段
            const midY = (parentY + childY) / 2;
            ctx.quadraticCurveTo(midX, midY, midX, childY);
            
            // 第二段水平
            const midX2 = midX + (childX - midX) / 2;
            const y3 = childY + Math.sin(animationTimeRef.current * waveFrequency + waveOffset + 2) * waveAmplitude;
            ctx.quadraticCurveTo(midX2, y3, childX, childY);
          } else {
            ctx.moveTo(parentX, parentY);
            ctx.lineTo(midX, parentY);
            ctx.lineTo(midX, childY);
            ctx.lineTo(childX, childY);
          }
          break;
          
        case 'double':
          // 双连线
          const gap = render?.lineGap || 6;
          const dx = childX - parentX;
          const dy = childY - parentY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const offsetX = (-dy / distance) * gap;
          const offsetY = (dx / distance) * gap;
          
          if (isAnimated) {
            const waveOffset = animationOffset;
            const waveAmplitude = 8;
            const waveFrequency = 0.003;
            
            // 第一条线
            const midX1 = (parentX + childX) / 2 + offsetX;
            const midY1 = (parentY + childY) / 2 - 50 + offsetY;
            const animatedMidY1 = midY1 + Math.sin(animationTimeRef.current * waveFrequency + waveOffset) * waveAmplitude;
            
            ctx.moveTo(parentX + offsetX, parentY + offsetY);
            ctx.quadraticCurveTo(midX1, animatedMidY1, childX + offsetX, childY + offsetY);
            
            // 第二条线
            const midX2 = (parentX + childX) / 2 - offsetX;
            const midY2 = (parentY + childY) / 2 - 50 - offsetY;
            const animatedMidY2 = midY2 + Math.sin(animationTimeRef.current * waveFrequency + waveOffset + 1) * waveAmplitude;
            
            ctx.moveTo(parentX - offsetX, parentY - offsetY);
            ctx.quadraticCurveTo(midX2, animatedMidY2, childX - offsetX, childY - offsetY);
          } else {
            // 第一条线
            ctx.moveTo(parentX + offsetX, parentY + offsetY);
            ctx.quadraticCurveTo(
              (parentX + childX) / 2 + offsetX,
              (parentY + childY) / 2 - 50 + offsetY,
              childX + offsetX,
              childY + offsetY
            );
            
            // 第二条线
            ctx.moveTo(parentX - offsetX, parentY - offsetY);
            ctx.quadraticCurveTo(
              (parentX + childX) / 2 - offsetX,
              (parentY + childY) / 2 - 50 - offsetY,
              childX - offsetX,
              childY - offsetY
            );
          }
          break;
          
        case 'wavy':
          // 波浪线
          const dxWavy = childX - parentX;
          const dyWavy = childY - parentY;
          const distanceWavy = Math.sqrt(dxWavy * dxWavy + dyWavy * dyWavy);
          const waveCount = Math.max(3, Math.floor(distanceWavy / 50));
          const waveHeight = 15;
          
          ctx.moveTo(parentX, parentY);
          
          if (isAnimated) {
            const waveOffset = animationOffset;
            const waveFrequency = 0.003;
            
            for (let i = 0; i < waveCount; i++) {
              const t1 = (i + 0.25) / waveCount;
              const t2 = (i + 0.75) / waveCount;
              const t3 = (i + 1) / waveCount;
              
              const x1 = parentX + dxWavy * t1;
              const y1 = parentY + dyWavy * t1 + (i % 2 === 0 ? -waveHeight : waveHeight) + Math.sin(animationTimeRef.current * waveFrequency + waveOffset + i) * 3;
              
              const x2 = parentX + dxWavy * t2;
              const y2 = parentY + dyWavy * t2 + (i % 2 === 0 ? waveHeight : -waveHeight) + Math.sin(animationTimeRef.current * waveFrequency + waveOffset + i + 1) * 3;
              
              const x3 = parentX + dxWavy * t3;
              const y3 = parentY + dyWavy * t3 + (i % 2 === 0 ? waveHeight : -waveHeight) + Math.sin(animationTimeRef.current * waveFrequency + waveOffset + i + 2) * 3;
              
              ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3);
            }
          } else {
            for (let i = 0; i < waveCount; i++) {
              const t1 = (i + 0.25) / waveCount;
              const t2 = (i + 0.75) / waveCount;
              const t3 = (i + 1) / waveCount;
              
              const x1 = parentX + dxWavy * t1;
              const y1 = parentY + dyWavy * t1 + (i % 2 === 0 ? -waveHeight : waveHeight);
              
              const x2 = parentX + dxWavy * t2;
              const y2 = parentY + dyWavy * t2 + (i % 2 === 0 ? waveHeight : -waveHeight);
              
              const x3 = parentX + dxWavy * t3;
              const y3 = parentY + dyWavy * t3 + (i % 2 === 0 ? waveHeight : -waveHeight);
              
              ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3);
            }
          }
          break;
          
        case 'curved':
        default:
          // 默认曲线
          if (isAnimated) {
            const waveOffset = animationOffset;
            const waveAmplitude = 8;
            const waveFrequency = 0.003;
            
            const midX = (parentX + childX) / 2;
            const midY = (parentY + childY) / 2 - 50;
            const animatedMidY = midY + Math.sin(animationTimeRef.current * waveFrequency + waveOffset) * waveAmplitude;
            
            ctx.moveTo(parentX, parentY);
            ctx.quadraticCurveTo(midX, animatedMidY, childX, childY);
          } else {
            ctx.moveTo(parentX, parentY);
            ctx.quadraticCurveTo(
              (parentX + childX) / 2,
              (parentY + childY) / 2 - 50,
              childX,
              childY
            );
          }
          break;
      }
      
      ctx.stroke();
      ctx.setLineDash([]);
      
      // 绘制箭头（如果需要）
      if (render?.hasArrowHead) {
        const arrowSize = (render?.arrowSize || 10) * 1.5; // 放大1.5倍
        let midX = (parentX + childX) / 2;
        let midY = (parentY + childY) / 2;
        let angle = Math.atan2(childY - parentY, childX - parentX);
        
        // 根据线条类型计算箭头位置，确保箭头在线上
        if (render.drawType === 'curved') {
          // 曲线：计算二次贝塞尔曲线在 t=0.5 时的点
          // B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
          const t = 0.5;
          const P0x = parentX;
          const P0y = parentY;
          const P1x = (parentX + childX) / 2;
          const P1y = (parentY + childY) / 2 - 50;
          const P2x = childX;
          const P2y = childY;
          
          midX = (1 - t) * (1 - t) * P0x + 2 * (1 - t) * t * P1x + t * t * P2x;
          midY = (1 - t) * (1 - t) * P0y + 2 * (1 - t) * t * P1y + t * t * P2y;
          
          // 计算切线方向作为箭头角度
          const tangentX = 2 * (1 - t) * (P1x - P0x) + 2 * t * (P2x - P1x);
          const tangentY = 2 * (1 - t) * (P1y - P0y) + 2 * t * (P2y - P1y);
          angle = Math.atan2(tangentY, tangentX);
        } else if (render.drawType === 'step') {
          // 阶梯线：由三段组成 (水平 → 垂直 → 水平)
          const stepMidX = (parentX + childX) / 2;
          
          // 计算阶梯线各段长度
          const horizontalLength1 = Math.abs(stepMidX - parentX);
          const verticalLength = Math.abs(childY - parentY);
          const horizontalLength2 = Math.abs(childX - stepMidX);
          const totalLength = horizontalLength1 + verticalLength + horizontalLength2;
          const halfLength = totalLength / 2;
          
          if (halfLength <= horizontalLength1) {
            // 中点在第一段水平线上
            midX = parentX + (halfLength / horizontalLength1) * (stepMidX - parentX);
            midY = parentY;
            angle = Math.atan2(0, stepMidX - parentX); // 水平方向
          } else if (halfLength <= horizontalLength1 + verticalLength) {
            // 中点在垂直段上
            midX = stepMidX;
            midY = parentY + ((halfLength - horizontalLength1) / verticalLength) * (childY - parentY);
            angle = Math.atan2(childY - parentY, 0); // 垂直方向
          } else {
            // 中点在第二段水平线上
            midX = stepMidX + ((halfLength - horizontalLength1 - verticalLength) / horizontalLength2) * (childX - stepMidX);
            midY = childY;
            angle = Math.atan2(0, childX - stepMidX); // 水平方向
          }
        }
        // 直线(straight)和波浪线(wavy)：使用默认的中心点
        
        // 设置箭头颜色与线条颜色一致
        ctx.fillStyle = color;
        
        ctx.beginPath();
        ctx.moveTo(midX, midY);
        ctx.lineTo(
          midX - arrowSize * Math.cos(angle - Math.PI / 6),
          midY - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          midX - arrowSize * Math.cos(angle + Math.PI / 6),
          midY - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
      }
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
            // 绘制连接线
            drawConnector(
              ctx,
              parentX,
              parentY,
              childX,
              childY,
              child,
              node.color,
              showAnimation
            );
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
    
    // 动画效果 - 使用新的动画计算系统
    let nodeTransform = { opacity: 1, scale: 1, translateX: 0, translateY: 0 };
    if (showAnimation) {
      if (currentAssetAnimation && currentAssetAnimation.data) {
        // 有素材动画，使用素材动画
        const nodeIndex = nodes.findIndex(n => n.id === node.id);
        nodeTransform = calculateNodeTransform(
          node,
          currentAssetAnimation.data,
          animationTimeRef.current,
          nodeIndex
        );
        // 应用位置变换
        drawX += nodeTransform.translateX;
        drawY += nodeTransform.translateY;
      } else {
        // 没有素材动画，使用默认动画
        const nodeHash = node.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const nodeOffset = nodeHash * 0.2;
        const nodeWaveAmplitude = 3;
        // 节点使用稍微不同的频率，避免与连接线同步
        drawY += Math.sin(animationTimeRef.current * 0.0038 + nodeOffset) * nodeWaveAmplitude;
      }
    }

    // 聚焦模式下的特殊处理
    if (focusState?.isFocusMode) {
      // 应用动画变换
      ctx.globalAlpha = nodeTransform.opacity;
      
      if (isFocused) {
        // 聚焦节点：放大、但保持原始颜色
        // 固定缩放比例为 1.2，避免在动画时继续放大
        const scale = 1.2 * nodeTransform.scale;
        ctx.fillStyle = node.color; // 使用原始颜色，不增加亮度
        ctx.strokeStyle = '#1E40AF'; // 改为深蓝色，与编辑时的选中边框颜色一致
        ctx.lineWidth = 3;
        
        // 绘制放大的节点
        drawShape(ctx, node, drawX, drawY, scale);
        
        // 绘制节点文本（支持换行）
        ctx.fillStyle = '#FFFFFF';
        let fontWeight = node.fontWeight || 'normal';
        let fontStyle = node.fontStyle || 'normal';
        let fontSize = (node.fontSize || 14) * scale;
        let fontFamily = node.fontFamily || '-apple-system, system-ui, sans-serif';
        const sizeFactor = (node.size || 100) / 100;
        ctx.font = `${fontWeight} ${fontStyle} ${fontSize}px ${fontFamily}`;
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
        // 相关节点：虚化和动画变换
        ctx.globalAlpha = 0.75 * nodeTransform.opacity;
        ctx.fillStyle = node.color;
        ctx.strokeStyle = isSelected ? '#1E40AF' : node.color;
        ctx.lineWidth = isSelected ? 3 : 1;
        
        // 绘制虚化的节点
        drawShape(ctx, node, drawX, drawY, nodeTransform.scale);

        if (!readOnly && node.children.length > 0) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const sizeFactor = (node.size || 100) / 100;
        let indicatorX = drawX + 60 * sizeFactor - 10; // 默认位置
        
        // 如果是素材形状，计算实际的右侧边缘位置
        if (node.shapeAssetId) {
          const shapeAsset = assetService.getAssetById(node.shapeAssetId);
          if (shapeAsset?.data?.render) {
            const render = shapeAsset.data.render;
            if (render.type === 'path' && render.points) {
              // 计算素材形状的实际宽度
              const widthRatio = render.widthRatio || 1.5;
              const baseWidth = 120 * sizeFactor;
              const width = baseWidth * (widthRatio / 1.5);
              const halfWidth = width / 2;
              
              // 找到路径点中最右侧的两个点，用于计算边缘中心
              let maxX = -Infinity;
              let secondMaxX = -Infinity;
              let maxPoint: { x: number; y: number } | null = null;
              let secondMaxPoint: { x: number; y: number } | null = null;
              
              render.points.forEach((point: { x: number; y: number }) => {
                if (point.x > maxX) {
                  secondMaxX = maxX;
                  secondMaxPoint = maxPoint;
                  maxX = point.x;
                  maxPoint = point;
                } else if (point.x > secondMaxX) {
                  secondMaxX = point.x;
                  secondMaxPoint = point;
                }
              });
              
              // 计算边缘中心位置
              let edgeCenterX = drawX + maxX * halfWidth;
              if (maxPoint && secondMaxPoint) {
                // 计算两个点的中点
                const midX = ((maxPoint as { x: number }).x + (secondMaxPoint as { x: number }).x) / 2;
                edgeCenterX = drawX + midX * halfWidth;
              }
              
              // 计算实际的右侧边缘位置
              const rightEdgeX = edgeCenterX;
              // 统一使用10px间隔
              const gap = 10;
              indicatorX = rightEdgeX - gap; // 距离右侧边缘的间隔
            }
          }
        }
        
        ctx.fillText(isExpanded ? '▼' : '►', indicatorX, drawY);
      }

        // 绘制节点文本（支持换行）
        ctx.fillStyle = '#FFFFFF';
        let fontWeight = node.fontWeight || 'normal';
        let fontStyle = node.fontStyle || 'normal';
        let fontSize = (node.fontSize || 14) * nodeTransform.scale;
        let fontFamily = node.fontFamily || '-apple-system, system-ui, sans-serif';
        ctx.font = `${fontWeight} ${fontStyle} ${fontSize}px ${fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // 计算最大文本宽度（节点宽度减去边距）
        const relatedSizeFactor = (node.size || 100) / 100;
        const relatedNodeWidth = 120 * relatedSizeFactor * nodeTransform.scale;
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
      // 正常模式下的绘制 - 应用动画变换
      ctx.globalAlpha = nodeTransform.opacity;
      ctx.fillStyle = node.color;
      ctx.strokeStyle = isSelected ? '#1E40AF' : node.color;
      ctx.lineWidth = isSelected ? 3 : 1;

      // 绘制节点形状
      drawShape(ctx, node, drawX, drawY, nodeTransform.scale);

      if (!readOnly && node.children.length > 0) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const sizeFactor = (node.size || 100) / 100;
        let indicatorX = drawX + 60 * sizeFactor - 10; // 默认位置
        
        // 如果是素材形状，计算实际的右侧边缘位置
        if (node.shapeAssetId) {
          const shapeAsset = assetService.getAssetById(node.shapeAssetId);
          if (shapeAsset?.data?.render) {
            const render = shapeAsset.data.render;
            if (render.type === 'path' && render.points) {
              // 计算素材形状的实际宽度
              const widthRatio = render.widthRatio || 1.5;
              const baseWidth = 120 * sizeFactor;
              const width = baseWidth * (widthRatio / 1.5);
              const halfWidth = width / 2;
              
              // 找到路径点中最右侧的两个点，用于计算边缘中心
              let maxX = -Infinity;
              let secondMaxX = -Infinity;
              let maxPoint: { x: number; y: number } | null = null;
              let secondMaxPoint: { x: number; y: number } | null = null;
              
              render.points.forEach((point: { x: number; y: number }) => {
                if (point.x > maxX) {
                  secondMaxX = maxX;
                  secondMaxPoint = maxPoint;
                  maxX = point.x;
                  maxPoint = point;
                } else if (point.x > secondMaxX) {
                  secondMaxX = point.x;
                  secondMaxPoint = point;
                }
              });
              
              // 计算边缘中心位置
              let edgeCenterX = drawX + maxX * halfWidth;
              if (maxPoint && secondMaxPoint) {
                // 计算两个点的中点
                const midX = ((maxPoint as { x: number }).x + (secondMaxPoint as { x: number }).x) / 2;
                edgeCenterX = drawX + midX * halfWidth;
              }
              
              // 计算实际的右侧边缘位置
              const rightEdgeX = edgeCenterX;
              // 统一使用10px间隔
              const gap = 10;
              indicatorX = rightEdgeX - gap; // 距离右侧边缘的间隔
            }
          }
        }
        
        ctx.fillText(isExpanded ? '▼' : '►', indicatorX, drawY);
      }

      // 绘制节点文本（支持换行）
      ctx.fillStyle = '#FFFFFF';
      let fontWeight = node.fontWeight || 'normal';
      let fontStyle = node.fontStyle || 'normal';
      let fontSize = (node.fontSize || 14) * nodeTransform.scale;
      let fontFamily = node.fontFamily || '-apple-system, system-ui, sans-serif';
      ctx.font = `${fontWeight} ${fontStyle} ${fontSize}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // 计算最大文本宽度（节点宽度减去边距）
      const textSizeFactor = (node.size || 100) / 100;
      const textNodeWidth = 120 * textSizeFactor * nodeTransform.scale;
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

        // 绘制拖拽中的节点
        drawShape(ctx, node, x, y, 1);

        // 如果节点有子节点，绘制展开/折叠指示器
        if (!readOnly && node.children.length > 0) {
          const isExpanded = expandedNodes.has(node.id);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          // 根据节点大小计算右侧位置
          const sizeFactor = (node.size || 100) / 100;
          let indicatorX = x + 60 * sizeFactor - 10; // 默认位置
          
          // 如果是素材形状，计算实际的右侧边缘位置
          if (node.shapeAssetId) {
            const shapeAsset = assetService.getAssetById(node.shapeAssetId);
            if (shapeAsset?.data?.render) {
              const render = shapeAsset.data.render;
              if (render.type === 'path' && render.points) {
                // 计算素材形状的实际宽度
                const widthRatio = render.widthRatio || 1.5;
                const baseWidth = 120 * sizeFactor;
                const width = baseWidth * (widthRatio / 1.5);
                const halfWidth = width / 2;
                
                // 找到路径点中最右侧的点
                let maxX = -Infinity;
                render.points.forEach((point: { x: number; y: number }) => {
                  if (point.x > maxX) {
                    maxX = point.x;
                  }
                });
                
                // 计算实际的右侧边缘位置
                const rightEdgeX = x + maxX * halfWidth;
                indicatorX = rightEdgeX - 10; // 距离右侧边缘10px
              }
            }
          }
          
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
      let lastTime = Date.now();
      const animate = () => {
        const now = Date.now();
        const deltaTime = now - lastTime;
        lastTime = now;
        
        // 只有在不暂停时才更新动画时间
        if (!isAnimationPaused) {
          animationTimeRef.current += deltaTime;
        }
        
        // 无论是否暂停，都要重绘，这样暂停时动画会保持在当前状态
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
  }, [showAnimation, isAnimationPaused]);

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
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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

      // 首先检查是否使用了素材形状
      if (node.shapeAssetId) {
        const shapeAsset = assetService.getAssetById(node.shapeAssetId);
        if (shapeAsset?.data?.render) {
          const render = shapeAsset.data.render;
          
          if (render.type === 'path' && render.points) {
            // 使用基于路径的碰撞检测
            const widthRatio = render.widthRatio || 1.5;
            const heightRatio = render.heightRatio || 1;
            
            // 宽度考虑 sizeFactor，高度保持不变
            const width = 120 * sizeFactor * (widthRatio / 1.5);
            const height = 80 * heightRatio;
            const halfWidth = width / 2;
            const halfHeight = height / 2;
            
            // 创建路径
            const path = new Path2D();
            render.points.forEach((point: { x: number; y: number }, index: number) => {
              const x = nodePos.x + point.x * halfWidth;
              const y = nodePos.y + point.y * halfHeight;
              if (index === 0) {
                path.moveTo(x, y);
              } else {
                path.lineTo(x, y);
              }
            });
            if (render.closePath) {
              path.closePath();
            }
            
            // 使用 isPointInPath 进行精确的碰撞检测
            isClicked = ctx.isPointInPath(path, mouseX, mouseY);
          } else {
            // 如果没有路径数据，使用矩形碰撞检测
            const widthRatio = render.widthRatio || 1.5;
            const heightRatio = render.heightRatio || 1;
            
            // 宽度考虑 sizeFactor，高度保持不变
            const width = 120 * sizeFactor * (widthRatio / 1.5);
            const height = 80 * heightRatio;
            
            isClicked = mouseX >= nodePos.x - width / 2 && mouseX <= nodePos.x + width / 2 &&
                       mouseY >= nodePos.y - height / 2 && mouseY <= nodePos.y + height / 2;
          }
        } else {
          // 如果没有渲染配置，使用默认矩形碰撞检测
          isClicked = mouseX >= nodePos.x - halfWidth && mouseX <= nodePos.x + halfWidth &&
                     mouseY >= nodePos.y - 25 && mouseY <= nodePos.y + 25;
        }
      } else {
        // 处理内置形状
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
          default:
            // 对于其他形状，使用默认矩形碰撞检测
            isClicked = mouseX >= nodePos.x - halfWidth && mouseX <= nodePos.x + halfWidth &&
                       mouseY >= nodePos.y - 25 && mouseY <= nodePos.y + 25;
            break;
        }
      }

      // 检查是否点击了展开/折叠指示器（无论是否点击了节点）
      if (!readOnly && node.children && node.children.length > 0) {
        const sizeFactor = (node.size || 100) / 100;
        let indicatorX = nodePos.x + 60 * sizeFactor - 10; // 默认位置
        
        // 如果是素材形状，计算实际的右侧边缘位置
        if (node.shapeAssetId) {
          const shapeAsset = assetService.getAssetById(node.shapeAssetId);
          if (shapeAsset?.data?.render) {
            const render = shapeAsset.data.render;
            if (render.type === 'path' && render.points) {
              // 计算素材形状的实际宽度
              const widthRatio = render.widthRatio || 1.5;
              const baseWidth = 120 * sizeFactor;
              const width = baseWidth * (widthRatio / 1.5);
              const halfWidth = width / 2;
              
              // 找到路径点中最右侧的两个点，用于计算边缘中心
              let maxX = -Infinity;
              let secondMaxX = -Infinity;
              let maxPoint: { x: number; y: number } | null = null;
              let secondMaxPoint: { x: number; y: number } | null = null;
              
              render.points.forEach((point: { x: number; y: number }) => {
                if (point.x > maxX) {
                  secondMaxX = maxX;
                  secondMaxPoint = maxPoint;
                  maxX = point.x;
                  maxPoint = point;
                } else if (point.x > secondMaxX) {
                  secondMaxX = point.x;
                  secondMaxPoint = point;
                }
              });
              
              // 计算边缘中心位置
              let edgeCenterX = nodePos.x + maxX * halfWidth;
              if (maxPoint && secondMaxPoint) {
                // 计算两个点的中点
                const midX = ((maxPoint as { x: number }).x + (secondMaxPoint as { x: number }).x) / 2;
                edgeCenterX = nodePos.x + midX * halfWidth;
              }
              
              // 计算实际的右侧边缘位置
              const rightEdgeX = edgeCenterX;
              // 统一使用10px间隔
              const gap = 10;
              indicatorX = rightEdgeX - gap; // 距离右侧边缘的间隔
            }
          }
        }
        
        const indicatorY = nodePos.y;
        const indicatorSize = 12;
        
        const isClickOnIndicator = mouseX >= indicatorX - indicatorSize/2 && 
                                  mouseX <= indicatorX + indicatorSize/2 && 
                                  mouseY >= indicatorY - indicatorSize/2 && 
                                  mouseY <= indicatorY + indicatorSize/2;
        
        if (isClickOnIndicator) {
          const isExpanded = expandedNodes.has(node.id);
          onNodeExpand(node.id, !isExpanded);
          return; // 点击了指示器，直接返回，不执行其他操作
        }
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

  // 处理拖拽进入
  const handleDragEnter = (e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
  };

  // 处理拖拽悬停
  const handleDragOver = (e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
  };

  // 处理拖拽放置
  const handleDrop = (e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    try {
      const data = e.dataTransfer.getData('application/json');
      if (data) {
        const asset = JSON.parse(data);
        console.log('Dropped asset:', asset);
        
        // 获取放置位置
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const mouseX = (e.clientX - rect.left - pan.x) / zoom;
          const mouseY = (e.clientY - rect.top - pan.y) / zoom;
          
          // 这里可以添加创建新节点的逻辑
          console.log('Drop position:', mouseX, mouseY);
        }
      }
    } catch (error) {
      console.error('Error processing dropped asset:', error);
    }
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
    
    // 隐藏 tooltip
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  // 处理上下文菜单（右键点击）
  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // 阻止默认上下文菜单
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseY = (e.clientY - rect.top - pan.y) / zoom;

    const relatedNodes = focusState?.isFocusMode && focusState.focusedNode 
      ? getRelatedNodesSet(focusState.focusedNode)
      : new Set<string>();
    
    const nodesToCheck = getNodesToCheck();

    // 检查是否右键点击了节点
    for (const node of nodesToCheck) {
      let isClicked = false;
      
      const nodePos = getFocusNodePosition(node.id, relatedNodes, focusState);
      const sizeFactor = (node.size || 100) / 100;
      const halfWidth = 60 * sizeFactor;

      // 首先检查是否使用了素材形状
      if (node.shapeAssetId) {
        const shapeAsset = assetService.getAssetById(node.shapeAssetId);
        if (shapeAsset?.data?.render) {
          const render = shapeAsset.data.render;
          
          if (render.type === 'path' && render.points) {
            // 使用基于路径的碰撞检测
            const widthRatio = render.widthRatio || 1.5;
            const heightRatio = render.heightRatio || 1;
            
            // 宽度考虑 sizeFactor，高度保持不变
            const width = 120 * sizeFactor * (widthRatio / 1.5);
            const height = 80 * heightRatio;
            const halfWidth = width / 2;
            const halfHeight = height / 2;
            
            // 创建路径
            const path = new Path2D();
            render.points.forEach((point: { x: number; y: number }, index: number) => {
              const x = nodePos.x + point.x * halfWidth;
              const y = nodePos.y + point.y * halfHeight;
              if (index === 0) {
                path.moveTo(x, y);
              } else {
                path.lineTo(x, y);
              }
            });
            if (render.closePath) {
              path.closePath();
            }
            
            // 使用 isPointInPath 进行精确的碰撞检测
            isClicked = ctx.isPointInPath(path, mouseX, mouseY);
          } else {
            // 如果没有路径数据，使用矩形碰撞检测
            const widthRatio = render.widthRatio || 1.5;
            const heightRatio = render.heightRatio || 1;
            
            // 宽度考虑 sizeFactor，高度保持不变
            const width = 120 * sizeFactor * (widthRatio / 1.5);
            const height = 80 * heightRatio;
            
            isClicked = mouseX >= nodePos.x - width / 2 && mouseX <= nodePos.x + width / 2 &&
                       mouseY >= nodePos.y - height / 2 && mouseY <= nodePos.y + height / 2;
          }
        } else {
          // 如果没有渲染配置，使用默认矩形碰撞检测
          isClicked = mouseX >= nodePos.x - halfWidth && mouseX <= nodePos.x + halfWidth &&
                     mouseY >= nodePos.y - 25 && mouseY <= nodePos.y + 25;
        }
      } else {
        // 处理内置形状
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
          default:
            // 对于其他形状，使用默认矩形碰撞检测
            isClicked = mouseX >= nodePos.x - halfWidth && mouseX <= nodePos.x + halfWidth &&
                       mouseY >= nodePos.y - 25 && mouseY <= nodePos.y + 25;
            break;
        }
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
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseY = (e.clientY - rect.top - pan.y) / zoom;

    const relatedNodes = focusState?.isFocusMode && focusState.focusedNode 
      ? getRelatedNodesSet(focusState.focusedNode)
      : new Set<string>();
    
    const nodesToCheck = getNodesToCheck();

    for (const node of nodesToCheck) {
      const nodePos = getFocusNodePosition(node.id, relatedNodes, focusState);
      
      // 首先检查是否点击了展开/折叠指示器
      if (!readOnly && node.children && node.children.length > 0) {
        const sizeFactor = (node.size || 100) / 100;
        let indicatorX = nodePos.x + 60 * sizeFactor - 10; // 默认位置
        
        // 如果是素材形状，计算实际的右侧边缘位置
        if (node.shapeAssetId) {
          const shapeAsset = assetService.getAssetById(node.shapeAssetId);
          if (shapeAsset?.data?.render) {
            const render = shapeAsset.data.render;
            if (render.type === 'path' && render.points) {
              // 计算素材形状的实际宽度
              const widthRatio = render.widthRatio || 1.5;
              const baseWidth = 120 * sizeFactor;
              const width = baseWidth * (widthRatio / 1.5);
              const halfWidth = width / 2;
              
              // 找到路径点中最右侧的两个点，用于计算边缘中心
              let maxX = -Infinity;
              let secondMaxX = -Infinity;
              let maxPoint: { x: number; y: number } | null = null;
              let secondMaxPoint: { x: number; y: number } | null = null;
              
              render.points.forEach((point: { x: number; y: number }) => {
                if (point.x > maxX) {
                  secondMaxX = maxX;
                  secondMaxPoint = maxPoint;
                  maxX = point.x;
                  maxPoint = point;
                } else if (point.x > secondMaxX) {
                  secondMaxX = point.x;
                  secondMaxPoint = point;
                }
              });
              
              // 计算边缘中心位置
              let edgeCenterX = nodePos.x + maxX * halfWidth;
              if (maxPoint && secondMaxPoint) {
                // 计算两个点的中点
                const midX = ((maxPoint as { x: number }).x + (secondMaxPoint as { x: number }).x) / 2;
                edgeCenterX = nodePos.x + midX * halfWidth;
              }
              
              // 计算实际的右侧边缘位置
              const rightEdgeX = edgeCenterX;
              // 统一使用10px间隔
              const gap = 10;
              indicatorX = rightEdgeX - gap; // 距离右侧边缘的间隔
            }
          }
        }
        
        const indicatorY = nodePos.y;
        const indicatorSize = 12;
        
        const isClickOnIndicator = mouseX >= indicatorX - indicatorSize/2 && 
                                  mouseX <= indicatorX + indicatorSize/2 && 
                                  mouseY >= indicatorY - indicatorSize/2 && 
                                  mouseY <= indicatorY + indicatorSize/2;
        
        if (isClickOnIndicator) {
          // 点击了三角形，不触发双击节点的逻辑
          continue;
        }
      }
      
      let isClicked = false;
      
      const sizeFactor = (node.size || 100) / 100;
      const halfWidth = 60 * sizeFactor;

      // 首先检查是否使用了素材形状
      if (node.shapeAssetId) {
        const shapeAsset = assetService.getAssetById(node.shapeAssetId);
        if (shapeAsset?.data?.render) {
          const render = shapeAsset.data.render;
          
          if (render.type === 'path' && render.points) {
            // 使用基于路径的碰撞检测
            const widthRatio = render.widthRatio || 1.5;
            const heightRatio = render.heightRatio || 1;
            
            // 宽度考虑 sizeFactor，高度保持不变
            const width = 120 * sizeFactor * (widthRatio / 1.5);
            const height = 80 * heightRatio;
            const halfWidth = width / 2;
            const halfHeight = height / 2;
            
            // 创建路径
            const path = new Path2D();
            render.points.forEach((point: { x: number; y: number }, index: number) => {
              const x = nodePos.x + point.x * halfWidth;
              const y = nodePos.y + point.y * halfHeight;
              if (index === 0) {
                path.moveTo(x, y);
              } else {
                path.lineTo(x, y);
              }
            });
            if (render.closePath) {
              path.closePath();
            }
            
            // 使用 isPointInPath 进行精确的碰撞检测
            isClicked = ctx.isPointInPath(path, mouseX, mouseY);
          } else {
            // 如果没有路径数据，使用矩形碰撞检测
            const widthRatio = render.widthRatio || 1.5;
            const heightRatio = render.heightRatio || 1;
            
            // 宽度考虑 sizeFactor，高度保持不变
            const width = 120 * sizeFactor * (widthRatio / 1.5);
            const height = 80 * heightRatio;
            
            isClicked = mouseX >= nodePos.x - width / 2 && mouseX <= nodePos.x + width / 2 &&
                       mouseY >= nodePos.y - height / 2 && mouseY <= nodePos.y + height / 2;
          }
        } else {
          // 如果没有渲染配置，使用默认矩形碰撞检测
          isClicked = mouseX >= nodePos.x - halfWidth && mouseX <= nodePos.x + halfWidth &&
                     mouseY >= nodePos.y - 25 && mouseY <= nodePos.y + 25;
        }
      } else {
        // 处理内置形状
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
          default:
            // 对于其他形状，使用默认矩形碰撞检测
            isClicked = mouseX >= nodePos.x - halfWidth && mouseX <= nodePos.x + halfWidth &&
                       mouseY >= nodePos.y - 25 && mouseY <= nodePos.y + 25;
            break;
        }
      }

      if (isClicked) {
        if (onNodeFocus) {
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
            let indicatorX = nodePos.x + 60 * sizeFactor - 10; // 默认位置
            
            // 如果是素材形状，计算实际的右侧边缘位置
            if (node.shapeAssetId) {
              const shapeAsset = assetService.getAssetById(node.shapeAssetId);
              if (shapeAsset?.data?.render) {
                const render = shapeAsset.data.render;
                if (render.type === 'path' && render.points) {
                  // 计算素材形状的实际宽度
                  const widthRatio = render.widthRatio || 1.5;
                  const baseWidth = 120 * sizeFactor;
                  const width = baseWidth * (widthRatio / 1.5);
                  const halfWidth = width / 2;
                  
                  // 找到路径点中最右侧的点
                  let maxX = -Infinity;
                  render.points.forEach((point: { x: number; y: number }) => {
                    if (point.x > maxX) {
                      maxX = point.x;
                    }
                  });
                  
                  // 计算实际的右侧边缘位置
                  const rightEdgeX = nodePos.x + maxX * halfWidth;
                  indicatorX = rightEdgeX - 10; // 距离右侧边缘10px
                }
              }
            }
            
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
        
        // 首先检查是否使用了素材形状
        if (node.shapeAssetId) {
          const shapeAsset = assetService.getAssetById(node.shapeAssetId);
          if (shapeAsset?.data?.render) {
            const render = shapeAsset.data.render;
            
            if (render.type === 'path' && render.points) {
              // 使用基于路径的碰撞检测
              const widthRatio = render.widthRatio || 1.5;
              const heightRatio = render.heightRatio || 1;
              
              const width = 80 * heightRatio * widthRatio * sizeFactor;
              const height = 80 * heightRatio * sizeFactor;
              const halfWidth = width / 2;
              const halfHeight = height / 2;
              
              // 创建路径
              const path = new Path2D();
              render.points.forEach((point: { x: number; y: number }, index: number) => {
                const x = nodePos.x + point.x * halfWidth;
                const y = nodePos.y + point.y * halfHeight;
                if (index === 0) {
                  path.moveTo(x, y);
                } else {
                  path.lineTo(x, y);
                }
              });
              if (render.closePath) {
                path.closePath();
              }
              
              // 使用 isPointInPath 进行精确的碰撞检测
              const canvas = canvasRef.current;
              if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  isHovering = ctx.isPointInPath(path, mouseX, mouseY);
                }
              }
            } else {
              // 如果没有路径数据，使用矩形碰撞检测
              const widthRatio = render.widthRatio || 1.5;
              const heightRatio = render.heightRatio || 1;
              
              const width = 80 * heightRatio * widthRatio * sizeFactor;
              const height = 80 * heightRatio * sizeFactor;
              
              isHovering = mouseX >= nodePos.x - width / 2 && 
                          mouseX <= nodePos.x + width / 2 && 
                          mouseY >= nodePos.y - height / 2 && 
                          mouseY <= nodePos.y + height / 2;
            }
          } else {
            // 如果没有渲染配置，使用默认矩形碰撞检测
            isHovering = mouseX >= nodePos.x - halfWidth && 
                        mouseX <= nodePos.x + halfWidth && 
                        mouseY >= nodePos.y - 25 && 
                        mouseY <= nodePos.y + 25;
          }
        } else {
          // 处理内置形状
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
            default:
              // 对于其他形状，使用默认矩形碰撞检测
              isHovering = mouseX >= nodePos.x - halfWidth && 
                          mouseX <= nodePos.x + halfWidth && 
                          mouseY >= nodePos.y - 25 && 
                          mouseY <= nodePos.y + 25;
              break;
          }
        }
        
        if (isHovering) {
          isOverNode = true;
          
          // 检查节点标题是否超出限制，显示 tooltip
          const maxTextWidth = halfWidth * 2 - 20;
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx && node.title) {
              ctx.font = '14px sans-serif';
              const textMetrics = ctx.measureText(node.title);
              // 如果标题宽度超过最大宽度，显示 tooltip
              if (textMetrics.width > maxTextWidth) {
                setTooltip({
                  visible: true,
                  x: e.clientX + 10,
                  y: e.clientY - 30,
                  title: node.title
                });
              } else {
                setTooltip(prev => ({ ...prev, visible: false }));
              }
            }
          }
          break;
        }
      }
      
      // 如果没有悬停在节点上，隐藏 tooltip
      if (!isOverNode) {
        setTooltip(prev => ({ ...prev, visible: false }));
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
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      />
      
      {/* Tooltip - 显示完整标题 */}
      {tooltip.visible && (
        <div
          className="fixed z-[9999] px-3 py-2 text-sm bg-gray-900 text-white rounded-lg shadow-lg pointer-events-none max-w-xs break-words"
          style={{
            left: tooltip.x,
            top: tooltip.y,
          }}
        >
          {tooltip.title}
        </div>
      )}
    </div>
  );
};
