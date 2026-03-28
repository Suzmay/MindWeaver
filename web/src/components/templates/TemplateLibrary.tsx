import { useState } from 'react';
import { Search, Filter, Grid3x3, List, Plus, Download, Star, Clock, Folder, Tag, MoreVertical, Check, Square, AlertTriangle, X, FileText, Layout } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';


interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  preview: string;
  layout: string;
  style: string;
  starred: boolean;
  usageCount: number;
  createdAt: string;
  isDefault: boolean;
}

const mockTemplates: Template[] = [
  {
    id: '1',
    name: '商业计划',
    description: '适合商业计划和项目规划的思维导图模板',
    category: '商业',
    tags: ['商业', '计划', '项目'],
    preview: 'business',
    layout: 'mindmap',
    style: 'professional',
    starred: true,
    usageCount: 45,
    createdAt: '2024-01-01',
    isDefault: true,
  },
  {
    id: '2',
    name: '学习笔记',
    description: '适合学生和教师的学习笔记模板',
    category: '教育',
    tags: ['学习', '教育', '笔记'],
    preview: 'education',
    layout: 'tree',
    style: 'clean',
    starred: false,
    usageCount: 32,
    createdAt: '2024-01-02',
    isDefault: true,
  },
  {
    id: '3',
    name: '个人规划',
    description: '适合个人目标规划和时间管理的模板',
    category: '个人',
    tags: ['个人', '规划', '目标'],
    preview: 'personal',
    layout: 'mindmap',
    style: 'modern',
    starred: false,
    usageCount: 28,
    createdAt: '2024-01-03',
    isDefault: true,
  },
  {
    id: '4',
    name: '会议纪要',
    description: '适合会议记录和讨论的模板',
    category: '商业',
    tags: ['会议', '记录', '讨论'],
    preview: 'meeting',
    layout: 'tree',
    style: 'professional',
    starred: true,
    usageCount: 21,
    createdAt: '2024-01-04',
    isDefault: false,
  },
  {
    id: '5',
    name: '项目管理',
    description: '适合项目管理和任务分配的模板',
    category: '商业',
    tags: ['项目', '管理', '任务'],
    preview: 'project',
    layout: 'orgchart',
    style: 'professional',
    starred: false,
    usageCount: 19,
    createdAt: '2024-01-05',
    isDefault: false,
  },
  {
    id: '6',
    name: '创意头脑风暴',
    description: '适合创意生成和头脑风暴的模板',
    category: '创意',
    tags: ['创意', '头脑风暴', '灵感'],
    preview: 'creative',
    layout: 'mindmap',
    style: 'modern',
    starred: false,
    usageCount: 16,
    createdAt: '2024-01-06',
    isDefault: false,
  },
];

