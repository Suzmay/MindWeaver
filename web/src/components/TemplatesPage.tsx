import { useState } from 'react';
import { Layout, Star, FileText, Search, Filter, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';

interface Template {
  id: string;
  name: string;
  isDefault?: boolean;
  type: 'basic' | 'business' | 'education' | 'personal';
  tags: string[];
  uploader: string;
}

export function TemplatesPage() {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);

  const [templates] = useState<Template[]>([
    {
      id: '1',
      name: '默认模板',
      isDefault: true,
      type: 'basic',
      tags: ['基础', '通用'],
      uploader: '系统',
    },
    {
      id: '2',
      name: '商务战略',
      type: 'business',
      tags: ['商业', '战略', '分析'],
      uploader: '系统',
    },
    {
      id: '3',
      name: '项目规划',
      type: 'business',
      tags: ['项目', '计划', '管理'],
      uploader: '系统',
    },
    {
      id: '4',
      name: '创意头脑风暴',
      type: 'personal',
      tags: ['创意', '头脑风暴', '灵感'],
      uploader: '系统',
    },
    {
      id: '5',
      name: '学习笔记',
      type: 'education',
      tags: ['学习', '教育', '笔记'],
      uploader: '系统',
    },
    {
      id: '6',
      name: '个人目标',
      type: 'personal',
      tags: ['个人', '目标', '规划'],
      uploader: '系统',
    },
  ]);

  const allTags = [...new Set(templates.flatMap(t => t.tags))];

  const filteredTemplates = templates.filter(template => {
    if (searchKeyword) {
      const lowerKeyword = searchKeyword.toLowerCase();
      if (!template.name.toLowerCase().includes(lowerKeyword) &&
          !template.tags.some(tag => tag.toLowerCase().includes(lowerKeyword))) {
        return false;
      }
    }
    if (filterTag && !template.tags.includes(filterTag)) {
      return false;
    }
    return true;
  });

  return (
    <div className="p-8 space-y-6">
      {/* 头部 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1>模板中心</h1>
          <p className="text-muted-foreground mt-1">
            选择预设模板，快速开始你的思维导图创作
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button className="rounded-2xl gap-2 bg-gradient-to-br from-primary to-secondary hover:opacity-90 shadow-ocean font-semibold">
            <Layout className="w-5 h-5" />
            新建模板
          </Button>
          <Button className="rounded-2xl gap-2 bg-gradient-to-br from-primary to-secondary hover:opacity-90 shadow-ocean font-semibold">
            <Settings className="w-5 h-5" />
            管理模板
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="rounded-2xl gap-2 bg-gradient-to-br from-primary to-secondary hover:opacity-90 shadow-ocean font-semibold">
                <Filter className="w-5 h-5" />
                {filterTag ? filterTag : '筛选标签'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-xl">
              <DropdownMenuItem
                onClick={() => setFilterTag(null)}
                className={`rounded-lg ${!filterTag ? 'bg-accent dark:bg-accent/30' : ''}`}
              >
                全部
              </DropdownMenuItem>
              {allTags.map(tag => (
                <DropdownMenuItem
                  key={tag}
                  onClick={() => setFilterTag(tag)}
                  className={`rounded-lg ${filterTag === tag ? 'bg-accent dark:bg-accent/30' : ''}`}
                >
                  {tag}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 搜索框 */}
      <div className="relative">
        <div className="absolute left-3 top-0 bottom-0 flex items-center">
          <Search className="w-5 h-5 text-muted-foreground" />
        </div>
        <Input
          placeholder="搜索模板..."
          className="pl-10 rounded-xl border-primary/20 focus:border-primary"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
        />
      </div>

      {/* 模板网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <Card
            key={template.id}
            className="rounded-2xl shadow-ocean hover:shadow-ocean-lg transition-all duration-200 hover:scale-[1.03] cursor-pointer group border-2 border-primary/10 hover:border-primary/30"
          >
            <CardContent className="p-0">
              {/* 预览 */}
              <div className="h-40 bg-gradient-to-br from-primary/30 via-secondary/20 to-accent/15 rounded-t-2xl flex items-center justify-center relative overflow-hidden">
                {/* 简单的思维导图预览插图 */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    {/* 中心节点 */}
                    <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center shadow-ocean">
                      <FileText className="w-8 h-8 text-white" />
                    </div>
                    {/* 分支节点 */}
                    <div className="absolute -left-12 top-1/2 -translate-y-1/2 w-8 h-8 bg-gradient-to-br from-secondary to-accent rounded-xl shadow-sm" />
                    <div className="absolute -right-12 top-1/2 -translate-y-1/2 w-8 h-8 bg-gradient-to-br from-secondary to-accent rounded-xl shadow-sm" />
                    <div className="absolute left-1/2 -translate-x-1/2 -top-10 w-8 h-8 bg-gradient-to-br from-secondary to-accent rounded-xl shadow-sm" />
                  </div>
                </div>

                {template.isDefault && (
                  <Badge className="absolute top-3 right-3 bg-warning text-white rounded-lg gap-1">
                    <Star className="w-3 h-3 fill-current" />
                    默认
                  </Badge>
                )}
              </div>

              {/* 信息 */}
              <div className="pt-5 px-5 pb-0">
                <h3 className="mb-3">{template.name}</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {template.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="rounded-lg text-xs border-secondary/30 bg-secondary/5 text-secondary dark:bg-secondary/10 dark:border-secondary/40">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <Button className="w-full rounded-xl bg-gradient-to-br from-primary to-secondary hover:opacity-90 text-white font-semibold shadow-sm mb-3">
                  使用此模板
                </Button>
                <div className="flex justify-end items-center gap-1.5 text-xs text-muted-foreground">
                  <span>上传者：</span>
                  <span className="font-medium">{template.uploader}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
