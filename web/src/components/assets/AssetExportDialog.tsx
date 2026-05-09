import { useState } from 'react';
import { Download, FileArchive, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Asset, assetService } from '../../services/assets/AssetService';

interface AssetExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: Asset[];
  onExport?: () => void;
}

export function AssetExportDialog({
  open,
  onOpenChange,
  assets,
  onExport
}: AssetExportDialogProps) {
  const [packageName, setPackageName] = useState('');
  const [description, setDescription] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const getTypeName = (type: string) => {
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

  const assetTypeCount: Record<string, number> = {};
  assets.forEach(asset => {
    const typeName = getTypeName(asset.type);
    assetTypeCount[typeName] = (assetTypeCount[typeName] || 0) + 1;
  });

  const handleExport = async () => {
    if (assets.length === 0) {
      return;
    }

    setIsExporting(true);
    try {
      const filename = packageName.trim() || 'mindweaver-assets';
      assetService.downloadAssetsFile(assets, filename);
      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
        onOpenChange(false);
        setPackageName('');
        setDescription('');
        onExport?.();
      }, 1500);
    } catch (error) {
      console.error('导出素材失败:', error);
      alert(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            导出素材
          </DialogTitle>
          <DialogDescription>
            将选中的素材打包为 .mwassets 文件
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="p-4 rounded-xl bg-muted/50 border">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileArchive className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="font-medium">
                  {assets.length} 个素材
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {Object.entries(assetTypeCount).map(([type, count]) => (
                    <span key={type}>{type}: {count}个 </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="package-name">素材包名称（可选）</Label>
            <Input
              id="package-name"
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              placeholder="默认使用 mindweaver-assets"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="package-desc">素材包描述（可选）</Label>
            <Textarea
              id="package-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="添加描述以便识别..."
              rows={3}
            />
          </div>

          <Button
            className="w-full gap-2"
            onClick={handleExport}
            disabled={isExporting || assets.length === 0}
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
                导出 {assets.length} 个素材
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}