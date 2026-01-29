import { BarChart3, Activity, PieChart, TrendingUp, AlertCircle } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { useUser } from '../context/UserContext';

export function DashboardPage() {
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
                  您当前处于游客模式，无法查看个人数据统计。请登录以获得完整的数据分析功能。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="text-center space-y-6 max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted/50 text-muted-foreground">
          <BarChart3 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold">仪表盘</h2>
        <p className="text-muted-foreground">
          查看你的思维导图创作数据和统计信息
        </p>
        
        <div className="grid grid-cols-1 gap-4 w-full mt-8">
          {/* 创作统计 */}
          <div className="p-6 border border-dashed rounded-xl bg-muted/20 flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted/50 text-muted-foreground">
              <Activity className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h3 className="font-medium">创作统计</h3>
              <p className="text-sm text-muted-foreground">
                查看你的作品数量和创作频率
              </p>
            </div>
          </div>
          
          {/* 使用分析 */}
          <div className="p-6 border border-dashed rounded-xl bg-muted/20 flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted/50 text-muted-foreground">
              <PieChart className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h3 className="font-medium">使用分析</h3>
              <p className="text-sm text-muted-foreground">
                了解你最常用的模板和素材
              </p>
            </div>
          </div>
          
          {/* 趋势分析 */}
          <div className="p-6 border border-dashed rounded-xl bg-muted/20 flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted/50 text-muted-foreground">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h3 className="font-medium">趋势分析</h3>
              <p className="text-sm text-muted-foreground">
                跟踪你的创作能力成长趋势
              </p>
            </div>
          </div>
        </div>
        
        <div className="mt-8 p-6 border border-dashed rounded-xl bg-muted/20">
          <p className="text-sm text-muted-foreground">
            仪表盘功能正在建设中，敬请期待...
          </p>
        </div>
      </div>
    </div>
  );
}
