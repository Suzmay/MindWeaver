import { useState, useCallback, useRef } from 'react';
import {
  Upload,
  FileArchive,
  Check,
  AlertCircle,
  FolderOpen
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import {
  assetService,
  ConflictStrategy,
  MindWeaverAssetsFile
} from '../../services/assets/AssetService';

interface AssetImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport?: () => void;
}

type ImportStep = 'select' | 'preview' | 'result';

export function AssetImportDialog({
  open,
  onOpenChange,
  onImport
}: AssetImportDialogProps) {
  const [step, setStep] = useState<ImportStep>('select');
  const [isDragActive, setIsDragActive] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<MindWeaverAssetsFile | null>(null);
  const [conflictStrategy, setConflictStrategy] = useState<ConflictStrategy>('skip');
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep('select');
    setPreviewData(null);
    setError(null);
    setConflictStrategy('skip');
    setImportResult(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetState();
    }
    onOpenChange(open);
  };

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);

    try {
      const data = await assetService.importFromAssetsFile(file);
      setPreviewData(data);
      setStep('preview');
    } catch (err) {
      setError('无法解析文件，请确保这是有效的 .mwassets 文件');
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.mwassets') || file.name.endsWith('.json')) {
        handleFileSelect(file);
      } else {
        setError('请选择 .mwassets 或 .json 格式的文件');
      }
    }
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleImport = async () => {
    if (!previewData) return;

    setIsImporting(true);
    setError(null);

    try {
      const blob = new Blob([JSON.stringify(previewData)], { type: 'application/json' });
      const result = await assetService.importAssets(blob, conflictStrategy);

      if (result.errors.length > 0) {
        setError(result.errors.join(', '));
      }

      setImportResult({ imported: result.imported, skipped: result.skipped });
      setStep('result');

      setTimeout(() => {
        onImport?.();
        handleOpenChange(false);
      }, 2000);
    } catch (err) {
      setError(`导入失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setIsImporting(false);
    }
  };

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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            导入素材
          </DialogTitle>
          <DialogDescription>
            从 .mwassets 文件导入素材到您的素材库
          </DialogDescription>
        </DialogHeader>

        {step === 'select' && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mt-4 ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mwassets,.json"
              onChange={handleFileInputChange}
              className="hidden"
              aria-label="选择素材包文件"
            />
            <Upload className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
            <p className="font-medium mb-1">
              {isDragActive ? '松开文件开始导入' : '拖拽文件到此处'}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              支持 .mwassets 和 .json 格式文件
            </p>
            <Button variant="outline" className="gap-2" type="button">
              <FileArchive className="w-4 h-4" />
              选择文件
            </Button>
          </div>
        )}

        {step === 'preview' && previewData && (
          <div className="space-y-4 pt-4">
            <div className="p-4 rounded-xl bg-muted/50 border">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileArchive className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">
                    {previewData.metadata?.name || '素材包'}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    <p>素材数量: {previewData.assets.length}</p>
                    {previewData.metadata?.assetTypes && (
                      <p>素材类型: {previewData.metadata.assetTypes.map(t => getTypeName(t)).join(', ')}</p>
                    )}
                    <p>导出时间: {new Date(previewData.exportedAt).toLocaleDateString('zh-CN')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-h-[200px] overflow-y-auto border rounded-lg">
              <div className="grid grid-cols-4 gap-2 p-3">
                {previewData.assets.slice(0, 12).map((asset, index) => (
                  <div
                    key={index}
                    className="aspect-square rounded-lg bg-muted flex items-center justify-center p-2"
                    title={asset.name}
                  >
                    <img
                      src={asset.thumbnail}
                      alt={asset.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ))}
                {previewData.assets.length > 12 && (
                  <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
                    <span className="text-sm text-muted-foreground">+{previewData.assets.length - 12}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label>冲突处理策略</Label>
              <RadioGroup
                value={conflictStrategy}
                onValueChange={(value) => setConflictStrategy(value as ConflictStrategy)}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2 border rounded-lg p-3">
                  <RadioGroupItem value="skip" id="skip" />
                  <Label htmlFor="skip" className="flex-1 cursor-pointer">
                    <div className="font-medium">跳过</div>
                    <div className="text-sm text-muted-foreground">不导入已存在的素材</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3">
                  <RadioGroupItem value="overwrite" id="overwrite" />
                  <Label htmlFor="overwrite" className="flex-1 cursor-pointer">
                    <div className="font-medium">覆盖</div>
                    <div className="text-sm text-muted-foreground">用导入的素材替换已存在的</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3">
                  <RadioGroupItem value="rename" id="rename" />
                  <Label htmlFor="rename" className="flex-1 cursor-pointer">
                    <div className="font-medium">重命名</div>
                    <div className="text-sm text-muted-foreground">为重复素材创建新副本</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setPreviewData(null);
                  setStep('select');
                }}
              >
                取消
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleImport}
                disabled={isImporting}
              >
                {isImporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    导入中...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    开始导入
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'result' && importResult && (
          <div className="space-y-4 pt-4">
            <div className="flex flex-col items-center justify-center py-6">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium">导入完成</h3>
              <p className="text-sm text-muted-foreground mt-2">
                成功导入 {importResult.imported} 个素材
                {importResult.skipped > 0 && `，跳过 ${importResult.skipped} 个`}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg mt-4">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}