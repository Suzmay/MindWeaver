import { Package, AlertCircle } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { useUser } from '../context/UserContext';

export function AssetsPage() {
  const { isGuest } = useUser();

  return (
    <div className="flex flex-col items-center justify-center h-full p-6">
      {isGuest && (
        <Card className="rounded-2xl border-2 border-warning/20 bg-warning/5 mb-6 w-full max-w-md">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-warning">游客模式</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  您当前处于游客模式，无法访问素材中心。请登录以获得完整功能体验。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="text-center space-y-4 max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted/50 text-muted-foreground">
          <Package className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold">素材中心</h2>
        <p className="text-muted-foreground">
          这里将展示丰富的思维导图素材，包括图标、形状、颜色方案等
        </p>
        <div className="mt-8 p-6 border border-dashed rounded-xl bg-muted/20">
          <p className="text-sm text-muted-foreground">
            素材中心正在建设中，敬请期待...
          </p>
        </div>
      </div>
    </div>
  );
}
