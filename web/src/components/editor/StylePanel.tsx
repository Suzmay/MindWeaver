import React, { useEffect, useRef } from 'react';
import { MindMapNode } from '../../models/Work';
import { Square, Circle, Cloud, Palette, Type, Image, X, SlidersHorizontal, Spline, AudioWaveform } from 'lucide-react';

import {
  Slider,
} from '../ui/slider';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../ui/tabs';
import {
  Input,
} from '../ui/input';
import {
  Label,
} from '../ui/label';
import {
  Button,
} from '../ui/button';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';


interface StylePanelProps {
  selectedNodes: string[];
  nodes: MindMapNode[];
  onStyleChange: (nodeIds: string[], style: {
    shape?: 'rectangle' | 'rounded' | 'circle' | 'cloud';
    color?: string;
    fontSize?: number;
    icon?: string;
    connectionType?: 'straight' | 'curved' | 'dashed';
  }) => void;
  onTextChange: (nodeId: string, text: string) => void;
  onContentChange: (nodeId: string, content: string) => void;
  isOpen: boolean;
  onClose: () => void;
  canvasWidth?: number;
  zoom?: number;
  pan?: { x: number; y: number };
  canvasContainerRef?: React.RefObject<HTMLDivElement>;
}

const COLORS = [
  '#14B8A6', // Teal
  '#0EA5E9', // Blue
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F43F5E', // Red
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#64748B', // Gray
  '#1E293B', // Dark
];

const SHAPES = [
  { value: 'rounded', label: '圆角矩形', icon: Square },
  { value: 'rectangle', label: '矩形', icon: Square },
  { value: 'circle', label: '圆形', icon: Circle },
  { value: 'cloud', label: '云形', icon: Cloud },
];

const CONNECTION_TYPES = [
  { value: 'straight', label: '直线', icon: 'straight' },
  { value: 'dashed', label: '虚线', icon: 'dashed' },
  { value: 'curved', label: '曲线', icon: 'curve' },
  { value: 'wavy', label: '波浪线', icon: 'wavy' },
];







