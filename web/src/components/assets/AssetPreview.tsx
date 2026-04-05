import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Heart } from 'lucide-react';
import { Button } from '../ui/button';
import { Asset } from '../../services/assets/AssetService';

interface AssetPreviewProps {
  asset: Asset;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

// 截断标题，超过10个字显示省略号
const truncateTitle = (title: string, maxLength: number = 10): string => {
  if (title.length <= maxLength) {
    return title;
  }
  return title.substring(0, maxLength) + '...';
};

export default function AssetPreview({ asset, isFavorite = false, onToggleFavorite }: AssetPreviewProps) {
  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number }>({ visible: false, x: 0, y: 0 });
  
  const handleFavorite = () => {
    // 实现收藏功能
    if (onToggleFavorite) {
      onToggleFavorite();
    } else {
      console.log('Toggle favorite for asset:', asset.id);
    }
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (asset.name.length > 10) {
      setTooltip({ visible: true, x: e.clientX, y: e.clientY - 30 });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (tooltip.visible) {
      setTooltip({ visible: true, x: e.clientX, y: e.clientY - 30 });
    }
  };

  const handleMouseLeave = () => {
    setTooltip({ visible: false, x: 0, y: 0 });
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'icon': return '图标';
      case 'shape': return '形状';
      case 'connector': return '连接线';
      case 'iconSet': return '图标组合';
      case 'fontStyle': return '字体样式';
      case 'colorScheme': return '配色方案';
      case 'background': return '导图背景';
      case 'animation': return '动画效果';
      default: return type;
    }
  };

  return (
    <Card 
      className="rounded-2xl shadow-sm hover:shadow-lg transition-all duration-200 group border-2 border-primary/10 hover:border-primary/30 bg-card hover:scale-[1.03] gap-0"
    >
      <div className="relative">
        <div className="w-full aspect-square overflow-hidden p-4 flex items-center justify-center">
          {asset.type === 'fontStyle' ? (
            <div 
              className="text-center text-foreground transition-transform duration-300 group-hover:scale-105 pointer-events-none"
              style={{
                fontFamily: asset.data?.fontFamily || 'sans-serif',
                fontSize: '32px',
                fontWeight: asset.data?.fontWeight || '400'
              }}
            >
              字体预览<br/>Mind<br/>Weaver
            </div>
          ) : (
            <img 
              src={asset.thumbnail} 
              alt={asset.name} 
              className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
              draggable="false"
            />
          )}
        </div>
        <div className="absolute top-3 right-3 flex gap-1">
          <Button 
            size="sm" 
            variant="ghost" 
            className={`w-8 h-8 p-0 rounded-full bg-slate-200 dark:bg-slate-700/90 hover:bg-slate-300 dark:hover:bg-slate-600 transition-all z-10 hover:scale-110 ${isFavorite ? 'text-red-500' : 'text-muted-foreground'}`}
            onClick={handleFavorite}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500' : ''}`} />
          </Button>
        </div>
      </div>
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-3">
          <h3 
            className="text-sm font-medium cursor-default"
            onMouseEnter={handleMouseEnter}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {truncateTitle(asset.name)}
          </h3>
          <Badge variant="outline" className="rounded-lg text-xs border-primary/30 bg-primary/5 text-primary dark:bg-primary/10 dark:border-primary/40">
            {getTypeLabel(asset.type)}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {asset.tags.map((tag, index) => (
            <Badge key={index} variant="outline" className="rounded-lg text-xs border-secondary/30 bg-secondary/5 text-secondary dark:bg-secondary/10 dark:border-secondary/40">
              {tag}
            </Badge>
          ))}
        </div>
        <div className="flex justify-end items-center gap-1.5 text-xs text-muted-foreground">
          <span>上传者:</span>
          <span className="font-medium">{asset.uploader}</span>
        </div>
      </CardContent>
      
      {/* Tooltip - 使用 Portal 渲染到 body，避免影响布局 */}
      {tooltip.visible && createPortal(
        <div
          className="fixed z-[9999] px-3 py-2 text-sm bg-gray-900 text-white rounded-lg shadow-lg pointer-events-none max-w-xs break-words whitespace-nowrap"
          style={{
            left: tooltip.x,
            top: tooltip.y,
          }}
        >
          {asset.name}
        </div>,
        document.body
      )}
    </Card>
  );
}