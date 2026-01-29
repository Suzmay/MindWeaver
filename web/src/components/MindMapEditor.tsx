import { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Minus,
  Download,
  Square,
  Circle,
  Cloud,
  Palette,
  ArrowLeft,
  Save,
  Share2,
} from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface MindMapNode {
  id: string;
  x: number;
  y: number;
  text: string;
  shape: 'rectangle' | 'rounded' | 'circle' | 'cloud';
  color: string;
  children: string[];
}

interface MindMapEditorProps {
  workId: string;
  onBack: () => void;
}

export function MindMapEditor({ workId, onBack }: MindMapEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [selectedNode] = useState<string | null>(null);
  const [nodes, setNodes] = useState<MindMapNode[]>([
    {
      id: 'root',
      x: 400,
      y: 300,
      text: '中心主题',
      shape: 'rounded',
      color: '#14B8A6',
      children: ['node1', 'node2', 'node3'],
    },
    {
      id: 'node1',
      x: 200,
      y: 200,
      text: '分支一',
      shape: 'rounded',
      color: '#0EA5E9',
      children: [],
    },
    {
      id: 'node2',
      x: 600,
      y: 200,
      text: '分支二',
      shape: 'rounded',
      color: '#06B6D4',
      children: [],
    },
    {
      id: 'node3',
      x: 400,
      y: 450,
      text: '分支三',
      shape: 'rounded',
      color: '#22D3EE',
      children: [],
    },
  ]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply transformations
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw grid (subtle)
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x < canvas.width / zoom; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height / zoom);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height / zoom; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width / zoom, y);
      ctx.stroke();
    }

    // Draw connections
    nodes.forEach((node) => {
      node.children.forEach((childId) => {
        const child = nodes.find((n) => n.id === childId);
        if (child) {
          ctx.strokeStyle = node.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.quadraticCurveTo(
            (node.x + child.x) / 2,
            (node.y + child.y) / 2 - 50,
            child.x,
            child.y
          );
          ctx.stroke();
        }
      });
    });

    // Draw nodes
    nodes.forEach((node) => {
      const isSelected = selectedNode === node.id;

      // Node background
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

      // Node text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '14px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.text, node.x, node.y);
    });

    ctx.restore();
  };

  // Helper function to draw rounded rectangle
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

  // Helper function to draw cloud shape
  const drawCloud = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    ctx.arc(x - w / 4, y - h / 4, w / 3, 0, Math.PI * 2);
    ctx.arc(x + w / 4, y - h / 4, w / 3, 0, Math.PI * 2);
    ctx.arc(x, y + h / 4, w / 2.5, 0, Math.PI * 2);
  };

  useEffect(() => {
    drawCanvas();
  }, [nodes, zoom, pan, selectedNode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom((prev) => Math.max(0.1, Math.min(3, prev * delta)));
    };

    canvas.addEventListener('wheel', handleWheel);
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsPanning(true);
    setLastPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      const dx = e.clientX - lastPos.x;
      const dy = e.clientY - lastPos.y;
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleAddNode = () => {
    const newNode: MindMapNode = {
      id: `node-${Date.now()}`,
      x: 400 + Math.random() * 100 - 50,
      y: 300 + Math.random() * 100 - 50,
      text: '新节点',
      shape: 'rounded',
      color: '#3B82F6',
      children: [],
    };
    setNodes([...nodes, newNode]);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Top Toolbar */}
      <div className="h-16 border-b bg-background flex items-center justify-between px-4 gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="rounded-lg">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <h2>思维导图 {workId}</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Add Node */}
          <Button onClick={handleAddNode} size="sm" className="rounded-2xl gap-2 bg-gradient-to-br from-primary to-secondary hover:opacity-90 shadow-ocean font-semibold">
            <Plus className="w-4 h-4" />
            添加节点
          </Button>

          {/* Shape Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-lg">
                <Square className="w-4 h-4 mr-2" />
                形状
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-lg">
              <DropdownMenuItem>
                <Square className="w-4 h-4 mr-2" />
                矩形
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Circle className="w-4 h-4 mr-2" />
                圆形
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Cloud className="w-4 h-4 mr-2" />
                云状
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Color Picker */}
          <Button variant="outline" size="sm" className="rounded-lg">
            <Palette className="w-4 h-4 mr-2" />
            颜色
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom((prev) => Math.max(0.1, prev - 0.1))}
              className="h-7 px-2"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <span className="text-sm min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom((prev) => Math.min(3, prev + 0.1))}
              className="h-7 px-2"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Save & Share */}
          <Button variant="outline" size="sm" className="rounded-2xl border-primary/30 hover:bg-primary/10">
            <Save className="w-4 h-4 mr-2" />
            保存
          </Button>
          <Button variant="outline" size="sm" className="rounded-2xl border-primary/30 hover:bg-primary/10">
            <Share2 className="w-4 h-4 mr-2" />
            分享
          </Button>
          <Button variant="outline" size="sm" className="rounded-2xl border-primary/30 hover:bg-primary/10">
            <Download className="w-4 h-4 mr-2" />
            导出
          </Button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <canvas
          ref={canvasRef}
          width={1920}
          height={1080}
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        {/* Mini Map */}
        <div className="absolute bottom-4 right-4 w-48 h-32 bg-card border-2 border-primary/20 rounded-2xl shadow-ocean overflow-hidden">
          <div className="w-full h-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
            <span className="text-xs text-muted-foreground font-semibold">迷你地图</span>
          </div>
        </div>
      </div>
    </div>
  );
}
