import { useEffect, useState } from 'react';
import { 
  BarChart3, 
  Activity, 
  PieChart, 
  TrendingUp, 
  AlertCircle, 
  FileText, 
  Star, 
  Clock, 
  Calendar,
  Layout
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useUser } from '../context/UserContext';
import { useStorage } from '../context/StorageContext';
import { Work } from '../models/Work';
import { 
  ChartContainer, 
  ChartTooltipContent 
} from './ui/chart';
import { 
  BarChart as ReBarChart, 
  Bar as ReBar, 
  XAxis as ReXAxis, 
  YAxis as ReYAxis, 
  CartesianGrid as ReCartesianGrid, 
  Tooltip as ReTooltip,
  PieChart as RePieChart,
  Pie,
  Cell as ReCell
} from 'recharts';

// 颜色配置
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

interface DashboardStats {
  totalWorks: number;
  starredWorks: number;
  totalNodes: number;
  recentWorks: number;
  categoryDistribution: { name: string; value: number }[];
  creationTrend: { date: string; count: number }[];
  layoutDistribution: { name: string; value: number }[];
}

export function DashboardPage() {
  const { isGuest } = useUser();
  const { initialized, listWorks } = useStorage();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentWorks, setRecentWorks] = useState<Work[]>([]);

  // 统一获取所有数据
  useEffect(() => {
    if (!initialized) return;

    const fetchData = async () => {
      try {
        // 并行获取总数和统计数据
        const [countResult, statsResult, recentResult] = await Promise.all([
          listWorks({ page: 1, pageSize: 1, deletedOnly: false }),
          listWorks({ page: 1, pageSize: 1000, deletedOnly: false }),
          listWorks({ page: 1, pageSize: 4, deletedOnly: false, sortBy: 'lastModified', sortOrder: 'desc' })
        ]);

        setRecentWorks(recentResult.works);

        // 计算统计数据
        const activeWorks = statsResult.works.filter((w: Work) => !w.isDeleted);
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // 分类分布
        const categoryCount: Record<string, number> = {};
        activeWorks.forEach((work: Work) => {
          const cat = work.category || '未分类';
          categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        });
        const categoryDistribution = Object.entries(categoryCount).map(([name, value]) => ({ name, value }));

        // 布局名称映射
        const layoutNameMap: Record<string, string> = {
          'mindmap': '思维导图',
          'tree': '树状图',
          'organization': '组织结构图',
          'fishbone': '鱼骨图'
        };

        // 方向名称映射
        const directionNameMap: Record<string, string> = {
          'horizontal': '水平',
          'vertical': '垂直'
        };

        // 布局分布（包含模式和方向）
        const layoutCount: Record<string, number> = {};
        activeWorks.forEach((work: Work) => {
          const mode = work.layout?.mode || '未知';
          const direction = work.layout?.direction || 'horizontal';
          const layoutName = `${layoutNameMap[mode] || mode}-${directionNameMap[direction] || direction}`;
          layoutCount[layoutName] = (layoutCount[layoutName] || 0) + 1;
        });
        const layoutDistribution = Object.entries(layoutCount)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);

        // 创作趋势（最近 7 天）
        const trendData: { date: string; count: number }[] = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          const dateStr = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
          trendData.push({ date: dateStr, count: 0 });
        }

        activeWorks.forEach((work: Work) => {
          const createdAt = new Date(work.createdAt);
          if (createdAt >= sevenDaysAgo) {
            const daysAgo = Math.floor((now.getTime() - createdAt.getTime()) / (24 * 60 * 60 * 1000));
            if (daysAgo >= 0 && daysAgo < 7) {
              trendData[6 - daysAgo].count++;
            }
          }
        });

        setStats({
          totalWorks: countResult.total,
          starredWorks: activeWorks.filter((w: Work) => w.starred).length,
          totalNodes: activeWorks.reduce((sum: number, work: Work) => sum + (work.nodes || 0), 0),
          recentWorks: activeWorks.filter((w: Work) => new Date(w.createdAt) >= sevenDaysAgo).length,
          categoryDistribution,
          creationTrend: trendData,
          layoutDistribution
        });
      } catch (error) {
        console.error('获取仪表盘数据失败:', error);
      }
    };

    fetchData();
  }, [initialized, listWorks]);

  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">仪表盘</h1>
          <p className="text-muted-foreground mt-1">查看你的思维导图创作数据和统计信息</p>
        </div>
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" />
        </div>
      </div>

      {/* 游客模式提示 */}
      {isGuest && (
        <Card className="rounded-2xl border-2 border-warning/20 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-warning">游客模式</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  您当前处于游客模式，数据仅存储在本地。登录后可享受云端同步功能。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">总作品数</p>
                <p className="text-3xl font-bold mt-1">{stats?.totalWorks || 0}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <FileText className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">收藏作品</p>
                <p className="text-3xl font-bold mt-1">{stats?.starredWorks || 0}</p>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-full">
                <Star className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">总节点数</p>
                <p className="text-3xl font-bold mt-1">{stats?.totalNodes || 0}</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-full">
                <Activity className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">近 7 天创作</p>
                <p className="text-3xl font-bold mt-1">{stats?.recentWorks || 0}</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-full">
                <Clock className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 创作趋势 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              创作趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ChartContainer
                config={{
                  count: { 
                    label: '创作数量',
                    theme: { light: '#3b82f6', dark: '#60a5fa' }
                  }
                }}
              >
                <ReBarChart data={stats?.creationTrend || []}>
                  <ReCartesianGrid strokeDasharray="3 3" vertical={false} />
                  <ReXAxis 
                    dataKey="date" 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={8} 
                  />
                  <ReYAxis 
                    tickLine={false} 
                    axisLine={false} 
                    allowDecimals={false} 
                  />
                  <ReTooltip 
                    content={<ChartTooltipContent />} 
                  />
                  <ReBar 
                    dataKey="count" 
                    fill="var(--color-count)" 
                    radius={[4, 4, 0, 0]} 
                    barSize={32}
                  />
                </ReBarChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        {/* 分类分布 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              分类分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ChartContainer
                config={{
                  value: { 
                    label: '作品数量'
                  }
                }}
              >
                <RePieChart>
                  <Pie
                    data={stats?.categoryDistribution || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {(stats?.categoryDistribution || []).map((_, index) => (
                      <ReCell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ReTooltip content={<ChartTooltipContent />} />
                </RePieChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 布局分布和最近作品 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 布局分布 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layout className="w-5 h-5" />
              布局偏好
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(stats?.layoutDistribution || []).map((item, index) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{item.value}</span>
                </div>
              ))}
              {(!stats?.layoutDistribution || stats.layoutDistribution.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  暂无数据
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 最近作品 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              最近作品
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentWorks.map(work => (
                  <div key={work.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      {work.starred && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                      <div>
                        <p className="font-medium">{work.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(work.lastModified).toLocaleDateString('zh-CN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {work.nodes || 0} 节点
                    </div>
                  </div>
                ))}
              {recentWorks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  暂无作品，快去创建你的第一个思维导图吧！
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
