import React, { useState, useEffect, useRef } from 'react';
import { MindMapNode } from '../../models/Work';
import { X, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { assetService } from '../../services/assets/AssetService';

// 将 kebab-case 转换为 PascalCase
const kebabToPascalCase = (str: string): string => {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
};

// 简单的Markdown渲染函数
const renderMarkdown = (text: string) => {
  if (!text) return '无';
  
  // 提取大图标
  let largeIconSvg: string | null = null;
  const largeIconMatch = text.match(/:icon-([\w-]+?)-large:/);
  if (largeIconMatch) {
    const iconId = largeIconMatch[1];
    // 先尝试直接使用 iconId（适用于 iconify 图标）
    let asset = assetService.getAssetById(iconId);
    if (!asset) {
      // 再尝试添加 icon- 前缀（适用于默认图标）
      asset = assetService.getAssetById(`icon-${iconId}`);
    }
    if (asset && asset.data && asset.data.svg) {
      largeIconSvg = asset.data.svg
        .replace(/width="[^"]*"/, 'width="128"')
        .replace(/height="[^"]*"/, 'height="128"')
        .replace(/viewBox="[^"]*"/, 'viewBox="0 0 24 24"');
    } else {
      // 如果在资产中找不到，尝试从图标组合中查找
      const pascalName = kebabToPascalCase(iconId);
      const iconSvg = assetService.getIconSvgByName(pascalName);
      if (iconSvg) {
        largeIconSvg = iconSvg
          .replace(/width="[^"]*"/, 'width="128"')
          .replace(/height="[^"]*"/, 'height="128"')
          .replace(/viewBox="[^"]*"/, 'viewBox="0 0 24 24"');
      }
    }
  }
  
  // 去除大图标标记后的文本
  const textWithoutLargeIcon = text.replace(/:icon-[\w-]+?-large:/g, '');
  
  // 通用的图标替换函数（只处理小图标）
  const replaceSmallIcons = (str: string) => {
    let result = str;
    
    // 替换小图标
      result = result.replace(/:icon-([\w-]+?):/g, (match, iconId) => {
        // 先尝试直接使用 iconId（适用于 iconify 图标）
        let asset = assetService.getAssetById(iconId);
        if (!asset) {
          // 再尝试添加 icon- 前缀（适用于默认图标）
          asset = assetService.getAssetById(`icon-${iconId}`);
        }
      if (asset && asset.data && asset.data.svg) {
        return `<span class="inline-flex items-center justify-center w-4 h-4 align-middle" style="vertical-align: middle;">${asset.data.svg}</span>`;
      } else {
        // 如果在资产中找不到，尝试从图标组合中查找
        const pascalName = kebabToPascalCase(iconId);
        const iconSvg = assetService.getIconSvgByName(pascalName);
        if (iconSvg) {
          return `<span class="inline-flex items-center justify-center w-4 h-4 align-middle" style="vertical-align: middle;">${iconSvg}</span>`;
        }
      }
      return match;
    });
    
    return result;
  };
  
  const lines = textWithoutLargeIcon.split('\n').map((line, index) => {
    if (line.startsWith('# ')) {
      return <h1 key={index} className="text-xl font-bold mt-1 mb-1">{line.substring(2)}</h1>;
    }
    if (line.startsWith('## ')) {
      return <h2 key={index} className="text-lg font-semibold mt-1 mb-1">{line.substring(3)}</h2>;
    }
    if (line.startsWith('- ')) {
      let listContent = line.substring(2);
      listContent = listContent
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/__(.*?)__/g, '<u>$1</u>');
      listContent = replaceSmallIcons(listContent);
      return <li key={index} className="ml-4 list-disc" dangerouslySetInnerHTML={{ __html: listContent }} />;
    }
    if (line.match(/^\d+\. /)) {
      let listContent = line.substring(line.indexOf(' ') + 1);
      listContent = listContent
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/__(.*?)__/g, '<u>$1</u>');
      listContent = replaceSmallIcons(listContent);
      return <li key={index} className="ml-4 list-decimal" dangerouslySetInnerHTML={{ __html: listContent }} />;
    }
    let processedLine = line
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/__(.*?)__/g, '<u>$1</u>');
    processedLine = replaceSmallIcons(processedLine);
    
    return <p key={index} dangerouslySetInnerHTML={{ __html: processedLine }} />;
  });
  
  // 如果有大图标，使用特殊布局
  if (largeIconSvg) {
    return (
      <div className="flex items-start gap-4">
        <div className="flex-1">{lines}</div>
        <div 
          className="flex-shrink-0 flex items-center justify-center" 
          style={{ width: '128px', height: '128px', alignSelf: 'center' }}
          dangerouslySetInnerHTML={{ __html: largeIconSvg }} 
        />
      </div>
    );
  }
  
  return lines;
};