export function TemplateLibrary() {

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'usageCount' | 'createdAt' | 'starred'>('usageCount');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterTag, setFilterTag] = useState('all');
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  
  // 批量选择状态
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [isAllSelected, setIsAllSelected] = useState(false);
  
  // 错误状态
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>(mockTemplates);

  // 筛选和排序模板
  const filteredTemplates = templates
    .filter(template => {
      const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) || template.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'all' || template.category === filterCategory;
      const matchesTag = filterTag === 'all' || (template.tags && template.tags.includes(filterTag));
      const matchesStarred = !showStarredOnly || template.starred;
      return matchesSearch && matchesCategory && matchesTag && matchesStarred;
    })
    .sort((a, b) => {
      if (sortBy === 'starred') {
        return (b.starred ? 1 : 0) - (a.starred ? 1 : 0);
      }
      if (sortBy === 'usageCount') {
        return b.usageCount - a.usageCount;
      }
      if (sortBy === 'createdAt') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return a.name.localeCompare(b.name);
    });

  // 当filterCategory为'grouped'时，按分类分组模板
  const groupedTemplates = filterCategory === 'grouped'
    ? filteredTemplates.reduce((acc, template) => {
        const category = template.category || '未分类';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(template);
        return acc;
      }, {} as Record<string, Template[]>)
    : null;

  const categories = [
    'all',
    ...Array.from(
      new Set(
        templates
          .map((t) => t.category)
          .filter((cat): cat is string => typeof cat === 'string' && cat.length > 0)
      )
    ),
  ];
  const tags = ['all', ...Array.from(new Set(templates.flatMap(t => t.tags || [])))];

  const toggleTemplateSelection = (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTemplates(prev => {
      const newSelection = prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId];
      setIsBatchMode(newSelection.length > 0);
      // 更新全选状态
      setIsAllSelected(newSelection.length === filteredTemplates.length);
      return newSelection;
    });
  };

  const selectAllTemplates = () => {
    if (isAllSelected) {
      // 取消全选
      setSelectedTemplates([]);
      setIsAllSelected(false);
    } else {
      // 全选
      const allTemplateIds = filteredTemplates.map(template => template.id);
      setSelectedTemplates(allTemplateIds);
      setIsAllSelected(true);
      setIsBatchMode(true);
    }
  };

  const clearSelection = () => {
    setSelectedTemplates([]);
    setIsAllSelected(false);
    // 保持批量选择模式
  };

  const exitSelection = () => {
    setSelectedTemplates([]);
    setIsAllSelected(false);
    setIsBatchMode(false);
  };

  const toggleStar = (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTemplates(prev => prev.map(template => 
      template.id === templateId ? { ...template, starred: !template.starred } : template
    ));
  };

  const generateTemplatePreview = (template: Template) => {
    // 使用统一的背景颜色
    const bgColor = 'hsl(200 75% 85% / 0.2)';
    
    // 基于模板类别生成图标
    const categoryIcons: Record<string, string> = {
      商业: 'FileText',
      教育: 'Layout',
      个人: 'Star',
      创意: 'Star'
    };
    const selectedIcon = categoryIcons[template.category] || 'FileText';
    
    return {
      bgColor,
      icon: selectedIcon
    };
  };

  const handleUseTemplate = (templateId: string) => {
    // 实现使用模板的逻辑
    console.log('Using template:', templateId);
  };

  return (
    <div className="p-8 space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1>模板库</h1>
          <p className="text-muted-foreground mt-1">
            浏览和使用预设模板，快速创建思维导图
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="rounded-2xl gap-2 bg-gradient-to-br from-primary to-secondary hover:opacity-90 shadow-ocean font-semibold"
          >
            <Plus className="w-5 h-5" />
            新建模板
          </Button>
        </div>
      </div>

      {/* 错误消息 */}
      {error && (
        <div className="rounded-2xl p-4 bg-warning/10 border-2 border-warning/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <p className="font-medium text-warning">
                {error}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="h-8 w-8 p-0 rounded-full"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* 搜索和筛选 */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* 搜索 */}
        <div className="relative flex-1">
          <div className="absolute left-3 top-0 bottom-0 flex items-center">
            <Search className="w-5 h-5 text-muted-foreground" />
          </div>
          <Input
            placeholder="搜索模板..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl border-primary/20 focus:border-primary"
          />
        </div>

        {/* 分类筛选 */}
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px] rounded-xl border-primary/20">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="分类" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {categories.map(cat => (
              <SelectItem key={cat} value={cat} className="rounded-lg">
                {cat === 'all' ? '全部' : cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 标签筛选 */}
        <Select value={filterTag} onValueChange={setFilterTag}>
          <SelectTrigger className="w-[180px] rounded-xl border-primary/20">
            <Tag className="w-4 h-4 mr-2" />
            <SelectValue placeholder="标签" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {tags.map(tag => (
              <SelectItem key={tag} value={tag} className="rounded-lg">
                {tag === 'all' ? '全部标签' : tag}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 排序 */}
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
          <SelectTrigger className="w-[180px] rounded-xl border-primary/20">
            <Clock className="w-4 h-4 mr-2" />
            <SelectValue placeholder="排序方式" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="usageCount" className="rounded-lg">使用次数</SelectItem>
            <SelectItem value="createdAt" className="rounded-lg">最近添加</SelectItem>
            <SelectItem value="name" className="rounded-lg">名称</SelectItem>
            <SelectItem value="starred" className="rounded-lg">收藏优先</SelectItem>
          </SelectContent>
        </Select>

        {/* 视图切换 */}
        <div className="flex border rounded-xl overflow-hidden border-primary/20 h-8">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="rounded-none h-full bg-white dark:bg-input/30"
          >
            <Grid3x3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="rounded-none h-full bg-white dark:bg-input/30"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card 
          className={`rounded-2xl border-2 transition-all cursor-pointer ${filterCategory === 'all' && filterTag === 'all' && !showStarredOnly ? 'border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5 shadow-md' : 'border-primary/20 bg-gradient-to-br from-primary/5 to-transparent hover:border-primary/40'}`}
        onClick={() => {
          setFilterCategory('all');
          setFilterTag('all');
          setShowStarredOnly(false);
        }}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl">{templates.length}</p>
              <p className="text-sm text-muted-foreground">模板总数</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`rounded-2xl border-2 transition-all cursor-pointer ${showStarredOnly ? 'border-secondary/40 bg-gradient-to-br from-secondary/10 to-secondary/5 shadow-md' : 'border-secondary/20 bg-gradient-to-br from-secondary/5 to-transparent hover:border-secondary/40'}`}
          onClick={() => {
            setShowStarredOnly(true);
            setFilterCategory('all');
            setFilterTag('all');
          }}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
              <Star className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <p className="text-2xl">{templates.filter(t => t.starred).length}</p>
              <p className="text-sm text-muted-foreground">收藏</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`rounded-2xl border-2 transition-all cursor-pointer ${filterCategory !== 'all' ? 'border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5 shadow-md' : 'border-primary/20 bg-gradient-to-br from-primary/5 to-transparent hover:border-primary/40'}`}
          onClick={() => {
            setFilterCategory('grouped');
            setFilterTag('all');
            setShowStarredOnly(false);
          }}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Folder className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl">{categories.length - 1}</p>
              <p className="text-sm text-muted-foreground">分类数量</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`rounded-2xl border-2 transition-all`}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
              <Tag className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <p className="text-2xl">{tags.length - 1}</p>
              <p className="text-sm text-muted-foreground">标签数量</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 批量选择工具栏 */}
      {isBatchMode && (
        <div className="bg-card rounded-2xl border-2 border-primary/30 p-4 mb-6 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selectAllTemplates}
                className="rounded-2xl border-primary/30 hover:opacity-90 hover:text-foreground"
              >
                <Check className="w-4 h-4 mr-1" />
                {isAllSelected ? '取消全选' : '全选'} ({filteredTemplates.length})
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearSelection}
                className="rounded-2xl border-primary/30 hover:opacity-90 hover:text-foreground"
              >
                清除选择
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={exitSelection}
                className="rounded-2xl border-primary/30 hover:opacity-90 hover:text-foreground"
              >
                退出选择
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              已选择 {selectedTemplates.length} 个模板
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => clearSelection()}
              disabled={selectedTemplates.length === 0}
              className="rounded-2xl border-primary/30 hover:opacity-90 hover:text-foreground"
            >
              <Download className="w-4 h-4 mr-1" />
              导出
            </Button>
          </div>
        </div>
      )}

      {/* 模板网格/列表 */}
      {filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
            <FileText className="w-12 h-12 text-primary" />
          </div>
          <h3>{searchQuery ? '未找到结果' : '还没有模板'}</h3>
          <p className="text-muted-foreground text-center max-w-md">
            {searchQuery 
              ? '尝试调整搜索关键词或筛选条件'
              : '浏览模板库，选择适合的模板开始创作'}
          </p>
        </div>
      ) : groupedTemplates ? (
        // 按分类分组视图
        <div className="space-y-6">
          {Object.entries(groupedTemplates).map(([category, templatesInCategory], index) => (
            <div key={category}>
              {/* 带分隔线的分类标题 */}
              <div className="flex items-center mb-8">
                {index > 0 && (
                  <div className="h-px flex-grow bg-border mr-4"></div>
                )}
                <h3 className="text-lg font-medium">{category} ({templatesInCategory.length})</h3>
                <div className="h-px flex-grow bg-border ml-4"></div>
              </div>
              
              {/* 此分类中的模板 */}
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                    : 'space-y-3'
                }
              >
                {templatesInCategory.map((template) => (
                  <Card
                    key={template.id}
                    className={`
                      rounded-2xl shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer group 
                      border-2 border-primary/10 hover:border-primary/30 bg-card
                      ${viewMode === 'list' ? 'hover:scale-[1.01]' : 'hover:scale-[1.03]'}
                      ${template.isDefault ? 'border-secondary/20' : ''}
                    `}
                  >
                    <CardContent className={`p-0 ${viewMode === 'list' ? 'flex flex-row items-center' : ''}`}>
                      {/* 缩略图 */}
                      <div className={`flex items-center justify-center relative overflow-hidden ${viewMode === 'grid' ? 'h-40 rounded-t-2xl' : 'h-32 w-32 rounded-l-2xl flex-shrink-0'} bg-[var(--bg-color)]`} style={{ '--bg-color': generateTemplatePreview(template).bgColor } as React.CSSProperties}>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent" />
                        {/* 选择复选框 */}
                        <button
                          type="button"
                          onClick={(e) => toggleTemplateSelection(template.id, e)}
                          title="选择模板"
                          className={`absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center transition-all z-20 hover:scale-110 bg-slate-200 dark:bg-slate-700/90 hover:bg-slate-300 dark:hover:bg-slate-600`}
                        >
                          {selectedTemplates.includes(template.id) ? (
                            <Check className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                        {/* 收藏按钮 */}
                        <button
                          type="button"
                          onClick={(e) => toggleStar(template.id, e)}
                          title={template.starred ? '取消收藏' : '收藏'}
                          className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all z-10 hover:scale-110 ${template.starred ? 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700/90 dark:hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700/90 dark:hover:bg-slate-600'}`}
                        >
                          <Star className={`w-4 h-4 ${template.starred ? 'fill-warning text-warning dark:fill-warning dark:text-warning' : 'text-muted-foreground'}`} />
                        </button>
                        {/* 默认模板徽章 */}
                        {template.isDefault && (
                          <Badge className="absolute top-3 left-12 bg-secondary/20 text-secondary border-secondary/30 gap-1 z-10">
                            默认
                          </Badge>
                        )}
                        {/* 基于模板类别的图标 */}
                        {generateTemplatePreview(template).icon === 'FileText' && <FileText className={`text-primary/60 relative z-0 ${viewMode === 'grid' ? 'w-16 h-16' : 'w-12 h-12'}`} />}
                        {generateTemplatePreview(template).icon === 'Layout' && <Layout className={`text-primary/60 relative z-0 ${viewMode === 'grid' ? 'w-16 h-16' : 'w-12 h-12'}`} />}
                        {generateTemplatePreview(template).icon === 'Star' && <Star className={`text-primary/60 relative z-0 ${viewMode === 'grid' ? 'w-16 h-16' : 'w-12 h-12'}`} />}
                      </div>

                      {/* 信息 */}
                      <div className="p-5 flex-1 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="truncate mb-2">{template.name}</h3>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {template.description}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 whitespace-nowrap">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(template.createdAt).toLocaleDateString('zh-CN')}
                            </span>
                            <span className="text-muted-foreground/50">•</span>
                            <span>{template.usageCount} 次使用</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge 
                              variant="outline" 
                              className="rounded-lg text-xs border-primary/30 bg-primary/5 text-primary dark:bg-primary/10 dark:border-primary/40"
                            >
                              {template.layout}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className="rounded-lg text-xs border-secondary/30 bg-secondary/5 text-secondary dark:bg-secondary/10 dark:border-secondary/40"
                            >
                              {template.style}
                            </Badge>
                            {(template.tags || []).slice(0, 2).map((tag) => (
                              <Badge 
                                key={tag} 
                                variant="outline" 
                                className="rounded-lg text-xs border-secondary/30 bg-secondary/5 text-secondary dark:bg-secondary/10 dark:border-secondary/40"
                              >
                                {tag}
                              </Badge>
                            ))}
                            {(template.tags || []).length > 2 && (
                              <Badge 
                                variant="outline" 
                                className="rounded-lg text-xs border-muted bg-muted/50 text-muted-foreground"
                              >
                                +{(template.tags || []).length - 2}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* 操作菜单 */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity rounded-lg h-8 w-8 p-0 flex-shrink-0"
                              >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl">
                            <DropdownMenuItem
                              onClick={() => handleUseTemplate(template.id)}
                              className="rounded-lg"
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              使用模板
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => toggleStar(template.id, e)}
                              className="rounded-lg"
                            >
                              <Star className="w-4 h-4 mr-2" />
                              {template.starred ? '取消收藏' : '收藏'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="rounded-lg">
                              <Download className="w-4 h-4 mr-2" />
                              下载
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // 常规视图（非分组）
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-3'
          }
        >
          {filteredTemplates.map((template) => (
            <Card
              key={template.id}
              className={`
                rounded-2xl shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer group 
                border-2 border-primary/10 hover:border-primary/30 bg-card
                ${viewMode === 'list' ? 'hover:scale-[1.01]' : 'hover:scale-[1.03]'}
                ${template.isDefault ? 'border-secondary/20' : ''}
              `}
            >
              <CardContent className={`p-0 ${viewMode === 'list' ? 'flex flex-row items-center' : ''}`}>
                {/* 缩略图 */}
                <div className={`flex items-center justify-center relative overflow-hidden ${viewMode === 'grid' ? 'h-40 rounded-t-2xl' : 'h-32 w-32 rounded-l-2xl flex-shrink-0'} bg-[var(--bg-color)]`} style={{ '--bg-color': generateTemplatePreview(template).bgColor } as React.CSSProperties}>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent" />
                  {/* 选择复选框 */}
                  <button
                    type="button"
                    onClick={(e) => toggleTemplateSelection(template.id, e)}
                    title="选择模板"
                    className={`absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center transition-all z-20 hover:scale-110 bg-slate-200 dark:bg-slate-700/90 hover:bg-slate-300 dark:hover:bg-slate-600`}
                  >
                    {selectedTemplates.includes(template.id) ? (
                      <Check className="w-4 h-4 text-primary" />
                    ) : (
                      <Square className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                  {/* 收藏按钮 */}
                  <button
                    type="button"
                    onClick={(e) => toggleStar(template.id, e)}
                    title={template.starred ? '取消收藏' : '收藏'}
                    className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all z-10 hover:scale-110 ${template.starred ? 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700/90 dark:hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700/90 dark:hover:bg-slate-600'}`}
                  >
                    <Star className={`w-4 h-4 ${template.starred ? 'fill-warning text-warning dark:fill-warning dark:text-warning' : 'text-muted-foreground'}`} />
                  </button>
                  {/* 默认模板徽章 */}
                  {template.isDefault && (
                    <Badge className="absolute top-3 left-12 bg-secondary/20 text-secondary border-secondary/30 gap-1 z-10">
                      默认
                    </Badge>
                  )}
                  {/* 基于模板类别的图标 */}
                  {generateTemplatePreview(template).icon === 'FileText' && <FileText className={`text-primary/60 relative z-0 ${viewMode === 'grid' ? 'w-16 h-16' : 'w-12 h-12'}`} />}
                  {generateTemplatePreview(template).icon === 'Layout' && <Layout className={`text-primary/60 relative z-0 ${viewMode === 'grid' ? 'w-16 h-16' : 'w-12 h-12'}`} />}
                  {generateTemplatePreview(template).icon === 'Star' && <Star className={`text-primary/60 relative z-0 ${viewMode === 'grid' ? 'w-16 h-16' : 'w-12 h-12'}`} />}
                </div>

                {/* 信息 */}
                <div className="p-5 flex-1 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="truncate mb-2">{template.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {template.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(template.createdAt).toLocaleDateString('zh-CN')}
                      </span>
                      <span className="text-muted-foreground/50">•</span>
                      <span>{template.usageCount} 次使用</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge 
                        variant="outline" 
                        className="rounded-lg text-xs border-primary/30 bg-primary/5 text-primary dark:bg-primary/10 dark:border-primary/40"
                      >
                        {template.layout}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className="rounded-lg text-xs border-secondary/30 bg-secondary/5 text-secondary dark:bg-secondary/10 dark:border-secondary/40"
                      >
                        {template.style}
                      </Badge>
                      {(template.tags || []).slice(0, 2).map((tag) => (
                        <Badge 
                          key={tag} 
                          variant="outline" 
                          className="rounded-lg text-xs border-secondary/30 bg-secondary/5 text-secondary dark:bg-secondary/10 dark:border-secondary/40"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {(template.tags || []).length > 2 && (
                        <Badge 
                          variant="outline" 
                          className="rounded-lg text-xs border-muted bg-muted/50 text-muted-foreground"
                        >
                          +{(template.tags || []).length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* 操作菜单 */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity rounded-lg h-8 w-8 p-0 flex-shrink-0"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                      <DropdownMenuItem
                        onClick={() => handleUseTemplate(template.id)}
                        className="rounded-lg"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        使用模板
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => toggleStar(template.id, e)}
                        className="rounded-lg"
                      >
                        <Star className="w-4 h-4 mr-2" />
                        {template.starred ? '取消收藏' : '收藏'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="rounded-lg">
                        <Download className="w-4 h-4 mr-2" />
                        下载
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}