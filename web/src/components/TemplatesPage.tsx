import { useState } from 'react';
import { Star, FileText, Search, Filter, Settings, Plus, X, Edit, Trash2, Share2, Download } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { useStorage } from '../context/StorageContext';
import { useUser } from '../context/UserContext';
import { toast } from 'sonner';
import { LayoutSelectionDialog } from './editor/LayoutSelectionDialog';
import { LayoutMode, LayoutDirection } from './editor/LayoutManager';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Template, TemplateCreateDTO, TemplateUpdateDTO } from '../models/Template';

export function TemplatesPage() {
  const storage = useStorage();
  const { user, isGuest } = useUser();
  const { templates } = storage;
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showLayoutDialog, setShowLayoutDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  
  // 新建模板对话框状态
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [newTemplateType, setNewTemplateType] = useState<'basic' | 'business' | 'education' | 'personal'>('basic');
  const [newTemplateNodes, setNewTemplateNodes] = useState<string>(`# 中心主题
- 主要分支 1
  - 子分支 1.1
  - 子分支 1.2
- 主要分支 2
  - 子分支 2.1
- 主要分支 3`);
  const [newTemplateTags, setNewTemplateTags] = useState<string[]>([]);
  const [newTemplateTagInput, setNewTemplateTagInput] = useState<string>('');
  const [newTemplateTagError, setNewTemplateTagError] = useState<string>('');
  
  // 管理模板对话框状态
  const [showManagementDialog, setShowManagementDialog] = useState(false);
  const [selectedManageTemplate, setSelectedManageTemplate] = useState<Template | null>(null);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set());
  const [editMode, setEditMode] = useState(false);
  const [editTemplateName, setEditTemplateName] = useState('');
  const [editTemplateDescription, setEditTemplateDescription] = useState('');
  const [editTemplateTags, setEditTemplateTags] = useState<string[]>([]);
  const [editTemplateTagInput, setEditTemplateTagInput] = useState('');
  const [editTemplateError, setEditTemplateError] = useState('');



  const handleUseTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) {
      toast.error('模板未找到');
      return;
    }
    setSelectedTemplate(template);
    setShowLayoutDialog(true);
  };

  const handleCreateWithLayout = async (layout: { mode: LayoutMode; direction: LayoutDirection; category: string }) => {
    if (!selectedTemplate || isCreating) {
      return;
    }

    setIsCreating(true);

    try {
      // 生成唯一标题，使用(1)、(2)格式
      const getUniqueTitle = async (baseTitle: string) => {
        const workListResult = await storage.listWorks({
          page: 1,
          pageSize: 100,
          searchText: '',
          category: undefined,
          starredOnly: false,
          tags: undefined,
          sortBy: undefined,
          deletedOnly: false,
          sortOrder: 'desc'
        });
        const existingTitles = workListResult.works.map(work => work.title);
        
        if (!existingTitles.includes(baseTitle)) {
          return baseTitle;
        }
        
        let counter = 1;
        let newTitle;
        do {
          newTitle = `${baseTitle}(${counter})`;
          // 如果找到唯一标题，跳出循环；否则增加计数器
          if (!existingTitles.includes(newTitle)) {
            break;
          }
          counter++;
        } while (true);
        
        return newTitle;
      };

      const uniqueTitle = await getUniqueTitle(selectedTemplate.title);

      const workCreateDTO = {
        title: uniqueTitle,
        category: layout.category,
        tags: [...(selectedTemplate.tags || [])],
        layout: {
          mode: layout.mode,
          direction: layout.direction
        },
        nodes: selectedTemplate.nodesData?.length || 1,
        isDefault: false,
        isReadonly: false,
        nodesData: selectedTemplate.nodesData
      };

      const newWork = await storage.createWork(workCreateDTO);

      toast.success(`已使用模板创建思维导图: ${newWork.title}`);
    } catch (error) {
      console.error('使用模板失败:', error);
      toast.error('使用模板失败，请重试');
    } finally {
      setIsCreating(false);
      setShowLayoutDialog(false);
      setSelectedTemplate(null);
    }
  };

  // 将文本格式的节点转换为应用期望的节点结构
  const parseNodesText = (text: string): any[] => {
    if (!text.trim()) {
      return [];
    }

    const lines = text.trim().split('\n');
    const nodes: any[] = [];
    const nodeStack: { node: any; level: number }[] = [];
    let nodeIdCounter = 1;

    // 根节点处理
    const rootLine = lines[0].trim();
    if (rootLine.startsWith('# ')) {
      const rootTitle = rootLine.slice(2).trim();
      const rootNode = {
        id: 'root',
        title: rootTitle,
        children: [],
        isRoot: true
      };
      nodes.push(rootNode);
      nodeStack.push({ node: rootNode, level: 0 });
    } else {
      // 如果没有以#开头的根节点，使用第一行作为根节点
      const rootTitle = rootLine.replace(/^[-*+]\s*/, '').trim();
      const rootNode = {
        id: 'root',
        title: rootTitle,
        children: [],
        isRoot: true
      };
      nodes.push(rootNode);
      nodeStack.push({ node: rootNode, level: 0 });
    }

    // 处理其他行
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // 计算缩进级别
      const indentMatches = line.match(/^(\s+)/);
      const indent = indentMatches ? indentMatches[0].length : 0;
      const level = Math.floor(indent / 2); // 每2个空格为一个级别

      // 提取标题
      const title = line.replace(/^[-*+]\s*/, '').trim();
      if (!title) continue;

      // 创建新节点
      const newNode = {
        id: `node${nodeIdCounter++}`,
        title: title,
        children: [],
        parentId: nodeStack[nodeStack.length - 1].node.id
      };
      nodes.push(newNode);

      // 调整节点栈
      while (nodeStack.length > 0 && nodeStack[nodeStack.length - 1].level >= level) {
        nodeStack.pop();
      }

      // 添加到父节点的children数组
      if (nodeStack.length > 0) {
        nodeStack[nodeStack.length - 1].node.children.push(newNode.id);
      }

      // 将当前节点入栈
      nodeStack.push({ node: newNode, level });
    }

    return nodes;
  };

  // 处理添加标签
  const handleAddTag = (e?: React.KeyboardEvent) => {
    // 如果是键盘事件，只在Enter键时处理
    if (e && e.key !== 'Enter') return;
    
    if (newTemplateTagInput.trim()) {
      // 检查标签数量限制
      if (newTemplateTags.length >= 3) {
        setNewTemplateTagError('标签数量不能超过3个');
        setNewTemplateTagInput('');
        // 3秒后自动清除错误信息
        setTimeout(() => {
          setNewTemplateTagError('');
        }, 3000);
        return;
      }
      
      const tag = newTemplateTagInput.trim().toLowerCase();
      if (!newTemplateTags.includes(tag)) {
        setNewTemplateTags([...newTemplateTags, tag]);
        setNewTemplateTagError('');
      }
      setNewTemplateTagInput('');
    }
  };

  // 处理删除标签
  const handleRemoveTag = (tagToRemove: string) => {
    setNewTemplateTags(newTemplateTags.filter(tag => tag !== tagToRemove));
    setNewTemplateTagError('');
  };

  // 处理新建模板
  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast.error('请输入模板名称');
      return;
    }

    setIsCreating(true);

    try {
      // 解析节点文本
      const parsedNodes = parseNodesText(newTemplateNodes);

      // 创建模板DTO
      const templateDTO: TemplateCreateDTO = {
        title: newTemplateName.trim(),
        templateType: newTemplateType,
        isDefault: false,
        themeConfig: {
          primaryColor: '#3b82f6',
          secondaryColor: '#10b981',
          backgroundColor: '#ffffff',
          nodeShape: 'rounded',
          edgeStyle: 'curved',
          fontFamily: 'sans-serif',
          animationEnabled: true
        },
        layoutConfig: {
          layoutType: 'mindmap', // 默认思维导图布局，在使用时可以选择其他布局
          direction: 'horizontal', // 默认水平方向，在使用时可以选择其他方向
          levelSpacing: 80,
          nodeSpacing: 40
        },
        tags: newTemplateTags,
        nodesData: parsedNodes,
        uploader: isGuest ? '游客' : (user?.username || '未知')
      };

      // 调用存储服务创建模板
      await storage.createTemplate(templateDTO);

      toast.success(`模板创建成功: ${newTemplateName}`);
      
      // 关闭对话框并重置表单
      setShowCreateDialog(false);
      setNewTemplateName('');
      setNewTemplateDescription('');
      setNewTemplateType('basic');
      setNewTemplateNodes(`# 中心主题
- 主要分支 1
  - 子分支 1.1
  - 子分支 1.2
- 主要分支 2
  - 子分支 2.1
- 主要分支 3`);
      setNewTemplateTags([]);
      setNewTemplateTagInput('');
      setNewTemplateTagError('');
    } catch (error) {
      console.error('创建模板失败:', error);
      toast.error('创建模板失败，请重试');
    } finally {
      setIsCreating(false);
    }
  };

  // 管理模板相关函数
  const toggleSelectAll = () => {
    const userTemplates = templates.filter(t => t.uploader !== '官方');
    if (selectedTemplateIds.size === userTemplates.length) {
      setSelectedTemplateIds(new Set());
    } else {
      setSelectedTemplateIds(new Set(userTemplates.map(t => t.id)));
    }
  };

  const handleSelectTemplate = (template: Template) => {
    setSelectedManageTemplate(template);
    setEditTemplateName(template.title);
    setEditTemplateDescription(template.description || '');
    setEditTemplateTags([...(template.tags || [])]);
    setEditMode(false);
    setEditTemplateError('');
  };

  const handleEditTemplate = () => {
    setEditMode(true);
  };

  const handleEditAddTag = () => {
    if (editTemplateTagInput.trim() && !editTemplateTags.includes(editTemplateTagInput.trim()) && editTemplateTags.length < 3) {
      setEditTemplateTags([...editTemplateTags, editTemplateTagInput.trim()]);
      setEditTemplateTagInput('');
      setEditTemplateError('');
    } else if (editTemplateTags.length >= 3) {
      setEditTemplateError('最多只能添加3个标签');
    }
  };

  const handleEditRemoveTag = (tag: string) => {
    setEditTemplateTags(editTemplateTags.filter(t => t !== tag));
    setEditTemplateError('');
  };

  const handleSaveTemplate = async () => {
    if (!selectedManageTemplate || !editTemplateName.trim()) {
      setEditTemplateError('请输入模板名称');
      return;
    }

    if (editTemplateTags.length === 0) {
      setEditTemplateError('请至少添加一个标签');
      return;
    }

    try {
      const updateDTO: TemplateUpdateDTO = {
        title: editTemplateName,
        description: editTemplateDescription,
        tags: editTemplateTags
      };

      await storage.updateTemplate(selectedManageTemplate.id, updateDTO);
      setEditMode(false);
      toast.success('模板更新成功');
    } catch (error) {
      console.error('更新模板失败:', error);
      toast.error('模板更新失败');
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedManageTemplate) return;

    try {
      await storage.deleteTemplate(selectedManageTemplate.id);
      setSelectedManageTemplate(null);
      setEditMode(false);
      toast.success('模板删除成功');
    } catch (error) {
      console.error('删除模板失败:', error);
      toast.error('模板删除失败');
    }
  };

  // 处理管理对话框打开
  const handleOpenManagementDialog = () => {
    setShowManagementDialog(true);
    setSelectedManageTemplate(null);
    setSelectedTemplateIds(new Set());
    setEditMode(false);
  };

  const allTags = [...new Set(templates.flatMap(t => t.tags || []))];

  const filteredTemplates = templates.filter(template => {
    if (searchKeyword) {
      const lowerKeyword = searchKeyword.toLowerCase();
      if (!template.title.toLowerCase().includes(lowerKeyword) &&
          !template.tags?.some(tag => tag.toLowerCase().includes(lowerKeyword))) {
        return false;
      }
    }
    if (filterTag && !template.tags?.includes(filterTag)) {
      return false;
    }
    return true;
  });

  // 用户创建的模板（非官方）
  const userTemplates = templates.filter(t => t.uploader !== '官方');

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
          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="rounded-2xl gap-2 bg-gradient-to-br from-primary to-secondary hover:opacity-90 shadow-ocean font-semibold"
          >
            <Plus className="w-5 h-5" />
            新建模板
          </Button>
          <Button 
            onClick={handleOpenManagementDialog}
            className="rounded-2xl gap-2 bg-gradient-to-br from-primary to-secondary hover:opacity-90 shadow-ocean font-semibold"
          >
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
                <h3 className="mb-3">{template.title}</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {template.tags?.map((tag, index) => (
                    <Badge key={index} variant="outline" className="rounded-lg text-xs border-secondary/30 bg-secondary/5 text-secondary dark:bg-secondary/10 dark:border-secondary/40">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <Button 
                  onClick={() => handleUseTemplate(template.id)}
                  disabled={isCreating}
                  className="w-full rounded-xl bg-gradient-to-br from-primary to-secondary hover:opacity-90 text-white font-semibold shadow-sm mb-3"
                >
                  {isCreating ? '创建中...' : '使用此模板'}
                </Button>
                <div className="flex justify-end items-center gap-1.5 text-xs text-muted-foreground">
                  <span>上传者：</span>
                  <span className="font-medium">{template.uploader || '未知'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 新建模板对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>新建模板</DialogTitle>
            <DialogDescription>
              创建一个新的思维导图模板
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="template-name">模板名称</Label>
              <Input
                id="template-name"
                placeholder="输入模板名称"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="template-description">模板描述</Label>
              <Input
                id="template-description"
                placeholder="输入模板描述（可选）"
                value={newTemplateDescription}
                onChange={(e) => setNewTemplateDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="template-type">模板类型</Label>
              <Select
                value={newTemplateType}
                onValueChange={(value) => setNewTemplateType(value as any)}
              >
                <SelectTrigger id="template-type">
                  <SelectValue placeholder="选择模板类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">基础</SelectItem>
                  <SelectItem value="business">商务</SelectItem>
                  <SelectItem value="education">教育</SelectItem>
                  <SelectItem value="personal">个人</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="template-tags">模板标签</Label>
              <div className="flex gap-2">
                <Input
                  id="template-tags"
                  placeholder="输入标签并按回车添加"
                  value={newTemplateTagInput}
                  onChange={(e) => setNewTemplateTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  className={newTemplateTagError ? 'border-destructive' : ''}
                />
                <Button size="sm" onClick={() => handleAddTag()}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {newTemplateTagError && (
                <p className="text-xs text-destructive">
                  {newTemplateTagError}
                </p>
              )}
              <div className="flex justify-between items-center">
                <div className="flex flex-wrap gap-2">
                  {newTemplateTags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="flex items-center gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-destructive"
                        title="删除标签"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {newTemplateTags.length}/3
                </span>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="template-nodes">模板节点（支持Markdown格式）</Label>
              <textarea
                id="template-nodes"
                placeholder="使用Markdown格式创建节点结构，例如：
# 中心主题
- 主要分支 1
  - 子分支 1.1
  - 子分支 1.2
- 主要分支 2"
                value={newTemplateNodes}
                onChange={(e) => setNewTemplateNodes(e.target.value)}
                className="min-h-[200px] p-3 border rounded-md text-sm"
                style={{ resize: 'vertical' }}
              />
              <p className="text-xs text-muted-foreground">
                格式说明：
                <br />- 使用 # 开头定义中心主题
                <br />- 使用 - 或 * 开头定义分支节点
                <br />- 使用缩进来表示节点层级关系
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button onClick={handleCreateTemplate} disabled={isCreating || !newTemplateName.trim() || newTemplateTags.length === 0}>
              {isCreating ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 布局选择对话框 */}
      <LayoutSelectionDialog
        isOpen={showLayoutDialog}
        onClose={() => setShowLayoutDialog(false)}
        onSelect={handleCreateWithLayout}
      />

      {/* 管理模板对话框 */}
      <Dialog open={showManagementDialog} onOpenChange={setShowManagementDialog}>
        <DialogContent className="sm:max-w-[700px] rounded-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <div>
                <DialogTitle className="text-xl font-semibold">模板管理</DialogTitle>
                <DialogDescription>
                  管理您创建的模板
                </DialogDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={selectedTemplateIds.size === 0}
                >
                  <Share2 className="w-4 h-4 mr-1" />
                  分享{selectedTemplateIds.size > 0 && ` (${selectedTemplateIds.size})`}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={selectedTemplateIds.size === 0}
                >
                  <Download className="w-4 h-4 mr-1" />
                  导出{selectedTemplateIds.size > 0 && ` (${selectedTemplateIds.size})`}
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 模板列表 */}
            <div className="md:col-span-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">模板列表</h3>
                {userTemplates.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={toggleSelectAll}
                  >
                    {selectedTemplateIds.size === userTemplates.length ? '取消全选' : '全选'}
                  </Button>
                )}
              </div>
              <div className="border rounded-lg max-h-[500px] overflow-y-auto">
                {userTemplates.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    没有可管理的模板
                  </div>
                ) : (
                  userTemplates.map((template) => (
                    <div
                      key={template.id}
                      className={`p-3 cursor-pointer transition-colors ${selectedManageTemplate?.id === template.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted'}`}
                      onClick={() => handleSelectTemplate(template)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium truncate">{template.title}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {template.tags?.map((tag) => (
                              <Badge key={tag} variant="outline" className="mr-1 mb-1">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={selectedTemplateIds.has(template.id)}
                            onChange={() => {
                              const newSelected = new Set(selectedTemplateIds);
                              if (newSelected.has(template.id)) {
                                newSelected.delete(template.id);
                              } else {
                                newSelected.add(template.id);
                              }
                              setSelectedTemplateIds(newSelected);
                            }}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                        <span>{template.templateType}</span>
                        <span>{new Date(template.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {/* 模板详情和编辑 */}
            <div className="md:col-span-2 min-h-[300px] max-h-[500px] overflow-y-auto">
              {selectedManageTemplate ? (
                <div className="space-y-4">
                  {editMode ? (
                    // 编辑模式
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">编辑模板</h3>
                      
                      <div className="space-y-2">
                        <Label htmlFor="edit-template-name">名称</Label>
                        <Input
                          id="edit-template-name"
                          value={editTemplateName}
                          onChange={(e) => setEditTemplateName(e.target.value)}
                          placeholder="输入模板名称"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="edit-template-description">描述</Label>
                        <Input
                          id="edit-template-description"
                          value={editTemplateDescription}
                          onChange={(e) => setEditTemplateDescription(e.target.value)}
                          placeholder="输入模板描述（可选）"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="edit-template-tags">标签</Label>
                        <div className="flex gap-2">
                          <Input
                            id="edit-template-tags"
                            value={editTemplateTagInput}
                            onChange={(e) => setEditTemplateTagInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleEditAddTag()}
                            placeholder="输入标签并按回车添加"
                            className={editTemplateError ? 'border-destructive' : ''}
                          />
                          <Button size="sm" onClick={handleEditAddTag}>
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        {editTemplateError && (
                          <p className="text-xs text-destructive">
                            {editTemplateError}
                          </p>
                        )}
                        <div className="flex justify-between items-center">
                          <div className="flex flex-wrap gap-2">
                            {editTemplateTags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="flex items-center gap-1">
                                {tag}
                                <button
                                  type="button"
                                  onClick={() => handleEditRemoveTag(tag)}
                                  className="ml-1 hover:text-destructive"
                                  title="删除标签"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {editTemplateTags.length}/3
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 justify-end">
                        <Button onClick={handleSaveTemplate}>
                          保存
                        </Button>
                        <Button variant="outline" onClick={() => setEditMode(false)}>
                          取消
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // 查看模式
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">模板详情</h3>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleEditTemplate}>
                            <Edit className="w-4 h-4 mr-1" />
                            编辑
                          </Button>
                          <Button size="sm" variant="destructive" onClick={handleDeleteTemplate}>
                            <Trash2 className="w-4 h-4 mr-1" />
                            删除
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-xs text-muted-foreground mb-1">名称</h4>
                          <p className="font-medium">{selectedManageTemplate.title}</p>
                        </div>
                        
                        <div>
                          <h4 className="text-xs text-muted-foreground mb-1">描述</h4>
                          <p>{selectedManageTemplate.description || '-'}</p>
                        </div>
                        
                        <div>
                          <h4 className="text-xs text-muted-foreground mb-1">类型</h4>
                          <p>{selectedManageTemplate.templateType}</p>
                        </div>
                        
                        <div>
                          <h4 className="text-xs text-muted-foreground mb-1">标签</h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedManageTemplate.tags?.map((tag) => (
                              <Badge key={tag} variant="outline">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="text-xs text-muted-foreground mb-1">创建时间</h4>
                          <p>{new Date(selectedManageTemplate.createdAt).toLocaleString()}</p>
                        </div>
                        
                        <div>
                          <h4 className="text-xs text-muted-foreground mb-1">使用次数</h4>
                          <p>{selectedManageTemplate.usageCount}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  请选择一个模板查看详情
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