interface NodeCardProps {
  node: MindMapNode;
  position: { x: number; y: number };
  direction: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  zoom: number;
  pan: { x: number; y: number };
  canvasContainerRef: React.RefObject<HTMLDivElement>;
  onSummaryChange: (nodeId: string, summary: string) => void;
  onContentChange: (nodeId: string, content: string) => void;
  onGenerateSummary: (nodeId: string, options?: { maxLength?: number; style?: string }) => Promise<void>;
  isGenerating: boolean;
  onClose: () => void;
  readOnly?: boolean;
}

export const NodeCard: React.FC<NodeCardProps> = ({
  node,
  position,
  direction,
  zoom,
  pan,
  canvasContainerRef,
  onGenerateSummary,
  isGenerating,
  onClose,
  readOnly = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [aiOptions, setAiOptions] = useState({
    maxLength: 100,
    style: 'concise'
  });
  const [showMode, setShowMode] = useState<'summary' | 'content'>('summary');

  const cardWidth = 450;
  const cardHeight = 280;
  const sizeFactor = (node.size || 100) / 100;
  const halfWidth = 60 * sizeFactor;

  const calculateCardPosition = () => {
    if (!canvasContainerRef.current) {
      return { left: 0, top: 0 };
    }

    const containerRect = canvasContainerRef.current.getBoundingClientRect();
    let cardX = 0;
    let cardY = 0;

    switch (direction) {
      case 'top-left':
        cardX = position.x - halfWidth - cardWidth;
        cardY = position.y - cardHeight - 20;
        break;
      case 'top-right':
        cardX = position.x + halfWidth + 20;
        cardY = position.y - cardHeight - 20;
        break;
      case 'bottom-left':
        cardX = position.x - halfWidth - cardWidth;
        cardY = position.y + 40 + 20;
        break;
      case 'bottom-right':
        cardX = position.x + halfWidth + 20;
        cardY = position.y + 40 + 20;
        break;
    }

    let screenX = cardX * zoom + pan.x + containerRect.left;
    let screenY = cardY * zoom + pan.y + containerRect.top;

    // 确保卡片不超出画布范围
    const canvasLeft = containerRect.left;
    const canvasTop = containerRect.top;
    const canvasRight = containerRect.right;
    const canvasBottom = containerRect.bottom;

    // 调整水平位置
    if (screenX < canvasLeft + 20) {
      screenX = canvasLeft + 20;
    } else if (screenX + cardWidth > canvasRight - 20) {
      screenX = canvasRight - cardWidth - 20;
    }

    // 调整垂直位置
    if (screenY < canvasTop + 20) {
      screenY = canvasTop + 20;
    } else if (screenY + cardHeight > canvasBottom - 20) {
      screenY = canvasBottom - cardHeight - 20;
    }

    return { left: screenX, top: screenY };
  };

  const [cardPosition, setCardPosition] = useState(calculateCardPosition());

  useEffect(() => {
    setCardPosition(calculateCardPosition());
  }, [position, direction, zoom, pan, node.size]);



  return (
    <div
      ref={cardRef}
      className="fixed z-50 bg-card border border-primary/20 rounded-xl shadow-lg p-4 flex flex-col"
      style={{
        left: cardPosition.left,
        top: cardPosition.top,
        width: `${cardWidth}px`,
        minHeight: `${cardHeight}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-sm">{node.title}</h3>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMode(showMode === 'summary' ? 'content' : 'summary')}
            className="h-6 px-2 text-xs"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            {showMode === 'summary' ? '内容' : '摘要'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0 rounded-full"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="flex-1 space-y-4">
        {showMode === 'summary' && (
          <div className="space-y-2 h-full">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium">摘要</Label>
              {!readOnly && (
                <div className="flex gap-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="default"
                        size="sm"
                        className="h-6 px-2 text-xs bg-blue-600 hover:bg-blue-700"
                        disabled={isGenerating || !node.content}
                      >
                        <Sparkles className="w-3 h-3 mr-1" />
                        AI生成
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-xs">字数限制: {aiOptions.maxLength}字</Label>
                          <Slider
                            value={[aiOptions.maxLength]}
                            min={20}
                            max={500}
                            step={10}
                            onValueChange={(value) => setAiOptions({ ...aiOptions, maxLength: value[0] })}
                          />
                        </div>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            onGenerateSummary(node.id, aiOptions);
                          }}
                          disabled={isGenerating}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                          {isGenerating ? '生成中...' : '开始生成'}
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
            <div className="text-sm text-muted-foreground bg-muted/30 p-2 rounded-lg h-[180px] overflow-y-auto">
              {node.summary || '无'}
            </div>
          </div>
        )}

        {showMode === 'content' && (
          <div className="space-y-2 h-full">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium">内容</Label>
            </div>
            <div className="text-sm text-muted-foreground bg-muted/30 p-2 rounded-lg h-[180px] overflow-y-auto">
              {renderMarkdown(node.content || '')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
