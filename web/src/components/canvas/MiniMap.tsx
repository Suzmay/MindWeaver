import React, { useRef, useEffect, useState } from 'react';
import { MindMapNode } from '../../models/Work';

interface MiniMapProps {
  nodes: MindMapNode[];
  zoom: number;
  pan: { x: number; y: number };
  onPanChange: (pan: { x: number; y: number }) => void;
  onZoomChange: (zoom: number) => void;
  expandedNodes: Set<string>;
  hiddenLevels: Set<number>;
  canvasSize: { width: number; height: number };
}

export const MiniMap: React.FC<MiniMapProps> = ({
  nodes,
  zoom,
  pan,
  onPanChange,
  onZoomChange,
  expandedNodes,
  hiddenLevels,
  canvasSize,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // 计算节点的边界，用于自动调整迷你地图的缩放和位置
  const calculateNodesBounds = () => {
    if (nodes.length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 100, height: 100 };
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    nodes.forEach(node => {
      minX = Math.min(minX, node.x - 60); // 考虑节点宽度
      maxX = Math.max(maxX, node.x + 60);
      minY = Math.min(minY, node.y - 30); // 考虑节点高度
      maxY = Math.max(maxY, node.y + 30);
    });

    // 确保边界有一定的边距
    const padding = 50;
    minX -= padding;
    maxX += padding;
    minY -= padding;
    maxY += padding;

    const width = maxX - minX;
    const height = maxY - minY;

    return { minX, maxX, minY, maxY, width, height };
  };

  // 绘制迷你地图
  const drawMiniMap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 计算节点边界
    const bounds = calculateNodesBounds();

    // 计算迷你地图的缩放和偏移
    const miniMapWidth = canvas.width - 20; // 留出边距
    const miniMapHeight = canvas.height - 20;
    
    // 计算适应迷你地图的缩放比例
    const scaleX = miniMapWidth / bounds.width;
    const scaleY = miniMapHeight / bounds.height;
    const scale = Math.min(scaleX, scaleY, 0.2); // 限制最大缩放

    // 计算中心偏移
    const offsetX = (canvas.width - bounds.width * scale) / 2;
    const offsetY = (canvas.height - bounds.height * scale) / 2;

    // 绘制连接线
    nodes.forEach((node) => {
      const isExpanded = expandedNodes.has(node.id);
      if (isExpanded) {
        node.children.forEach((childId) => {
          const child = nodes.find((n) => n.id === childId);
          if (child && !hiddenLevels.has(child.level || 0)) {
            ctx.strokeStyle = node.color;
            ctx.lineWidth = 2;
            
            // 根据连接类型设置线条样式
            if (node.connectionType === 'dashed') {
              ctx.setLineDash([3, 2]);
            } else {
              ctx.setLineDash([]);
            }
            
            ctx.beginPath();
            if (node.connectionType === 'straight') {
              // 绘制直线
              ctx.moveTo(
                (node.x - bounds.minX) * scale + offsetX,
                (node.y - bounds.minY) * scale + offsetY
              );
              ctx.lineTo(
                (child.x - bounds.minX) * scale + offsetX,
                (child.y - bounds.minY) * scale + offsetY
              );
            } else if (node.connectionType === 'wavy') {
              // 绘制波浪线
              const dx = (child.x - node.x) * scale;
              const dy = (child.y - node.y) * scale;
              const distance = Math.sqrt(dx * dx + dy * dy);
              const waveCount = Math.max(2, Math.floor(distance / 20));
              const waveHeight = 5;
              
              const startX = (node.x - bounds.minX) * scale + offsetX;
              const startY = (node.y - bounds.minY) * scale + offsetY;
              
              ctx.moveTo(startX, startY);
              
              for (let i = 1; i <= waveCount; i++) {
                const t = i / waveCount;
                const x = startX + dx * t;
                const y = startY + dy * t + Math.sin(t * Math.PI * 2 * waveCount) * waveHeight;
                
                if (i === 1) {
                  ctx.lineTo(x, y);
                } else {
                  const prevT = (i - 1) / waveCount;
                  const prevX = startX + dx * prevT;
                  const prevY = startY + dy * prevT + Math.sin(prevT * Math.PI * 2 * waveCount) * waveHeight;
                  
                  const midX = (prevX + x) / 2;
                  const midY = (prevY + y) / 2;
                  
                  ctx.quadraticCurveTo(prevX, prevY, midX, midY);
                }
              }
              
              ctx.lineTo(
                (child.x - bounds.minX) * scale + offsetX,
                (child.y - bounds.minY) * scale + offsetY
              );
            } else {
              // 绘制曲线（默认）
              const startX = (node.x - bounds.minX) * scale + offsetX;
              const startY = (node.y - bounds.minY) * scale + offsetY;
              const endX = (child.x - bounds.minX) * scale + offsetX;
              const endY = (child.y - bounds.minY) * scale + offsetY;
              
              ctx.moveTo(startX, startY);
              ctx.quadraticCurveTo(
                (startX + endX) / 2,
                (startY + endY) / 2 - 10,
                endX,
                endY
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
      // 检查节点是否应该可见
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

      if (!shouldDraw) return;

      // 绘制节点
      ctx.fillStyle = node.color;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;

      const nodeX = (node.x - bounds.minX) * scale + offsetX;
      const nodeY = (node.y - bounds.minY) * scale + offsetY;

      // 绘制节点圆形
      ctx.beginPath();
      ctx.arc(nodeX, nodeY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 绘制节点文本（只显示前几个字符）
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '8px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const truncatedText = node.title.length > 8 ? node.title.substring(0, 8) + '...' : node.title;
      ctx.fillText(truncatedText, nodeX + 8, nodeY);
    });

    // 计算当前视图在迷你地图中的位置和大小
    const viewWidth = canvasSize.width / zoom;
    const viewHeight = canvasSize.height / zoom;
    const viewX = -pan.x / zoom;
    const viewY = -pan.y / zoom;

    // 计算绿色框的位置和大小
    let greenBoxX = (viewX - bounds.minX) * scale + offsetX;
    let greenBoxY = (viewY - bounds.minY) * scale + offsetY;
    let greenBoxWidth = viewWidth * scale;
    let greenBoxHeight = viewHeight * scale;

    // 确保绿色框在迷你地图范围内
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // 限制绿色框的边界
    greenBoxX = Math.max(0, Math.min(greenBoxX, canvasWidth));
    greenBoxY = Math.max(0, Math.min(greenBoxY, canvasHeight));
    greenBoxWidth = Math.max(1, Math.min(greenBoxWidth, canvasWidth - greenBoxX));
    greenBoxHeight = Math.max(1, Math.min(greenBoxHeight, canvasHeight - greenBoxY));

    // 绘制当前视图区域（绿色框）
    ctx.strokeStyle = '#10B981'; // 绿色
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 2]); // 虚线
    ctx.strokeRect(
      greenBoxX,
      greenBoxY,
      greenBoxWidth,
      greenBoxHeight
    );
    ctx.setLineDash([]); // 恢复实线
  };

  // 处理鼠标按下事件
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  // 处理鼠标移动事件
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      // 计算节点边界
      const bounds = calculateNodesBounds();

      // 计算迷你地图的缩放比例
      const canvas = canvasRef.current;
      if (!canvas) return;

      const miniMapWidth = canvas.width - 20;
      const miniMapHeight = canvas.height - 20;
      const scaleX = miniMapWidth / bounds.width;
      const scaleY = miniMapHeight / bounds.height;
      const scale = Math.min(scaleX, scaleY, 0.2);

      // 计算主画布的移动距离
      const mainDeltaX = (deltaX / scale) * zoom;
      const mainDeltaY = (deltaY / scale) * zoom;

      onPanChange({ x: pan.x - mainDeltaX, y: pan.y - mainDeltaY });
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  // 处理鼠标释放事件
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 处理鼠标滚轮事件（缩放）
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    // 计算缩放方向
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(3, zoom * delta));
    onZoomChange(newZoom);
  };

  // 处理双击事件（放大到200%）
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // 计算节点边界
    const bounds = calculateNodesBounds();

    // 计算迷你地图的缩放比例
    const miniMapWidth = canvas.width - 20;
    const miniMapHeight = canvas.height - 20;
    const scaleX = miniMapWidth / bounds.width;
    const scaleY = miniMapHeight / bounds.height;
    const scale = Math.min(scaleX, scaleY, 0.2);

    // 计算中心偏移
    const offsetX = (canvas.width - bounds.width * scale) / 2;
    const offsetY = (canvas.height - bounds.height * scale) / 2;

    // 计算双击位置对应的主界面坐标
    const mainX = (mouseX - offsetX) / scale + bounds.minX;
    const mainY = (mouseY - offsetY) / scale + bounds.minY;

    // 计算新的pan位置，使双击位置居中
    const newPanX = -mainX * 2 + canvasSize.width / 2;
    const newPanY = -mainY * 2 + canvasSize.height / 2;

    // 设置缩放为200%并更新位置
    onZoomChange(2);
    onPanChange({ x: newPanX, y: newPanY });
  };

  // 当节点、缩放、平移等发生变化时重绘
  useEffect(() => {
    drawMiniMap();
  }, [nodes, zoom, pan, expandedNodes, hiddenLevels, canvasSize]);

  // 处理画布大小变化
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = 192; // 48 * 4
      canvas.height = 128; // 32 * 4
      drawMiniMap();
    }
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
    />
  );
};
