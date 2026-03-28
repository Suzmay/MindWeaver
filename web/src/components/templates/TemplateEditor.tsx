import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Save, Undo, Redo, ZoomIn, ZoomOut, AlignLeft, AlignCenter, AlignRight,
  Bold, Italic, Underline, Image, Eye, X,
  Trash2, Plus, Square, Circle, Type
} from 'lucide-react';

interface TemplateNode {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  style: {
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
    borderRadius: number;
    fontSize: number;
    fontWeight: string;
    color: string;
  };
  properties: {
    [key: string]: any;
  };
}

interface TemplateConnection {
  id: string;
  source: string;
  target: string;
  type: string;
  style: {
    strokeColor: string;
    strokeWidth: number;
    strokeDasharray: string;
  };
}

interface TemplateEditorProps {
  onSave: (template: any) => void;
  onCancel: () => void;
  initialTemplate?: any;
}

const TemplateEditor: React.FC<TemplateEditorProps> = ({
  onSave,
  onCancel,
  initialTemplate
}) => {
  const [template, setTemplate] = useState(initialTemplate || {
    id: Date.now().toString(),
    name: '新模板',
    description: '自定义模板',
    category: '通用',
    tags: [] as string[],
    nodes: [] as TemplateNode[],
    connections: [] as TemplateConnection[],
    parameters: [] as any[],
    style: {
      backgroundColor: '#ffffff',
      gridSize: 20,
      showGrid: true,
      zoom: 1
    }
  });
  

  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [newTag, setNewTag] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<any[]>([JSON.stringify(template)]);
  const historyIndexRef = useRef(0);

  useEffect(() => {
    // 限制历史记录长度
    if (historyRef.current.length > 50) {
      historyRef.current = historyRef.current.slice(-50);
      historyIndexRef.current = historyRef.current.length - 1;
    }
  }, [template]);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setSelectedNode(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      setCanvasOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(nodeId);
  };

  const handleNodeDrag = (nodeId: string, newPosition: { x: number; y: number }) => {
    setTemplate((prev: any) => ({
      ...prev,
      nodes: prev.nodes.map((node: TemplateNode) => 
        node.id === nodeId ? { ...node, x: newPosition.x, y: newPosition.y } : node
      )
    }));
    addToHistory();
  };

  const handleNodeResize = (nodeId: string, newSize: { width: number; height: number }) => {
    setTemplate((prev: any) => ({
      ...prev,
      nodes: prev.nodes.map((node: TemplateNode) => 
        node.id === nodeId ? { ...node, width: newSize.width, height: newSize.height } : node
      )
    }));
    addToHistory();
  };

  const handleNodeStyleChange = (nodeId: string, style: Partial<TemplateNode['style']>) => {
    setTemplate((prev: any) => ({
      ...prev,
      nodes: prev.nodes.map((node: TemplateNode) => 
        node.id === nodeId ? { ...node, style: { ...node.style, ...style } } : node
      )
    }));
    addToHistory();
  };

  const handleAddNode = (type: string) => {
    const newNode: TemplateNode = {
      id: Date.now().toString(),
      type,
      x: 100,
      y: 100,
      width: 120,
      height: 80,
      content: type === 'text' ? '文本' : type === 'image' ? '图片' : '节点',
      style: {
        backgroundColor: '#f3f4f6',
        borderColor: '#d1d5db',
        borderWidth: 1,
        borderRadius: 4,
        fontSize: 14,
        fontWeight: 'normal',
        color: '#374151'
      },
      properties: {}
    };

    setTemplate((prev: any) => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }));
    setSelectedNode(newNode.id);
    addToHistory();
  };



  const handleDeleteNode = (nodeId: string) => {
    setTemplate((prev: any) => ({
      ...prev,
      nodes: prev.nodes.filter((node: TemplateNode) => node.id !== nodeId),
      connections: prev.connections.filter((conn: TemplateConnection) => 
        conn.source !== nodeId && conn.target !== nodeId
      )
    }));
    setSelectedNode(null);
    addToHistory();
  };

  const handleAddTag = () => {
    if (newTag && !template.tags.includes(newTag)) {
      setTemplate((prev: any) => ({
        ...prev,
        tags: [...prev.tags, newTag]
      }));
      setNewTag('');
      addToHistory();
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTemplate((prev: any) => ({
      ...prev,
      tags: prev.tags.filter((t: string) => t !== tag)
    }));
    addToHistory();
  };

  const handleAddParameter = () => {
    const newParameter = {
      id: Date.now().toString(),
      name: '新参数',
      type: 'string',
      default: '',
      description: ''
    };

    setTemplate((prev: any) => ({
      ...prev,
      parameters: [...prev.parameters, newParameter]
    }));
    addToHistory();
  };

  const handleParameterChange = (paramId: string, changes: Partial<any>) => {
    setTemplate((prev: any) => ({
      ...prev,
      parameters: prev.parameters.map((param: any) => 
        param.id === paramId ? { ...param, ...changes } : param
      )
    }));
    addToHistory();
  };

  const handleDeleteParameter = (paramId: string) => {
    setTemplate((prev: any) => ({
      ...prev,
      parameters: prev.parameters.filter((param: any) => param.id !== paramId)
    }));
    addToHistory();
  };

  const addToHistory = () => {
    const currentState = JSON.stringify(template);
    const currentIndex = historyIndexRef.current;
    
    // 移除当前索引之后的历史记录
    historyRef.current = historyRef.current.slice(0, currentIndex + 1);
    historyRef.current.push(currentState);
    historyIndexRef.current = historyRef.current.length - 1;
  };

  const handleUndo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      const previousState = JSON.parse(historyRef.current[historyIndexRef.current]);
      setTemplate(previousState);
    }
  };

  const handleRedo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      const nextState = JSON.parse(historyRef.current[historyIndexRef.current]);
      setTemplate(nextState);
    }
  };

  const handleSave = () => {
    onSave(template);
  };

  const handleCancel = () => {
    onCancel();
  };

  const selectedNodeData = selectedNode ? template.nodes.find((node: TemplateNode) => node.id === selectedNode) : null;

  return (
    <div className="flex flex-col h-full">
      {/* 顶部工具栏 */}
      <div className="border-b p-2 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleUndo} disabled={historyIndexRef.current === 0}>
            <Undo className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleRedo} disabled={historyIndexRef.current === historyRef.current.length - 1}>
            <Redo className="h-4 w-4" />
          </Button>
          <div className="border-r h-6 mx-2" />
          <Button variant="ghost" size="icon" onClick={() => setZoom(prev => Math.min(prev + 0.1, 2))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.5))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setZoom(1)}>
            100%
          </Button>
          <div className="border-r h-6 mx-2" />
          <Button variant="ghost" size="icon">
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <AlignRight className="h-4 w-4" />
          </Button>
          <div className="border-r h-6 mx-2" />
          <Button variant="ghost" size="icon">
            <Bold className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Italic className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Underline className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleCancel}>
            取消
          </Button>
          <Button variant="secondary" onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" />
            保存
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => {
            handleSave();
            setShowPreview(true);
          }}>
            <Eye className="h-4 w-4 mr-1" />
            保存并预览
          </Button>
        </div>
      </div>

      {/* 主编辑区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧工具栏 */}
        <div className="w-64 border-r p-4 bg-white">
          <h3 className="font-medium mb-4">模板信息</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">模板名称</label>
              <Input 
                value={template.name} 
                onChange={(e) => setTemplate((prev: any) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">描述</label>
              <Textarea 
                value={template.description} 
                onChange={(e) => setTemplate((prev: any) => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">分类</label>
              <Select 
                value={template.category} 
                onValueChange={(value) => setTemplate((prev: any) => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="通用">通用</SelectItem>
                  <SelectItem value="流程图">流程图</SelectItem>
                  <SelectItem value="思维导图">思维导图</SelectItem>
                  <SelectItem value="组织架构">组织架构</SelectItem>
                  <SelectItem value="时序图">时序图</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">标签</label>
              <div className="flex gap-2 mb-2">
                <Input 
                  value={newTag} 
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="添加标签"
                />
                <Button variant="secondary" size="sm" onClick={handleAddTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {template.tags.map((tag: string, index: number) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)} className="ml-1" type="button" title="移除标签">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <h3 className="font-medium mt-8 mb-4">添加元素</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" className="justify-start gap-2" onClick={() => handleAddNode('text')}>
              <Type className="h-4 w-4" />
              文本
            </Button>
            <Button variant="secondary" className="justify-start gap-2" onClick={() => handleAddNode('image')}>
              <Image className="h-4 w-4" />
              图片
            </Button>
            <Button variant="secondary" className="justify-start gap-2" onClick={() => handleAddNode('rectangle')}>
              <Square className="h-4 w-4" />
              矩形
            </Button>
            <Button variant="secondary" className="justify-start gap-2" onClick={() => handleAddNode('circle')}>
              <Circle className="h-4 w-4" />
              圆形
            </Button>
          </div>
        </div>

        {/* 中间画布区域 */}
        <div className="flex-1 relative overflow-hidden bg-gray-50">
          <div 
            ref={canvasRef}
            className="absolute inset-0 overflow-auto"
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          >
            <div 
              className="relative" 
              style={{
                transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
                minWidth: '2000px',
                minHeight: '1500px',
                backgroundColor: template.style.backgroundColor,
                backgroundImage: template.style.showGrid ? 
                  `linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)` : 'none',
                backgroundSize: `${template.style.gridSize}px ${template.style.gridSize}px`
              }}
            >
              {/* 绘制连接线 */}
              {template.connections.map((connection: TemplateConnection) => {
                const sourceNode = template.nodes.find((n: TemplateNode) => n.id === connection.source);
                const targetNode = template.nodes.find((n: TemplateNode) => n.id === connection.target);
                
                if (!sourceNode || !targetNode) return null;
                
                const sourceX = sourceNode.x + sourceNode.width / 2;
                const sourceY = sourceNode.y + sourceNode.height / 2;
                const targetX = targetNode.x + targetNode.width / 2;
                const targetY = targetNode.y + targetNode.height / 2;
                
                return (
                  <svg key={connection.id} className="absolute top-0 left-0 w-full h-full pointer-events-none">
                    <line
                      x1={sourceX}
                      y1={sourceY}
                      x2={targetX}
                      y2={targetY}
                      stroke={connection.style.strokeColor}
                      strokeWidth={connection.style.strokeWidth}
                      strokeDasharray={connection.style.strokeDasharray}
                    />
                  </svg>
                );
              })}
              
              {/* 绘制节点 */}
              {template.nodes.map((node: TemplateNode) => (
                <div
                  key={node.id}
                  className={`absolute cursor-move ${selectedNode === node.id ? 'ring-2 ring-blue-500' : ''}`}
                  style={{
                    left: node.x,
                    top: node.y,
                    width: node.width,
                    height: node.height,
                    backgroundColor: node.style.backgroundColor,
                    border: `${node.style.borderWidth}px solid ${node.style.borderColor}`,
                    borderRadius: `${node.style.borderRadius}px`,
                    fontSize: `${node.style.fontSize}px`,
                    fontWeight: node.style.fontWeight,
                    color: node.style.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    userSelect: 'none'
                  }}
                  onClick={() => handleNodeClick(node.id)}
                >
                  {node.content}
                  
                  {/* 调整大小手柄 */}
                  {selectedNode === node.id && (
                    <>
                      <div className="absolute top-0 left-0 w-2 h-2 bg-blue-500 cursor-nwse-resize" />
                      <div className="absolute top-0 right-0 w-2 h-2 bg-blue-500 cursor-nesw-resize" />
                      <div className="absolute bottom-0 left-0 w-2 h-2 bg-blue-500 cursor-nesw-resize" />
                      <div className="absolute bottom-0 right-0 w-2 h-2 bg-blue-500 cursor-nwse-resize" />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧属性面板 */}
        <div className="w-64 border-l p-4 bg-white">
          {selectedNodeData ? (
            <>
              <h3 className="font-medium mb-4">节点属性</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">内容</label>
                  <Input 
                    value={selectedNodeData.content} 
                    onChange={(e) => setTemplate((prev: any) => ({
                      ...prev,
                      nodes: prev.nodes.map((node: TemplateNode) => 
                        node.id === selectedNode ? { ...node, content: e.target.value } : node
                      )
                    }))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">位置</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input 
                      type="number" 
                      value={selectedNodeData.x} 
                      onChange={(e) => handleNodeDrag(selectedNodeData.id, { x: Number(e.target.value), y: selectedNodeData.y })}
                      placeholder="X"
                    />
                    <Input 
                      type="number" 
                      value={selectedNodeData.y} 
                      onChange={(e) => handleNodeDrag(selectedNodeData.id, { x: selectedNodeData.x, y: Number(e.target.value) })}
                      placeholder="Y"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">大小</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input 
                      type="number" 
                      value={selectedNodeData.width} 
                      onChange={(e) => handleNodeResize(selectedNodeData.id, { width: Number(e.target.value), height: selectedNodeData.height })}
                      placeholder="宽度"
                    />
                    <Input 
                      type="number" 
                      value={selectedNodeData.height} 
                      onChange={(e) => handleNodeResize(selectedNodeData.id, { width: selectedNodeData.width, height: Number(e.target.value) })}
                      placeholder="高度"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">背景颜色</label>
                  <Input 
                    type="color" 
                    value={selectedNodeData.style.backgroundColor} 
                    onChange={(e) => handleNodeStyleChange(selectedNodeData.id, { backgroundColor: e.target.value })}
                    className="w-full h-8"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">边框颜色</label>
                  <Input 
                    type="color" 
                    value={selectedNodeData.style.borderColor} 
                    onChange={(e) => handleNodeStyleChange(selectedNodeData.id, { borderColor: e.target.value })}
                    className="w-full h-8"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">边框宽度</label>
                  <Slider 
                    value={[selectedNodeData.style.borderWidth]} 
                    min={0} 
                    max={10} 
                    step={1}
                    onValueChange={(value) => handleNodeStyleChange(selectedNodeData.id, { borderWidth: value[0] })}
                  />
                  <div className="text-xs text-center mt-1">{selectedNodeData.style.borderWidth}px</div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">圆角</label>
                  <Slider 
                    value={[selectedNodeData.style.borderRadius]} 
                    min={0} 
                    max={20} 
                    step={1}
                    onValueChange={(value) => handleNodeStyleChange(selectedNodeData.id, { borderRadius: value[0] })}
                  />
                  <div className="text-xs text-center mt-1">{selectedNodeData.style.borderRadius}px</div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">字体大小</label>
                  <Slider 
                    value={[selectedNodeData.style.fontSize]} 
                    min={8} 
                    max={32} 
                    step={1}
                    onValueChange={(value) => handleNodeStyleChange(selectedNodeData.id, { fontSize: value[0] })}
                  />
                  <div className="text-xs text-center mt-1">{selectedNodeData.style.fontSize}px</div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">字体粗细</label>
                  <Select 
                    value={selectedNodeData.style.fontWeight} 
                    onValueChange={(value) => handleNodeStyleChange(selectedNodeData.id, { fontWeight: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择字体粗细" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">正常</SelectItem>
                      <SelectItem value="bold">粗体</SelectItem>
                      <SelectItem value="lighter">细体</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">字体颜色</label>
                  <Input 
                    type="color" 
                    value={selectedNodeData.style.color} 
                    onChange={(e) => handleNodeStyleChange(selectedNodeData.id, { color: e.target.value })}
                    className="w-full h-8"
                  />
                </div>
                
                <Button variant="destructive" className="w-full" onClick={() => handleDeleteNode(selectedNodeData.id)}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  删除节点
                </Button>
              </div>
            </>
          ) : (
            <>
              <h3 className="font-medium mb-4">模板参数</h3>
              
              <div className="space-y-4">
                {template.parameters.map((param: any) => (
                  <div key={param.id} className="border p-3 rounded-md">
                    <div className="flex justify-between items-start mb-2">
                      <Input 
                        value={param.name} 
                        onChange={(e) => handleParameterChange(param.id, { name: e.target.value })}
                        className="text-sm"
                      />
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteParameter(param.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="w-full mb-2">
                      <Select 
                        value={param.type} 
                        onValueChange={(value) => handleParameterChange(param.id, { type: value })}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="参数类型" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="string">字符串</SelectItem>
                          <SelectItem value="number">数字</SelectItem>
                          <SelectItem value="boolean">布尔值</SelectItem>
                          <SelectItem value="select">选择</SelectItem>
                          <SelectItem value="color">颜色</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Input 
                      value={param.default} 
                      onChange={(e) => handleParameterChange(param.id, { default: e.target.value })}
                      placeholder="默认值"
                      className="text-sm mb-2"
                    />
                    
                    <Textarea 
                      value={param.description} 
                      onChange={(e) => handleParameterChange(param.id, { description: e.target.value })}
                      placeholder="描述"
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                ))}
                
                <Button variant="secondary" className="w-full" onClick={handleAddParameter}>
                  <Plus className="h-4 w-4 mr-1" />
                  添加参数
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 预览对话框 */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>模板预览</DialogTitle>
            <DialogDescription>
              {template.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="border rounded-lg p-4 bg-white">
              <div 
                className="relative" 
                style={{
                  minWidth: '800px',
                  minHeight: '600px',
                  backgroundColor: template.style.backgroundColor,
                  backgroundImage: template.style.showGrid ? 
                    `linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)` : 'none',
                  backgroundSize: `${template.style.gridSize}px ${template.style.gridSize}px`
                }}
              >
                {/* 绘制连接线 */}
                {template.connections.map((connection: TemplateConnection) => {
                  const sourceNode = template.nodes.find((n: TemplateNode) => n.id === connection.source);
                  const targetNode = template.nodes.find((n: TemplateNode) => n.id === connection.target);
                  
                  if (!sourceNode || !targetNode) return null;
                  
                  const sourceX = sourceNode.x + sourceNode.width / 2;
                  const sourceY = sourceNode.y + sourceNode.height / 2;
                  const targetX = targetNode.x + targetNode.width / 2;
                  const targetY = targetNode.y + targetNode.height / 2;
                  
                  return (
                    <svg key={connection.id} className="absolute top-0 left-0 w-full h-full pointer-events-none">
                      <line
                        x1={sourceX}
                        y1={sourceY}
                        x2={targetX}
                        y2={targetY}
                        stroke={connection.style.strokeColor}
                        strokeWidth={connection.style.strokeWidth}
                        strokeDasharray={connection.style.strokeDasharray}
                      />
                    </svg>
                  );
                })}
                
                {/* 绘制节点 */}
                {template.nodes.map((node: TemplateNode) => (
                  <div
                    key={node.id}
                    className="absolute"
                    style={{
                      left: node.x,
                      top: node.y,
                      width: node.width,
                      height: node.height,
                      backgroundColor: node.style.backgroundColor,
                      border: `${node.style.borderWidth}px solid ${node.style.borderColor}`,
                      borderRadius: `${node.style.borderRadius}px`,
                      fontSize: `${node.style.fontSize}px`,
                      fontWeight: node.style.fontWeight,
                      color: node.style.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {node.content}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowPreview(false)}>
              关闭
            </Button>
            <Button onClick={() => {
              handleSave();
              setShowPreview(false);
            }}>
              确认保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};



export default TemplateEditor;