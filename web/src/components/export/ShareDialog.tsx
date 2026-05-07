import { useState } from 'react';
import { Share2, Copy, Check } from 'lucide-react';
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

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  nodes: MindMapNode[];
  layout?: any;
  canvasBackground?: string;
}

export function ShareDialog({
  open,
  onOpenChange,
  title,
  nodes,
  layout,
  canvasBackground
}: ShareDialogProps) {
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateShareLink = async () => {
    setIsGenerating(true);
    try {
      const link = ExportService.generateShareLink(nodes, title, layout, canvasBackground);
      setShareLink(link);
    } catch (error) {
      console.error('生成分享链接失败:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (!shareLink) return;
    
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('复制链接失败:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            分享思维导图
          </DialogTitle>
          <DialogDescription>
            生成分享链接，方便他人导入
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {!shareLink ? (
            <>
              <div className="p-4 border rounded-xl bg-muted/30">
                <div className="text-sm font-medium mb-2">分享说明</div>
                <div className="text-sm text-muted-foreground">
                  <p>• 生成的链接包含完整的思维导图数据</p>
                  <p>• 接收者可以在市场页面通过链接导入</p>
                  <p>• 链接使用 Base64 编码，可能较长</p>
                </div>
              </div>
              <Button
                className="w-full gap-2"
                onClick={handleGenerateShareLink}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    生成分享链接
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              <div className="p-4 border rounded-xl bg-muted/30 max-h-32 overflow-auto">
                <div className="text-sm font-mono break-all leading-relaxed">
                  {shareLink}
                </div>
              </div>
              <Button
                className="w-full gap-2"
                onClick={handleCopyShareLink}
                disabled={copied}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    已复制！
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    复制链接
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}