export const StylePanel: React.FC<StylePanelProps> = ({
  selectedNodes,
  nodes,
  onStyleChange,
  onTextChange,
  onContentChange,
  isOpen,
  onClose,
  canvasWidth = window.innerWidth * 0.8,
  zoom = 1,
  pan = { x: 0, y: 0 },
  canvasContainerRef,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [panelPositionState, setPanelPositionState] = React.useState<Record<string, string>>({});
  const longPressTimer = React.useRef<number | null>(null);
  const dragOffset = React.useRef({ x: 0, y: 0 });
  const rafRef = React.useRef<number | null>(null);
  const draggingRef = React.useRef(false);

  useEffect(() => {
    if (isOpen) {
      const handleClickOutside = (event: MouseEvent) => {
        if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
          onClose();
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  // 当面板打开时初始化面板位置状态
  useEffect(() => {
    if (isOpen) {
      setPanelPositionState(calculatePanelPosition());
    }
  }, [isOpen, nodes, selectedNodes, pan, zoom, canvasContainerRef]);

  // 处理鼠标按下事件（长按开始拖动）
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // 只处理左键点击（0）
    if (e.button !== 0) return;
    
    // 检查点击是否在输入框或其他交互元素上
    const target = e.target as HTMLElement;
    const isInteractiveElement = target.tagName === 'INPUT' || 
                                target.tagName === 'BUTTON' || 
                                target.tagName === 'SELECT' || 
                                target.tagName === 'TEXTAREA' || 
                                target.isContentEditable ||
                                target.classList.contains('cursor-pointer');
    
    if (isInteractiveElement) {
      // 如果点击在交互元素上，不开始拖动
      return;
    }
    
    // 防止拖动过程中选择文本
    e.preventDefault();
    
    // 设置长按定时器以开始拖动
    const timer = window.setTimeout(() => {
      setIsDragging(true);
      draggingRef.current = true;
      
      // 计算鼠标到面板原点的偏移量
      if (panelRef.current) {
        const rect = panelRef.current.getBoundingClientRect();
        dragOffset.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
        
        // 添加全局鼠标移动和释放监听器
        document.addEventListener('mousemove', handleGlobalMouseMove);
        document.addEventListener('mouseup', handleGlobalMouseUp);
      }
      
      // 在拖动过程中全局禁用文本选择
      document.body.style.userSelect = 'none';
    }, 500); // 500ms长按
    
    longPressTimer.current = timer;
  };

  // 处理全局鼠标移动事件（拖动过程中）
  const handleGlobalMouseMove = (e: MouseEvent) => {
    if (!draggingRef.current || !panelRef.current) return;
    
    // 防止拖动过程中选择文本
    e.preventDefault();
    
    // 取消之前的动画帧以避免累积
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    
    // 使用requestAnimationFrame实现更平滑的拖动
    rafRef.current = requestAnimationFrame(() => {
      if (!panelRef.current) return;
      
      // 计算新位置
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;
      
      // 直接操作DOM以获得即时响应
      panelRef.current.style.left = `${newX}px`;
      panelRef.current.style.top = `${newY}px`;
      panelRef.current.style.right = 'auto';
      panelRef.current.style.bottom = 'auto';
      
      // 更新状态以保持一致性（但DOM已经更新）
      setPanelPositionState({
        left: `${newX}px`,
        top: `${newY}px`
      });
    });
  };

  // 处理全局鼠标释放事件（结束拖动）
  const handleGlobalMouseUp = () => {
    // 如果存在长按定时器则清除
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    // 取消任何待处理的动画帧
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    
    // 移除全局事件监听器
    document.removeEventListener('mousemove', handleGlobalMouseMove);
    document.removeEventListener('mouseup', handleGlobalMouseUp);
    
    // 重新启用文本选择
    document.body.style.userSelect = '';
    
    // 重置拖动状态
    draggingRef.current = false;
    setIsDragging(false);
  };

  // 处理鼠标移动事件（为了兼容性）
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      // 防止拖动过程中选择文本
      e.preventDefault();
    }
  };

  if (!isOpen || selectedNodes.length === 0) return null;

  // 获取第一个选中的节点作为参考
  const referenceNode = nodes.find((node) => node.id === selectedNodes[0]);
  if (!referenceNode) return null;

  // 计算样式面板的宽度和高度以避免滚动
  const panelWidth = Math.min(550, canvasWidth * 0.45); // 为额外的选项卡增加宽度
  const panelHeight = Math.min(700, window.innerHeight - 150); // 增加高度

  // 计算节点在屏幕上的位置
  const getNodeScreenPosition = (node: MindMapNode) => {
    if (!canvasContainerRef?.current) {
      return { x: 0, y: 0 };
    }
    
    const containerRect = canvasContainerRef.current.getBoundingClientRect();
    const nodeScreenX = containerRect.left + pan.x + node.x * zoom;
    const nodeScreenY = containerRect.top + pan.y + node.y * zoom;
    
    return { x: nodeScreenX, y: nodeScreenY };
  };

  // 计算面板位置以避免与选中的节点重叠并保持在画布内
  const calculatePanelPosition = () => {
    if (!canvasContainerRef?.current) {
      return {
        right: '4rem',
        top: '5rem'
      };
    }
    
    const containerRect = canvasContainerRef.current.getBoundingClientRect();
    const nodePos = getNodeScreenPosition(referenceNode);
    const nodeWidth = 150 * zoom; // 估计节点宽度
    const nodeHeight = 60 * zoom; // 估计节点高度
    
    // 默认位置：画布右侧
    const position: Record<string, string> = {
      right: '4rem',
      top: '5rem'
    };
    
    // 检查默认位置是否与节点重叠
    let panelLeft = window.innerWidth - parseInt(position.right) - panelWidth;
    let panelTop = parseInt(position.top);
    
    const nodeRight = nodePos.x + nodeWidth;
    const nodeBottom = nodePos.y + nodeHeight;
    
    // 检查是否重叠
    const isOverlapping = (
      panelLeft < nodeRight &&
      panelLeft + panelWidth > nodePos.x &&
      panelTop < nodeBottom &&
      panelTop + panelHeight > nodePos.y
    );
    
    if (isOverlapping) {
      // 清除之前的位置
      Object.keys(position).forEach(key => delete position[key]);
      
      // 尝试将面板放在画布左侧
      if (nodePos.x > panelWidth + 20 && containerRect.left + 20 + panelWidth < nodePos.x) {
        position.left = '4rem';
        position.top = '5rem';
        panelLeft = parseInt(position.left);
      }
      // 尝试将面板放在画布下方
      else if (nodePos.y + nodeHeight + panelHeight + 20 < containerRect.bottom) {
        position.right = '4rem';
        position.top = `${nodePos.y + nodeHeight + 20}px`;
        panelTop = parseInt(position.top);
      }
      // 尝试将面板放在画布上方
      else if (nodePos.y - panelHeight - 20 > containerRect.top) {
        position.right = '4rem';
        position.top = `${nodePos.y - panelHeight - 20}px`;
        panelTop = parseInt(position.top);
      }
      //  fallback: 画布右下角
      else {
        position.right = '4rem';
        position.bottom = '2rem';
      }
    }
    
    // 确保面板保持在画布边界内
    const ensureWithinCanvas = () => {
      let adjustedPosition = { ...position };
      
      // 计算当前面板位置
      let currentLeft = window.innerWidth - (position.right ? parseInt(position.right) : 0) - panelWidth;
      if (position.left) {
        currentLeft = parseInt(position.left);
      }
      
      let currentTop = position.top ? parseInt(position.top) : window.innerHeight - (position.bottom ? parseInt(position.bottom) : 0) - panelHeight;
      
      // 调整以保持在画布左侧边界内
      if (currentLeft < containerRect.left + 20) {
        Object.keys(adjustedPosition).forEach(key => {
          if (key === 'left' || key === 'right') {
            delete adjustedPosition[key];
          }
        });
        adjustedPosition.left = `${containerRect.left + 20}px`;
      }
      
      // 调整以保持在画布右侧边界内
      if (currentLeft + panelWidth > containerRect.right - 20) {
        Object.keys(adjustedPosition).forEach(key => {
          if (key === 'left' || key === 'right') {
            delete adjustedPosition[key];
          }
        });
        adjustedPosition.right = `${window.innerWidth - (containerRect.right - 20)}px`;
      }
      
      // 调整以保持在画布顶部边界内
      if (currentTop < containerRect.top + 20) {
        Object.keys(adjustedPosition).forEach(key => {
          if (key === 'top' || key === 'bottom') {
            delete adjustedPosition[key];
          }
        });
        adjustedPosition.top = `${containerRect.top + 20}px`;
      }
      
      // 调整以保持在画布底部边界内
      if (currentTop + panelHeight > containerRect.bottom - 20) {
        Object.keys(adjustedPosition).forEach(key => {
          if (key === 'top' || key === 'bottom') {
            delete adjustedPosition[key];
          }
        });
        adjustedPosition.bottom = `${window.innerHeight - (containerRect.bottom - 20)}px`;
      }
      
      return adjustedPosition;
    };
    
    return ensureWithinCanvas();
  };

  // 计算初始面板位置（用于状态初始化）
  // const panelPosition = calculatePanelPosition(); // 不直接使用，但函数在useEffect中被调用

  const handleShapeChange = (shape: 'rectangle' | 'rounded' | 'circle' | 'cloud') => {
    onStyleChange(selectedNodes, { shape });
  };

  const handleColorChange = (color: string) => {
    onStyleChange(selectedNodes, { color });
  };

  const handleFontSizeChange = (fontSize: number[]) => {
    onStyleChange(selectedNodes, { fontSize: fontSize[0] });
  };

  const handleMaterialChange = (material: string) => {
    onStyleChange(selectedNodes, { icon: material });
  };

  const handleConnectionChange = (connectionType: 'straight' | 'curved' | 'dashed') => {
    onStyleChange(selectedNodes, { connectionType });
  };

  // 处理面板上的鼠标释放事件
  const handleMouseUp = () => {
    // 如果存在长按定时器则清除
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <div 
      ref={panelRef}
      className={`fixed bg-card border border-primary/20 rounded-2xl shadow-lg p-5 z-40 overflow-x-auto overflow-y-hidden max-h-[calc(100vh-120px)] ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        width: `${panelWidth}px`,
        minHeight: '500px',
        maxHeight: `${panelHeight}px`,
        ...panelPositionState,
        willChange: 'transform, left, top'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-primary/10">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">样式面板</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 rounded-full hover:bg-primary/10">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex-1 flex overflow-x-auto">
          <Tabs defaultValue="shape" className="w-full flex flex-col">
            <TabsList className="flex mb-4 gap-2 bg-muted/50 rounded-xl p-1 overflow-x-auto h-12">
              <TabsTrigger value="shape" className="rounded-lg flex items-center gap-2 h-10 transition-all whitespace-nowrap hover:bg-primary/10">
                <Square className="w-5 h-5" />
                <span>形状</span>
              </TabsTrigger>
              <TabsTrigger value="connection" className="rounded-lg flex items-center gap-2 h-10 transition-all whitespace-nowrap hover:bg-primary/10">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                <span>连接线</span>
              </TabsTrigger>
              <TabsTrigger value="color" className="rounded-lg flex items-center gap-2 h-10 transition-all whitespace-nowrap hover:bg-primary/10">
                <Palette className="w-5 h-5" />
                <span>颜色</span>
              </TabsTrigger>
              <TabsTrigger value="title" className="rounded-lg flex items-center gap-2 h-10 transition-all whitespace-nowrap hover:bg-primary/10">
                <Type className="w-5 h-5" />
                <span>标题</span>
              </TabsTrigger>
              <TabsTrigger value="content" className="rounded-lg flex items-center gap-2 h-10 transition-all whitespace-nowrap hover:bg-primary/10">
                <Type className="w-5 h-5" />
                <span>内容</span>
              </TabsTrigger>
              <TabsTrigger value="icon" className="rounded-lg flex items-center gap-2 h-10 transition-all whitespace-nowrap hover:bg-primary/10">
                <Image className="w-5 h-5" />
                <span>素材</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="shape" className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 gap-4 w-full">
                <Card className="border border-primary/10 shadow-sm w-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">节点形状</CardTitle>
                    <CardDescription className="text-xs">选择节点的基本形状</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {SHAPES.map((shape) => {
                        const IconComponent = shape.icon;
                        return (
                          <Button
                            key={shape.value}
                            variant={referenceNode.shape === shape.value ? 'default' : 'outline'}
                            className="justify-start h-12 rounded-lg transition-all"
                            onClick={() => handleShapeChange(shape.value as any)}
                          >
                            <IconComponent className="w-5 h-5 mr-2" />
                            {shape.label}
                          </Button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="connection" className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 gap-4 w-full">
                <Card className="border border-primary/10 shadow-sm w-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">连接线形式</CardTitle>
                    <CardDescription className="text-xs">选择节点之间连接线的样式</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-3">
                      {CONNECTION_TYPES.map((connection) => (
                        <Button
                          key={connection.value}
                          variant={referenceNode.connectionType === connection.value ? 'default' : 'outline'}
                          className="justify-start h-12 rounded-lg transition-all"
                          onClick={() => handleConnectionChange(connection.value as any)}
                        >
                            {connection.value === 'straight' && (
                              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 12h16" />
                              </svg>
                            )}
                            {connection.value === 'dashed' && (
                              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5">
                                <path d="M2 12h20" />
                              </svg>
                            )}
                            {connection.value === 'curved' && (
                              <Spline className="w-5 h-5 mr-2" />
                            )}
                            {connection.value === 'wavy' && (
                              <AudioWaveform className="w-5 h-5 mr-2" />
                            )}
                          {connection.label}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="color" className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 gap-4 w-full">
                <Card className="border border-primary/10 shadow-sm w-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">节点颜色</CardTitle>
                    <CardDescription className="text-xs">选择节点的背景颜色</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3 mb-8">
                      {COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`w-10 h-10 rounded-full border-2 transition-all flex-shrink-0 ${referenceNode.color === color ? 'border-primary ring-2 ring-primary/30 scale-110' : 'border-transparent hover:border-border hover:scale-105'}`}
                          style={{ backgroundColor: color }}
                          onClick={() => handleColorChange(color)}
                          aria-label={`选择颜色 ${color}`}
                        />
                      ))}
                    </div>

                    <div className="space-y-3 pt-6">
                      <Label className="text-sm font-medium">自定义颜色</Label>
                      <div className="flex gap-3">
                        <Input
                          type="color"
                          value={referenceNode.color}
                          onChange={(e) => handleColorChange(e.target.value)}
                          className="w-14 h-14 p-0 border-2 rounded-lg"
                        />
                        <Input
                          type="text"
                          value={referenceNode.color}
                          onChange={(e) => handleColorChange(e.target.value)}
                          className="flex-1 rounded-lg border-2"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

        
              </div>
            </TabsContent>

            <TabsContent value="title" className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 gap-4 w-full">
                <Card className="border border-primary/10 shadow-sm w-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">标题内容</CardTitle>
                    <CardDescription className="text-xs">修改节点的标题内容</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm">节点标题</Label>
                      <Input
                        value={referenceNode.title || ''}
                        onChange={(e) => onTextChange(referenceNode.id, e.target.value)}
                        className="rounded-lg border-2"
                        placeholder="输入节点标题"
                      />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border border-primary/10 shadow-sm w-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">字体设置</CardTitle>
                    <CardDescription className="text-xs">调整节点文本的样式</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm">字体大小</Label>
                        <span className="text-xs font-medium text-muted-foreground">{referenceNode.fontSize || 14}px</span>
                      </div>
                      <Slider
                        defaultValue={[referenceNode.fontSize || 14]}
                        min={8}
                        max={32}
                        step={1}
                        onValueChange={handleFontSizeChange}
                        className="pt-2"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="outline" className="h-9">
                        <Type className="w-4 h-4 mr-2" />
                        粗体
                      </Button>
                      <Button variant="outline" className="h-9">
                        <Type className="w-4 h-4 mr-2" />
                        斜体
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="content" className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 gap-4 w-full">
                <Card className="border border-primary/10 shadow-sm w-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">节点内容</CardTitle>
                    <CardDescription className="text-xs">修改节点的详细内容</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm">节点内容</Label>
                      <Input
                        value={referenceNode.content || ''}
                        onChange={(e) => onContentChange(referenceNode.id, e.target.value)}
                        className="rounded-lg border-2"
                        placeholder="输入节点内容"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="icon" className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 gap-4 w-full">
                <Card className="border border-primary/10 shadow-sm w-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">节点素材</CardTitle>
                    <CardDescription className="text-xs">为节点添加素材</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Input
                        placeholder="输入素材名称"
                        onChange={(e) => handleMaterialChange(e.target.value)}
                        className="rounded-lg"
                      />
                      
                      <div className="p-4 bg-muted/30 rounded-lg text-center">
                        <Image className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">素材库正在建设中...</p>
                        <p className="text-xs text-muted-foreground mt-1">即将支持图片、图标等素材</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>


              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Multiple Selection Info */}
      {selectedNodes.length > 1 && (
        <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/10">
          <p className="text-sm text-muted-foreground">
            正在编辑 <span className="font-semibold text-primary">{selectedNodes.length}</span> 个节点
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            修改将应用到所有选中的节点
          </p>
        </div>
      )}
    </div>
  );
};