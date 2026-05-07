import { useState, useCallback, useRef } from 'react';
import {
  Upload,
  Link,
  File,
  Check,
  X,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { ExportService, MindWeaverFile } from '../../services/export/ExportService';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: MindWeaverFile) => Promise<void>;
}

export function ImportDialog({
  open,
  onOpenChange,
  onImport
}: ImportDialogProps) {
  const [activeTab, setActiveTab] = useState('file');
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<MindWeaverFile | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    
    try {
      const data = await ExportService.importFromMMW(file);
      setPreviewData(data);
    } catch (err) {
      setError('无法解析文件，请确保这是有效的 .mmw 文件');
      setPreviewData(null);
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
      if (file.name.endsWith('.mmw') || file.name.endsWith('.json')) {
        handleFileSelect(file);
      } else {
        setError('请选择 .mmw 或 .json 格式的文件');
      }
    }
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleParseUrl = async () => {
    if (!importUrl.trim()) {
      setError('请输入分享链接');
      return;
    }

    setError(null);
    try {
      const data = ExportService.parseShareLink(importUrl);
      if (data) {
        setPreviewData(data);
      } else {
        setError('无法解析链接，请确保这是有效的 MindWeaver 分享链接');
      }
    } catch {
      setError('链接解析失败，请检查链接是否正确');
    }
  };

  const handleImport = async () => {
    if (!previewData) return;

    setIsImporting(true);
    setError(null);
    
    try {
      await onImport(previewData);
      setImportSuccess(true);
      setTimeout(() => {
        setImportSuccess(false);
        onOpenChange(false);
        resetState();
      }, 1500);
    } catch (err) {
      setError(`导入失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const resetState = () => {
    setImportUrl('');
    setPreviewData(null);
    setError(null);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            导入思维导图
          </DialogTitle>
          <DialogDescription>
            从文件或分享链接导入思维导图
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="file" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file" className="flex items-center gap-2">
              <File className="w-4 h-4" />
              导入文件
            </TabsTrigger>
            <TabsTrigger value="link" className="flex items-center gap-2">
              <Link className="w-4 h-4" />
              链接导入
            </TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="space-y-4 pt-4">
            {!previewData ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mmw,.json"
                  onChange={handleFileInputChange}
                  className="hidden"
                  aria-label="选择导入文件"
                />
                <Upload className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
                <p className="font-medium mb-1">
                  {isDragActive ? '松开文件开始导入' : '拖拽文件到此处'}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  支持 .mmw 和 .json 格式文件
                </p>
                <Button variant="outline" className="gap-2" type="button">
                  <File className="w-4 h-4" />
                  选择文件
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 border rounded-xl bg-muted/30">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <File className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{previewData.title}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        <p>节点数: {previewData.data.nodes.length}</p>
                        <p>版本: {previewData.version}</p>
                        <p>导出时间: {formatDate(previewData.exportedAt)}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        setPreviewData(null);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Button
                  className="w-full gap-2"
                  onClick={handleImport}
                  disabled={isImporting}
                >
                  {isImporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      导入中...
                    </>
                  ) : importSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      导入成功！
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      确认导入
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="link" className="space-y-4 pt-4">
            {!previewData ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Input
                    placeholder="粘贴分享链接..."
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    粘贴 MindWeaver 分享链接以导入思维导图
                  </p>
                </div>

                <Button
                  className="w-full gap-2"
                  onClick={handleParseUrl}
                >
                  <Link className="w-4 h-4" />
                  解析链接
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 border rounded-xl bg-muted/30">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Link className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{previewData.title}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        <p>节点数: {previewData.data.nodes.length}</p>
                        <p>版本: {previewData.version}</p>
                        <p>导出时间: {formatDate(previewData.exportedAt)}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        setImportUrl('');
                        setPreviewData(null);
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Button
                  className="w-full gap-2"
                  onClick={handleImport}
                  disabled={isImporting}
                >
                  {isImporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      导入中...
                    </>
                  ) : importSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      导入成功！
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      确认导入
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
