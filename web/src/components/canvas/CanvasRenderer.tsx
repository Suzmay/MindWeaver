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

  // 使用 Canvas 2D 绘制
  const drawWithCanvas2D = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 应用变换
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // 绘制网格
    ctx.strokeStyle = isDarkMode ? '#333333' : '#e0e0e0';
    ctx.lineWidth = 1;
    const gridSize = 50;
    
    // 根据当前平移和缩放计算网格的起始和结束位置
    // 扩展到可见区域之外，创建无限网格效果
    const extendedRange = 100; // 在可见区域之外绘制的网格线数量
    const totalGridLines = extendedRange * 2;
    
    // 计算网格坐标系中的当前平移位置
    const panGridX = pan.x / zoom;
    const panGridY = pan.y / zoom;
    
    // 计算可见区域中心的网格坐标
    const centerX = panGridX;
    const centerY = panGridY;
    
    // 计算网格线的起始和结束位置
    const gridStartX = centerX - (gridSize * totalGridLines);
    const gridEndX = centerX + (gridSize * totalGridLines);
    const gridStartY = centerY - (gridSize * totalGridLines);
    const gridEndY = centerY + (gridSize * totalGridLines);
    
    // 绘制垂直网格线
    for (let x = Math.floor(gridStartX / gridSize) * gridSize; x <= gridEndX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, gridStartY);
      ctx.lineTo(x, gridEndY);
      ctx.stroke();
    }
    
    // 绘制水平网格线
    for (let y = Math.floor(gridStartY / gridSize) * gridSize; y <= gridEndY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(gridStartX, y);
      ctx.lineTo(gridEndX, y);
      ctx.stroke();
    }

    // 只为展开的节点和可见子节点绘制连接
    nodes.forEach((node) => {
      const isExpanded = expandedNodes.has(node.id);
      if (isExpanded) {
        node.children.forEach((childId) => {
          const child = nodes.find((n) => n.id === childId);
          if (child && !hiddenLevels.has(child.level || 0)) {
            // 获取实际位置（考虑拖拽）
            let parentX = node.x;
            let parentY = node.y;
            let childX = child.x;
            let childY = child.y;
            
            // 如果节点正在被拖拽，使用拖拽位置
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
            
            ctx.strokeStyle = node.color;
            ctx.lineWidth = 3;
            
            // 根据连接类型设置线条样式
            if (child.connectionType === 'dashed') {
              ctx.setLineDash([5, 5]);
            } else {
              ctx.setLineDash([]);
            }
            
            ctx.beginPath();
            if (child.connectionType === 'straight') {
              // 绘制直线
              ctx.moveTo(parentX, parentY);
              ctx.lineTo(childX, childY);
            } else if (child.connectionType === 'wavy') {
              // 绘制波浪线 - 使用三次贝塞尔曲线实现圆滑的凸凹凸效果
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
              // 绘制曲线（默认）
              ctx.moveTo(parentX, parentY);
              ctx.quadraticCurveTo(
                (parentX + childX) / 2,
                (parentY + childY) / 2 - 50,
                childX,
                childY
              );
            }
            ctx.stroke();
            ctx.setLineDash([]); // 恢复默认线条样式
          }
        });
      }
    });

    // 绘制节点
    nodes.forEach((node) => {
      // 在拖拽期间跳过绘制被拖拽的节点（单独绘制被拖拽的节点）
      if (isNodeDragging && draggedNode === node.id) return;
      
      // 检查节点层级是否被隐藏（根节点总是显示）
      if (node.id !== 'root' && hiddenLevels.has(node.level || 0)) return;
      
      // 对于非根节点，检查父节点是否展开
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

      // 节点背景
      ctx.fillStyle = node.color;
      ctx.strokeStyle = isSelected ? '#1E40AF' : node.color;
      ctx.lineWidth = isSelected ? 3 : 1;

      // 计算宽度缩放因子，范围75-275%
      const sizeFactor = (node.size || 100) / 100;
      const width = 120 * sizeFactor;
      const halfWidth = width / 2;

      switch (node.shape) {
        case 'rectangle':
          ctx.fillRect(node.x - halfWidth, node.y - 25, width, 50);
          ctx.strokeRect(node.x - halfWidth, node.y - 25, width, 50);
          break;
        case 'rounded':
          ctx.beginPath();
          roundRect(ctx, node.x - halfWidth, node.y - 25, width, 50, 12);
          ctx.fill();
          ctx.stroke();
          break;
        case 'circle':
            ctx.beginPath();
            // 绘制椭圆，宽度根据size调整，高度80
            const radiusX = halfWidth; // 宽度的一半
            const radiusY = 40; // 高度的一半
            ctx.ellipse(node.x, node.y, radiusX, radiusY, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            break;
          case 'diamond':
            ctx.beginPath();
            // 绘制菱形，宽度根据size调整，高度80
            ctx.moveTo(node.x, node.y - 40); // 顶部点
            ctx.lineTo(node.x + halfWidth, node.y); // 右侧点
            ctx.lineTo(node.x, node.y + 40); // 底部点
            ctx.lineTo(node.x - halfWidth, node.y); // 左侧点
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            break;
      }

      // 绘制展开/折叠指示器
      if (node.children.length > 0) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // 根据节点大小计算右侧位置
        const sizeFactor = (node.size || 100) / 100;
        const halfWidth = 60 * sizeFactor;
        const indicatorX = node.x + halfWidth - 10; // 距离右侧边缘10px
        ctx.fillText(isExpanded ? '▼' : '►', indicatorX, node.y);
      }

      // 节点文本
      ctx.fillStyle = '#FFFFFF';
      // 应用字体样式
      let fontWeight = node.fontWeight || 'normal';
      let fontStyle = node.fontStyle || 'normal';
      let fontSize = node.fontSize || 14;
      ctx.font = `${fontWeight} ${fontStyle} ${fontSize}px -apple-system, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // 绘制文本
      ctx.fillText(node.title, node.x, node.y);
      // 绘制下划线
      if (node.textDecoration === 'underline') {
        const textMetrics = ctx.measureText(node.title);
        const textWidth = textMetrics.width;
        ctx.beginPath();
        ctx.moveTo(node.x - textWidth / 2, node.y + fontSize / 2);
        ctx.lineTo(node.x + textWidth / 2, node.y + fontSize / 2);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.stroke();
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
        if (node.children.length > 0) {
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

        // 节点文本
        ctx.fillStyle = '#FFFFFF';
        // 应用字体样式
        let fontWeight = node.fontWeight || 'normal';
        let fontStyle = node.fontStyle || 'normal';
        let fontSize = node.fontSize || 14;
        ctx.font = `${fontWeight} ${fontStyle} ${fontSize}px -apple-system, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // 绘制文本
        ctx.fillText(node.title, x, y);
        // 绘制下划线
        if (node.textDecoration === 'underline') {
          const textMetrics = ctx.measureText(node.title);
          const textWidth = textMetrics.width;
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

  // 当节点、缩放、平移、选中节点、展开节点或隐藏层级变化时重绘
  useEffect(() => {
    drawWithCanvas2D();
  }, [nodes, zoom, pan, selectedNode, expandedNodes, hiddenLevels, bubbleInfo]);

  // 处理鼠标按下（开始拖拽或长按节点移动）
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // 只处理鼠标左键（0）
    if (e.button !== 0) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseY = (e.clientY - rect.top - pan.y) / zoom;



    // 检查是否点击了节点
    let clickedOnNode = false;
    
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
        clickedOnNode = true;
        
        // 只有当节点有子节点时才切换展开/折叠状态
        if (node.children && node.children.length > 0) {
          // 计算三角形指示器的位置和区域
          const sizeFactor = (node.size || 100) / 100;
          const halfWidth = 60 * sizeFactor;
          const indicatorX = node.x + halfWidth - 10; // 距离右侧边缘10px
          const indicatorY = node.y;
          const indicatorSize = 12; // 字体大小
          
          // 检查点击是否在三角形指示器区域内
          const isClickOnIndicator = mouseX >= indicatorX - indicatorSize/2 && 
                                    mouseX <= indicatorX + indicatorSize/2 && 
                                    mouseY >= indicatorY - indicatorSize/2 && 
                                    mouseY <= indicatorY + indicatorSize/2;
          
          // 只有点击在三角形指示器上时才切换展开/折叠状态
          if (isClickOnIndicator) {
            // 单击切换展开/折叠状态
            const isExpanded = expandedNodes.has(node.id);
            onNodeExpand(node.id, !isExpanded);
          }
        }
        
        // 防止根节点被拖拽
        if (node.id !== 'root') {
          // 设置长按计时器用于节点移动
          const timer = setTimeout(() => {
            setIsNodeDragging(true);
            setDraggedNode(node.id);
            setDragStart({ x: e.clientX, y: e.clientY });
            // 更新实时跟踪的引用
            isNodeDraggingRef.current = true;
            draggedNodeRef.current = node.id;
          }, 500); // 500ms 长按
          
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

    // 检查是否点击了节点
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
        // 双击节点时设置选中状态，显示右键点击的边框效果
        onNodeSelect(node.id);
        // 计算气泡的最优位置
        const bubbleDirection = calculateBubbleDirection(node);
        onBubbleInfoChange({
          nodeId: node.id,
          position: { x: node.x, y: node.y },
          direction: bubbleDirection,
          showContent: false // 默认显示摘要
        });
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
    // 检测鼠标是否悬停在三角形指示器上
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseY = (e.clientY - rect.top - pan.y) / zoom;
      
      let isOverIndicator = false;
      
      // 检查是否悬停在任何节点的三角形指示器上
      for (const node of nodes) {
        if (node.children && node.children.length > 0) {
          // 计算三角形指示器的位置和区域
          const sizeFactor = (node.size || 100) / 100;
          const halfWidth = 60 * sizeFactor;
          const indicatorX = node.x + halfWidth - 10; // 距离右侧边缘10px
          const indicatorY = node.y;
          const indicatorSize = 12; // 字体大小
          
          // 检查鼠标是否在三角形指示器区域内
          if (mouseX >= indicatorX - indicatorSize/2 && 
              mouseX <= indicatorX + indicatorSize/2 && 
              mouseY >= indicatorY - indicatorSize/2 && 
              mouseY <= indicatorY + indicatorSize/2) {
            isOverIndicator = true;
            break;
          }
        }
      }
      
      // 根据悬停状态改变鼠标样式
      canvas.style.cursor = isOverIndicator ? 'pointer' : 'grab';
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
