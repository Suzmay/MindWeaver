import { Store, Package, Layout, FolderOpen, AlertCircle } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { useUser } from '../context/UserContext';

export function MarketPage() {
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
                  您当前处于游客模式，无法使用市场功能。请登录以分享和发现思维导图素材、作品和模板。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="text-center space-y-6 max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted/50 text-muted-foreground">
          <Store className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold">市场</h2>
        <p className="text-muted-foreground">
          在这里分享和发现思维导图作品、模板和素材
        </p>
        
        <div className="grid grid-cols-1 gap-4 w-full mt-8">
          {/* 作品分享 */}
          <div className="p-6 border border-dashed rounded-xl bg-muted/20 flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted/50 text-muted-foreground">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h3 className="font-medium">作品分享</h3>
              <p className="text-sm text-muted-foreground">
                分享你的思维导图作品给其他用户
              </p>
            </div>
          </div>
          
          {/* 模板分享 */}
          <div className="p-6 border border-dashed rounded-xl bg-muted/20 flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted/50 text-muted-foreground">
              <Layout className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h3 className="font-medium">模板分享</h3>
              <p className="text-sm text-muted-foreground">
                分享你的模板设计给其他用户
              </p>
            </div>
          </div>
          
          {/* 素材分享 */}
          <div className="p-6 border border-dashed rounded-xl bg-muted/20 flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted/50 text-muted-foreground">
              <Package className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h3 className="font-medium">素材分享</h3>
              <p className="text-sm text-muted-foreground">
                分享你的素材资源给其他用户
              </p>
            </div>
          </div>
        </div>
        
        <div className="mt-8 p-6 border border-dashed rounded-xl bg-muted/20">
          <p className="text-sm text-muted-foreground">
            市场功能正在建设中，敬请期待...
          </p>
        </div>
      </div>
    </div>
  );
}
