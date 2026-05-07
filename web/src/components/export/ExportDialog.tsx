import { useState, useEffect } from 'react';
import {
  Download,
  FileJson,
  FileSpreadsheet,
  Image,
  File,
  Check
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { MindMapNode } from '../../models/Work';
import { ExportService } from '../../services/export/ExportService';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  nodes: MindMapNode[];
  layout?: any;
  canvasBackground?: string;
  canvasBackgroundImage?: string;
  canvasBackgroundType?: 'solid' | 'gradient' | 'grid' | 'image';
  canvasBackgroundSize?: string;
  canvasBackgroundGradientColors?: string[];
  canvasBackgroundGridColor?: string;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
}

export function ExportDialog({
  open,
  onOpenChange,
  title,
  nodes,
  layout,
  canvasBackground,
  canvasBackgroundImage,
  canvasBackgroundType,
  canvasBackgroundSize,
  canvasBackgroundGradientColors,
  canvasBackgroundGridColor,
  canvasRef
}: ExportDialogProps) {
  const canExportPng = !!canvasRef?.current;
  const [selectedFormat, setSelectedFormat] = useState<'json' | 'markdown' | 'png' | 'mmw'>('mmw');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  useEffect(() => {
    if (selectedFormat === 'png' && !canExportPng) {
      setSelectedFormat('mmw');
    }
  }, [selectedFormat, canExportPng]);

  const getSafeTitle = (t: string) => {
    return t.replace(/[<>:"/\\|?*]/g, '_');
  };

  const getFormatName = (format: string) => {
    switch (format) {
      case 'mmw':
        return 'MindWeaver';
      case 'json':
        return 'JSON';
      case 'markdown':
        return 'Markdown';
      case 'png':
        return 'PNG 图片';
      default:
        return format;
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let blob: Blob;
      let filename: string;

      switch (selectedFormat) {
        case 'json':
          blob = ExportService.exportToJson(nodes, title, layout, canvasBackground);
          filename = `${getSafeTitle(title)}.json`;
          break;
        case 'markdown':
          blob = ExportService.exportToMarkdown(nodes, title);
          filename = `${getSafeTitle(title)}.md`;
          break;
        case 'png':
          if (canvasRef?.current) {
            blob = await ExportService.exportToImage(
              canvasRef.current,
              'png',
              canvasBackground,
              canvasBackgroundImage,
              canvasBackgroundType,
              canvasBackgroundSize,
              canvasBackgroundGradientColors,
              canvasBackgroundGridColor
            );
            filename = `${getSafeTitle(title)}.png`;
          } else {
            throw new Error('Canvas 不可用，无法导出图片');
          }
          break;
        case 'mmw':
        default:
          blob = ExportService.exportToMMW(nodes, title, layout, canvasBackground);
          filename = `${getSafeTitle(title)}.mmw`;
          break;
      }

      ExportService.downloadFile(blob, filename);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2000);
    } catch (error) {
      console.error('导出失败:', error);
      alert(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            导出思维导图
          </DialogTitle>
          <DialogDescription>
            选择导出格式，将思维导图保存为文件
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-3">
            {(['mmw', 'json', 'markdown', 'png'] as const).map((format) => {
              const isDisabled = format === 'png' && !canExportPng;
              const isSelected = selectedFormat === format;
              return (
                <button
                  key={format}
                  onClick={() => !isDisabled && setSelectedFormat(format)}
                  className={`p-4 border-2 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : isDisabled
                      ? 'border-border opacity-50 cursor-not-allowed'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {format === 'mmw' && <File className="w-5 h-5 text-primary" />}
                    {format === 'json' && <FileJson className="w-5 h-5 text-primary" />}
                    {format === 'markdown' && <FileSpreadsheet className="w-5 h-5 text-primary" />}
                    {format === 'png' && <Image className="w-5 h-5 text-primary" />}
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {getFormatName(format)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {format === 'mmw' && 'MindWeaver 专用格式'}
                        {format === 'json' && '通用数据格式'}
                        {format === 'markdown' && '文档格式'}
                        {format === 'png' && (canExportPng ? '图片格式' : '需打开思维导图才能使用')}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <Button
            className="w-full gap-2"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                导出中...
              </>
            ) : exportSuccess ? (
              <>
                <Check className="w-4 h-4" />
                导出成功！
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                导出 {getFormatName(selectedFormat)}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}