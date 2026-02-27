import React, { useRef, useEffect, useState } from 'react';
import { MindMapNode } from '../../models/Work';

interface CanvasRendererProps {
  nodes: MindMapNode[];
  zoom: number;
  pan: { x: number; y: number };
  onPanChange: (pan: { x: number; y: number }) => void;
  selectedNode: string | null;
  onCanvasClick: () => void;
  expandedNodes: Set<string>;
  onNodeExpand: (nodeId: string, expanded: boolean) => void;
  onNodeMove: (nodeId: string, x: number, y: number) => void;
  onNodeMenu: (nodeId: string, x: number, y: number) => void;
  hiddenLevels: Set<number>;
}

export const CanvasRenderer: React.FC<CanvasRendererProps> = ({
  nodes,
  zoom,
  pan,
  onPanChange,
  selectedNode,
  onCanvasClick,
  expandedNodes,
  onNodeExpand,
  onNodeMove,
  onNodeMenu,
  hiddenLevels,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const webglCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isWebGLAvailable, setIsWebGLAvailable] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isNodeDragging, setIsNodeDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);
  // 使用 refs 进行实时位置跟踪，避免 React 状态延迟
  const draggedNodePositionRef = useRef<{ x: number; y: number } | null>(null);
  const isNodeDraggingRef = useRef(false);
  const draggedNodeRef = useRef<string | null>(null);

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
    ctx.strokeStyle = '#f0f0f0';
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
            if (node.connectionType === 'dashed') {
              ctx.setLineDash([5, 5]);
            } else {
              ctx.setLineDash([]);
            }
            
            ctx.beginPath();
            if (node.connectionType === 'straight') {
              // 绘制直线
              ctx.moveTo(parentX, parentY);
              ctx.lineTo(childX, childY);
            } else if (node.connectionType === 'wavy') {
              // 绘制波浪线
              const dx = childX - parentX;
              const dy = childY - parentY;
              const distance = Math.sqrt(dx * dx + dy * dy);
              const waveCount = Math.max(3, Math.floor(distance / 50));
              const waveHeight = 15;
              
              ctx.moveTo(parentX, parentY);
              
              for (let i = 1; i <= waveCount; i++) {
                const t = i / waveCount;
                const x = parentX + dx * t;
                const y = parentY + dy * t + Math.sin(t * Math.PI * 2 * waveCount) * waveHeight;
                
                if (i === 1) {
                  ctx.lineTo(x, y);
                } else {
                  const prevT = (i - 1) / waveCount;
                  const prevX = parentX + dx * prevT;
                  const prevY = parentY + dy * prevT + Math.sin(prevT * Math.PI * 2 * waveCount) * waveHeight;
                  
                  const midX = (prevX + x) / 2;
                  const midY = (prevY + y) / 2;
                  
                  ctx.quadraticCurveTo(prevX, prevY, midX, midY);
                }
              }
              
              ctx.lineTo(childX, childY);
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
      
      // 检查节点是否应该可见（根节点或父节点已展开且层级未隐藏）
      let shouldDraw = node.id === 'root';
      if (!shouldDraw) {
        // 查找父节点
        for (const potentialParent of nodes) {
          if (potentialParent.children.includes(node.id)) {
            shouldDraw = expandedNodes.has(potentialParent.id) && !hiddenLevels.has(node.level || 0);
            break;
          }
        }
      }
      
      // 如果节点不应该可见，则跳过绘制
      if (!shouldDraw) return;
      
      const isSelected = selectedNode === node.id;
      const isExpanded = expandedNodes.has(node.id);

      // 节点背景
      ctx.fillStyle = node.color;
      ctx.strokeStyle = isSelected ? '#1E40AF' : node.color;
      ctx.lineWidth = isSelected ? 3 : 1;

      switch (node.shape) {
        case 'rectangle':
          ctx.fillRect(node.x - 60, node.y - 25, 120, 50);
          ctx.strokeRect(node.x - 60, node.y - 25, 120, 50);
          break;
        case 'rounded':
          ctx.beginPath();
          roundRect(ctx, node.x - 60, node.y - 25, 120, 50, 12);
          ctx.fill();
          ctx.stroke();
          break;
        case 'circle':
          ctx.beginPath();
          ctx.arc(node.x, node.y, 40, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          break;
        case 'cloud':
          ctx.beginPath();
          drawCloud(ctx, node.x, node.y, 60, 40);
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
        ctx.fillText(isExpanded ? '▼' : '►', node.x + 50, node.y);
      }

      // 节点文本
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '14px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.title, node.x, node.y);
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

        switch (node.shape) {
          case 'rectangle':
            ctx.fillRect(x - 60, y - 25, 120, 50);
            ctx.strokeRect(x - 60, y - 25, 120, 50);
            break;
          case 'rounded':
            ctx.beginPath();
            roundRect(ctx, x - 60, y - 25, 120, 50, 12);
            ctx.fill();
            ctx.stroke();
            break;
          case 'circle':
            ctx.beginPath();
            ctx.arc(x, y, 40, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            break;
          case 'cloud':
            ctx.beginPath();
            drawCloud(ctx, x, y, 60, 40);
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
          ctx.fillText(isExpanded ? '▼' : '►', x + 50, y);
        }

        // 节点文本
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '14px -apple-system, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.title, x, y);
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

  // 绘制云形状的辅助函数
  const drawCloud = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    // 计算参数
    const leftRadius = w * 0.4; // 左侧大圆半径为整体宽度的40%
    const rightRadius = w * 0.28; // 右侧小圆半径为整体宽度的28%
    const centerDistance = (leftRadius + rightRadius) * 0.6; // 圆心水平间距为两圆半径之和的60%
    
    // 计算圆心位置
    const leftCenterX = x - centerDistance / 2;
    const rightCenterX = x + centerDistance / 2;
    const centerY = y - h / 4; // 顶部圆心Y坐标
    
    // 计算底部直线位置
    const bottomY = y + h / 2;
    
    // 绘制左侧大圆
    ctx.arc(leftCenterX, centerY, leftRadius, 0, Math.PI * 2, false);
    
    // 绘制右侧小圆
    ctx.arc(rightCenterX, centerY, rightRadius, 0, Math.PI * 2, false);
    
    // 绘制底部直线
    ctx.moveTo(leftCenterX - leftRadius, bottomY);
    ctx.lineTo(rightCenterX + rightRadius, bottomY);
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
  }, [nodes, zoom, pan, selectedNode, expandedNodes, hiddenLevels]);

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
      
      switch (node.shape) {
        case 'rectangle':
          isClicked = mouseX >= node.x - 60 && mouseX <= node.x + 60 &&
                     mouseY >= node.y - 25 && mouseY <= node.y + 25;
          break;
        case 'rounded':
          isClicked = mouseX >= node.x - 60 && mouseX <= node.x + 60 &&
                     mouseY >= node.y - 25 && mouseY <= node.y + 25;
          break;
        case 'circle':
          const distance = Math.sqrt((mouseX - node.x) ** 2 + (mouseY - node.y) ** 2);
          isClicked = distance <= 40;
          break;
        case 'cloud':
          isClicked = mouseX >= node.x - 80 && mouseX <= node.x + 80 &&
                     mouseY >= node.y - 60 && mouseY <= node.y + 60;
          break;
      }

      if (isClicked) {
        clickedOnNode = true;
        
        // 单击切换展开/折叠状态
        const isExpanded = expandedNodes.has(node.id);
        onNodeExpand(node.id, !isExpanded);
        
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

    // 如果没有点击节点，则开始画布拖拽
    if (!clickedOnNode) {
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
      
      switch (node.shape) {
        case 'rectangle':
          isClicked = mouseX >= node.x - 60 && mouseX <= node.x + 60 &&
                     mouseY >= node.y - 25 && mouseY <= node.y + 25;
          break;
        case 'rounded':
          isClicked = mouseX >= node.x - 60 && mouseX <= node.x + 60 &&
                     mouseY >= node.y - 25 && mouseY <= node.y + 25;
          break;
        case 'circle':
          const distance = Math.sqrt((mouseX - node.x) ** 2 + (mouseY - node.y) ** 2);
          isClicked = distance <= 40;
          break;
        case 'cloud':
          isClicked = mouseX >= node.x - 80 && mouseX <= node.x + 80 &&
                     mouseY >= node.y - 60 && mouseY <= node.y + 60;
          break;
      }

      if (isClicked) {
        // 打开节点上下文菜单
        onNodeMenu(node.id, e.clientX, e.clientY);
        break;
      }
    }
  };



  // 处理鼠标移动（拖拽期间）
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
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
      />
    </div>
  );
};
