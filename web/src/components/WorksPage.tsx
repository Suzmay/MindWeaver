import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Grid3x3, List, MoreVertical, Trash2, Download, FileText, Search, Filter, Star, Clock, Folder, Tag, FileEdit, Lock, Check, CheckSquare, Square, AlertTriangle, X, ArrowLeft, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Label } from './ui/label';
import { LayoutSelectionDialog } from './editor/LayoutSelectionDialog';
import { Work } from '../models/Work';
import { useStorage } from '../context/StorageContext';
import { useUser } from '../context/UserContext';

interface WorksPageProps {
  onEditWork: (workId: string) => void;
}

export function WorksPage({ onEditWork }: WorksPageProps) {
  const { } = useUser();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'lastModified' | 'createdAt' | 'nodeCount' | 'category' | 'starred' | 'recent'>('recent');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterTag, setFilterTag] = useState('all');
  const [showStarredOnly, setShowStarredOnly] = useState(false);

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newTag, setNewTag] = useState('');
  const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false);

  // 批量选择状态
  const [selectedWorks, setSelectedWorks] = useState<string[]>([]);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [isAllSelected, setIsAllSelected] = useState(false);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalWorks, setTotalWorks] = useState(0);
  
  // 废纸篓状态
  const [showTrash, setShowTrash] = useState(false);
  
  // 创建状态
  const [isCreating, setIsCreating] = useState(false);
  // 布局选择对话框状态
  const [showLayoutDialog, setShowLayoutDialog] = useState(false);
  // 保存结果
  const [saveResult, setSaveResult] = useState<'success' | 'error' | null>(null);
  // 保存消息
  const [saveMessage, setSaveMessage] = useState<string>('');
  // 错误状态
  const [error, setError] = useState<string | null>(null);
  
  const storage = useStorage();
  const [works, setWorks] = useState<Work[]>([]);
  const mountedRef = useRef(false);
  const location = useLocation();

  // 使用 useCallback 包装 loadWorks 函数，减少不必要的重新渲染
  const loadWorks = useCallback(async () => {
    try {
      // 设置加载状态
      if (mountedRef.current) {
        setError(null);
      }
      
      // 等待存储服务初始化
      if (!storage.initialized) {
        setTimeout(loadWorks, 100);
        return;
      }
      
      // 构建查询选项
      const queryOptions = {
        page: currentPage,
        pageSize: pageSize,
        searchText: searchQuery,
        category: filterCategory === 'all' || filterCategory === 'grouped' ? undefined : filterCategory,
        starredOnly: showStarredOnly,
        tags: filterTag === 'all' ? undefined : [filterTag],
        sortBy: sortBy === 'starred' || sortBy === 'recent' ? undefined : sortBy,
        deletedOnly: showTrash,
        sortOrder: 'desc' as const
      };
      
      // 获取作品列表
      const loadedWorks = await storage.listWorks(queryOptions);
      
      // 更新总数
      if (mountedRef.current) {
        setTotalWorks(loadedWorks.length);
      }
      
      // 直接使用存储服务返回的作品列表
      // 这样可以确保显示最新的作品数据
      if (mountedRef.current) {
        setWorks(loadedWorks);
      }
    } catch (error) {
      // 设置错误状态
      if (mountedRef.current) {
        setError('加载作品数据失败，请重试');
        setWorks([]);
        setTotalWorks(0);
      }
    } finally {
      // 加载操作完成
    }
  }, [storage, storage.initialized, currentPage, pageSize, searchQuery, filterCategory, filterTag, showStarredOnly, sortBy, showTrash]);

  // 加载作品数据
  useEffect(() => {
    // 标记组件已挂载
    mountedRef.current = true;
    
    // 触发作品数据加载
    loadWorks();
    
    // 组件卸载时的清理函数
    return () => {
      mountedRef.current = false;
    };
  }, [loadWorks, location.pathname]);

  // 处理新建思维导图
  const handleNewWork = () => {
    // 显示布局选择对话框
    setShowLayoutDialog(true);
  };

  // 处理布局选择
  const handleLayoutSelect = async (layout: { mode: string; direction: string; category: string }) => {
    // 关闭对话框
    setShowLayoutDialog(false);
    
    // 防止重复点击
    if (isCreating) {
      return;
    }
    
    try {
      // 设置创建状态为 true
      setIsCreating(true);
      // 重置状态
      setSaveResult(null);
      setSaveMessage('');
      
      // 生成唯一的标题
      let baseTitle = '未命名思维导图';
      let title = baseTitle;
      let counter = 1;
      
      // 检查是否已存在同名作品
      while (works.some(work => work.title === title)) {
        title = `${baseTitle}(${counter})`;
        counter++;
      }
      
      // 构建 WorkCreateDTO 对象
      const workCreateDTO = {
        title: title,
        category: layout.category,
        tags: [],
        nodes: 0,
        layout: {
          mode: layout.mode,
          direction: layout.direction
        }
      };
      
      // 调用存储服务的 createWork 方法
      
      // 等待存储服务保存完成
      const savedWork = await storage.createWork(workCreateDTO);
      
      // 将保存的作品添加到本地状态
      const updatedWorks = [savedWork, ...works];
      
      // 只有当组件仍处于挂载状态时才更新状态
      if (mountedRef.current) {
        setWorks(updatedWorks);
        setTotalWorks(updatedWorks.length);
      }
      
      // 不自动导航到编辑页面，让用户在作品列表中手动选择
    } catch (error) {
      // 显示错误信息
      if (mountedRef.current) {
        setSaveResult('error');
        setSaveMessage('创建思维导图失败，请重试');
      }
    } finally {
      // 设置创建状态为 false
      setIsCreating(false);
    }
  };

  const handleDeleteWork = async (id: string) => {
    try {
      await storage.deleteWork(id);
      // 重新加载作品列表
      const loadedWorks = await storage.listWorks({
        page: 1,
        pageSize: 20,
        searchText: '',
        category: undefined,
        starredOnly: false,
        tags: undefined,
        sortBy: undefined,
        deletedOnly: showTrash,
        sortOrder: 'desc' as const
      });
      setWorks(loadedWorks);
      setTotalWorks(loadedWorks.length);
    } catch (error) {
      // 静默处理错误
    }
  };

  const toggleStar = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const work = works.find(w => w.id === id);
      if (work && !work.isReadonly) {
        await storage.updateWork(id, { starred: !work.starred });
        // 重新加载作品列表
        const loadedWorks = await storage.listWorks({
          page: 1,
          pageSize: 20,
          searchText: '',
          category: undefined,
          starredOnly: false,
          tags: undefined,
          sortBy: undefined,
          deletedOnly: showTrash,
          sortOrder: 'desc' as const
        });
        setWorks(loadedWorks);
        setTotalWorks(loadedWorks.length);
      }
    } catch (error) {
      // 静默处理错误
    }
  };

  const openRenameDialog = (work: Work, e: React.MouseEvent) => {
    if (work.isReadonly) {
      // 只读作品不允许重命名
      return;
    }
    
    e.stopPropagation();
    setSelectedWork(work);
    setNewTitle(work.title);
    setRenameDialogOpen(true);
  };

  const handleRename = async () => {
    if (!selectedWork || selectedWork.isReadonly) {
      // 只读作品不允许重命名
      return;
    }
    
    if (newTitle.trim()) {
      try {
        await storage.updateWork(selectedWork.id, { title: newTitle.trim() });
        // 重新加载作品列表
        const loadedWorks = await storage.listWorks({
          page: 1,
          pageSize: 20,
          searchText: '',
          category: undefined,
          starredOnly: false,
          tags: undefined,
          sortBy: undefined,
          deletedOnly: showTrash,
          sortOrder: 'desc' as const
        });
        setWorks(loadedWorks);
        setTotalWorks(loadedWorks.length);
        setRenameDialogOpen(false);
        setSelectedWork(null);
        setNewTitle('');
      } catch (error) {
        // 静默处理错误
      }
    }
  };

  const openTagDialog = (work: Work, e: React.MouseEvent) => {
    if (work.isReadonly) {
      // 只读作品不允许管理标签
      return;
    }
    
    e.stopPropagation();
    setSelectedWork(work);
    setNewTag('');
    setTagDialogOpen(true);
  };

  const handleAddTag = async () => {
    if (!selectedWork || selectedWork.isReadonly) {
      // 只读作品不允许添加标签
      return;
    }
    
    if (newTag.trim()) {
      try {
        const updatedTags = [...(selectedWork.tags || []), newTag.trim().toLowerCase()];
        await storage.updateWork(selectedWork.id, { tags: updatedTags });
        // 重新加载作品列表
        const loadedWorks = await storage.listWorks({
          page: 1,
          pageSize: 20,
          searchText: '',
          category: undefined,
          starredOnly: false,
          tags: undefined,
          sortBy: undefined,
          deletedOnly: showTrash,
          sortOrder: 'desc' as const
        });
        setWorks(loadedWorks);
        setTotalWorks(loadedWorks.length);
        // Update selectedWork to reflect the change in the dialog
        const updatedWork = loadedWorks.find((w: Work) => w.id === selectedWork.id);
        if (updatedWork) {
          setSelectedWork(updatedWork);
        }
        setNewTag('');
      } catch (error) {
        // 静默处理错误
      }
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!selectedWork || selectedWork.isReadonly) {
      // 只读作品不允许删除标签
      return;
    }
    
    try {
      const updatedTags = (selectedWork.tags || []).filter(t => t !== tagToRemove);
      await storage.updateWork(selectedWork.id, { tags: updatedTags });
      // 重新加载作品列表
      const loadedWorks = await storage.listWorks({
        page: 1,
        pageSize: 20,
        searchText: '',
        category: undefined,
        starredOnly: false,
        tags: undefined,
        sortBy: undefined,
        deletedOnly: showTrash,
        sortOrder: 'desc' as const
      });
      setWorks(loadedWorks);
      setTotalWorks(loadedWorks.length);
      // Update selectedWork to reflect the change in the dialog
      const updatedWork = loadedWorks.find((w: Work) => w.id === selectedWork.id);
      if (updatedWork) {
        setSelectedWork(updatedWork);
      }
    } catch (error) {
      // 静默处理错误
    }
  };

  // 批量选择函数
  const toggleWorkSelection = (workId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedWorks(prev => {
      const newSelection = prev.includes(workId)
        ? prev.filter(id => id !== workId)
        : [...prev, workId];
      setIsBatchMode(newSelection.length > 0);
      // 更新全选状态
      setIsAllSelected(newSelection.length === filteredWorks.length);
      return newSelection;
    });
  };

  const selectAllWorks = () => {
    if (isAllSelected) {
      // 取消全选
      setSelectedWorks([]);
      setIsAllSelected(false);
    } else {
      // 全选
      const allWorkIds = filteredWorks.map(work => work.id);
      setSelectedWorks(allWorkIds);
      setIsAllSelected(true);
      setIsBatchMode(true);
    }
  };

  const clearSelection = () => {
    setSelectedWorks([]);
    setIsAllSelected(false);
    // 保持批量选择模式
  };

  const exitSelection = () => {
    setSelectedWorks([]);
    setIsAllSelected(false);
    setIsBatchMode(false);
  };

  const handleBatchDelete = () => {
    // 打开删除确认对话框
    setDeleteConfirmDialogOpen(true);
  };

  // 批量恢复作品（从废纸篓）
  const handleBatchRestore = async () => {
    try {
      // 先执行所有恢复操作
      for (const workId of selectedWorks) {
        await storage.restoreWork(workId);
      }
      
      // 清空本地作品列表，强制重新加载
      setWorks([]);
      setTotalWorks(0);
      
      // 重新加载作品列表，保持当前筛选状态
      const queryOptions = {
        page: 1,
        pageSize: pageSize,
        searchText: searchQuery,
        category: filterCategory === 'all' || filterCategory === 'grouped' ? undefined : filterCategory,
        starredOnly: showStarredOnly,
        tags: filterTag === 'all' ? undefined : [filterTag],
        sortBy: sortBy === 'starred' || sortBy === 'recent' ? undefined : sortBy,
        deletedOnly: showTrash,
        sortOrder: 'desc' as const
      };
      
      const loadedWorks = await storage.listWorks(queryOptions);
      setWorks(loadedWorks);
      setTotalWorks(loadedWorks.length);
      setCurrentPage(1);
      clearSelection();
    } catch (error) {
      // 静默处理错误
    }
  };

  const confirmBatchDelete = async () => {
    try {
      // 先执行所有删除操作
      for (const workId of selectedWorks) {
        const work = works.find(w => w.id === workId);
        if (work && !work.isReadonly) {
          // 在废纸篓中执行永久删除，否则执行普通删除（移入废纸篓）
          await storage.deleteWork(workId, showTrash);
        }
      }
      
      // 清空本地作品列表，强制重新加载
      setWorks([]);
      setTotalWorks(0);
      
      // 重新加载作品列表，保持当前筛选状态
      const queryOptions = {
        page: 1,
        pageSize: pageSize,
        searchText: searchQuery,
        category: filterCategory === 'all' || filterCategory === 'grouped' ? undefined : filterCategory,
        starredOnly: showStarredOnly,
        tags: filterTag === 'all' ? undefined : [filterTag],
        sortBy: sortBy === 'starred' || sortBy === 'recent' ? undefined : sortBy,
        deletedOnly: showTrash,
        sortOrder: 'desc' as const
      };
      
      const loadedWorks = await storage.listWorks(queryOptions);
      setWorks(loadedWorks);
      setTotalWorks(loadedWorks.length);
      setCurrentPage(1);
      clearSelection();
      setDeleteConfirmDialogOpen(false);
    } catch (error) {
      // 静默处理错误
      setDeleteConfirmDialogOpen(false);
    }
  };

  // 恢复作品（从废纸篓）
  const handleRestoreWork = async (workId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await storage.restoreWork(workId);
      // 重新加载作品列表
      const loadedWorks = await storage.listWorks({
        page: 1,
        pageSize: 20,
        searchText: '',
        category: undefined,
        starredOnly: false,
        tags: undefined,
        sortBy: undefined,
        deletedOnly: showTrash,
        sortOrder: 'desc' as const
      });
      setWorks(loadedWorks);
      setTotalWorks(loadedWorks.length);
    } catch (error) {
      // 静默处理错误
    }
  };

  // 永久删除作品
  const handlePermanentDelete = async (workId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await storage.deleteWork(workId, true); // true 表示硬删除
      // 重新加载作品列表
      const loadedWorks = await storage.listWorks({
        page: 1,
        pageSize: 20,
        searchText: '',
        category: undefined,
        starredOnly: false,
        tags: undefined,
        sortBy: undefined,
        deletedOnly: showTrash,
        sortOrder: 'desc' as const
      });
      setWorks(loadedWorks);
      setTotalWorks(loadedWorks.length);
    } catch (error) {
      // 静默处理错误
    }
  };

  const handleBatchExport = () => {
    // 批量导出功能实现
    clearSelection();
  };

  const handleCopyWork = async (workId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // 调用存储服务的copyWork方法
      await storage.copyWork(workId);
      // 重新加载作品列表
      const loadedWorks = await storage.listWorks({
        page: 1,
        pageSize: 20,
        searchText: '',
        category: undefined,
        starredOnly: false,
        tags: undefined,
        sortBy: undefined,
        deletedOnly: showTrash,
        sortOrder: 'desc' as const
      });
      setWorks(loadedWorks);
      setTotalWorks(loadedWorks.length);
    } catch (error) {
      // 静默处理错误
    }
  };

  // 生成作品缩略图的函数
  const generateThumbnail = (work: Work) => {
    // 使用统一的背景颜色（内容日程的颜色）
    const bgColor = 'hsl(200, 75%, 85%)';
    
    // 基于作品标签生成图标
    const tagCount = work.tags?.length || 0;
    const iconIndex = tagCount % 5;
    const icons = ['FileText', 'Star', 'Clock', 'Folder', 'Tag'];
    const selectedIcon = icons[iconIndex];
    
    return {
      bgColor,
      icon: selectedIcon
    };
  };

  // 筛选和排序作品
  const filteredWorks = works
    .filter(work => {
      const matchesSearch = work.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'all' || filterCategory === 'grouped' || work.category === filterCategory;
      const matchesTag = filterTag === 'all' || (work.tags && work.tags.includes(filterTag));
      const matchesStarred = !showStarredOnly || work.starred;
      return matchesSearch && matchesCategory && matchesTag && matchesStarred;
    })
    .sort((a, b) => {
      if (sortBy === 'starred') {
        return (b.starred ? 1 : 0) - (a.starred ? 1 : 0);
      }
      // When in grouped view, sort by category first, then by starred status
      if (filterCategory === 'grouped') {
        const categoryCompare = (a.category || '').localeCompare(b.category || '');
        if (categoryCompare !== 0) return categoryCompare;
        return (b.starred ? 1 : 0) - (a.starred ? 1 : 0);
      }
      return 0; // Default to recent (already in order)
    });

  // Group works by category when filterCategory is 'grouped'
  const groupedWorks = filterCategory === 'grouped' 
    ? filteredWorks.reduce((acc, work) => {
        const category = work.category || '未分类';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(work);
        return acc;
      }, {} as Record<string, Work[]>) 
    : null;

  const categories = [
    'all',
    ...Array.from(
      new Set(
        works
          .map((w) => w.category)
          .filter((cat): cat is string => typeof cat === 'string' && cat.length > 0)
      )
    ),
  ];
  const tags = ['all', ...Array.from(new Set(works.flatMap(w => w.tags || [])))];

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>{showTrash ? '废纸篓' : '我的作品'}</h1>
          <p className="text-muted-foreground mt-1">
            {showTrash ? `已删除 ${works.length} 个思维导图` : `已创建 ${works.length} 个思维导图`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setShowTrash(!showTrash);
              // 重置选择栏状态
              setIsBatchMode(false);
              setSelectedWorks([]);
              setIsAllSelected(false);
            }}
            className="rounded-2xl gap-2 bg-gradient-to-br from-primary to-secondary hover:opacity-90 shadow-ocean font-semibold"
          >
            {showTrash ? (
              <>
                <ArrowLeft className="w-5 h-5" />
                返回作品
              </>
            ) : (
              <>
                <Trash2 className="w-5 h-5" />
                废纸篓
              </>
            )}
          </Button>
          {!showTrash && (
            <Button 
              onClick={handleNewWork} 
              disabled={isCreating}
              className="rounded-2xl gap-2 bg-gradient-to-br from-primary to-secondary hover:opacity-90 shadow-ocean font-semibold"
            >
              {isCreating ? (
                <>
                  <Clock className="w-5 h-5 animate-spin" />
                  创建中...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  新建思维导图
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Save Status and Error Messages */}
      {(saveResult || error) && (
        <div className={`rounded-2xl p-4 ${saveResult === 'success' ? 'bg-success/10 border-2 border-success/30' : saveResult === 'error' ? 'bg-destructive/10 border-2 border-destructive/30' : 'bg-warning/10 border-2 border-warning/30'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {saveResult === 'success' && <Check className="w-5 h-5 text-success" />}
              {saveResult === 'error' && <Trash2 className="w-5 h-5 text-destructive" />}
              {error && <AlertTriangle className="w-5 h-5 text-warning" />}
              <p className={`font-medium ${saveResult === 'success' ? 'text-success' : saveResult === 'error' ? 'text-destructive' : 'text-warning'}`}>
                {saveMessage || error}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSaveResult(null);
                setSaveMessage('');
                setError(null);
              }}
              className="h-8 w-8 p-0 rounded-full"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmDialogOpen} onOpenChange={setDeleteConfirmDialogOpen}>
        <DialogContent className="w-[400px] max-w-[90vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">确认删除</DialogTitle>
            <DialogDescription>
              您确定要删除选中的 {selectedWorks.length} 个作品吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirmDialogOpen(false)}
              className="rounded-xl hover:text-foreground"
            >
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmBatchDelete}
              className="rounded-xl hover:bg-destructive/90"
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Search and Filters */}
      {!showTrash && (
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="搜索思维导图..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl border-primary/20 focus:border-primary"
            />
          </div>

          {/* Category Filter */}
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

          {/* Tag Filter */}
           <Select value={filterTag} onValueChange={setFilterTag}>
             <SelectTrigger className="w-[180px] rounded-xl h-10 bg-background border-primary/20">
               <Tag className="w-4 h-4 mr-2" />
               <span>{filterTag === 'all' ? '标签' : filterTag}</span>
             </SelectTrigger>
             <SelectContent className="rounded-xl border-primary/20">
               <SelectItem value="all" className="cursor-pointer">
                 <span>全部标签</span>
               </SelectItem>
               {tags.slice(1).map((tag: string) => (
                  <SelectItem key={tag} value={tag} className="cursor-pointer">
                    <span>{tag}</span>
                  </SelectItem>
                ))}
             </SelectContent>
           </Select>
          




          {/* Sort */}
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
            <SelectTrigger className="w-[180px] rounded-xl border-primary/20">
              <Clock className="w-4 h-4 mr-2" />
              <SelectValue placeholder="排序方式" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="recent" className="rounded-lg">最近更新</SelectItem>
              <SelectItem value="starred" className="rounded-lg">收藏优先</SelectItem>
            </SelectContent>
          </Select>

          {/* View Toggle */}
          <div className="flex border rounded-xl overflow-hidden border-primary/20">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-none"
            >
              <Grid3x3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
      {showTrash && (
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="搜索已删除的思维导图..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl border-primary/20 focus:border-primary"
            />
          </div>
        </div>
      )}

      {/* Stats */}
      {!showTrash && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card 
            className={`rounded-2xl border-2 transition-all ${filterCategory === 'all' && filterTag === 'all' && !showStarredOnly ? 'border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5 shadow-md' : 'border-primary/20 bg-gradient-to-br from-primary/5 to-transparent hover:border-primary/40'}`}
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
                <p className="text-2xl">{works.length}</p>
                <p className="text-sm text-muted-foreground">导图总数</p>
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
                <p className="text-2xl">{works.filter(w => w.starred).length}</p>
                <p className="text-sm text-muted-foreground">收藏</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`rounded-2xl border-2 transition-all ${filterCategory !== 'all' ? 'border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5 shadow-md' : 'border-primary/20 bg-gradient-to-br from-primary/5 to-transparent'}`}
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
            className={`rounded-2xl border-2 transition-all ${filterTag !== 'all' ? 'border-secondary/40 bg-gradient-to-br from-secondary/10 to-secondary/5 shadow-md' : 'border-secondary/20 bg-gradient-to-br from-secondary/5 to-transparent'}`}
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
      )}

      {/* Batch Selection Toolbar */}
      {isBatchMode && (
        <div className="bg-card rounded-2xl border-2 border-primary/30 p-4 mb-6 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selectAllWorks}
                className="rounded-2xl border-primary/30 hover:opacity-90 hover:text-foreground"
              >
                <CheckSquare className="w-4 h-4 mr-1" />
                {isAllSelected ? '取消全选' : '全选'} ({filteredWorks.length})
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
              已选择 {selectedWorks.length} 个作品
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showTrash ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleBatchRestore}
                disabled={selectedWorks.length === 0}
                className="rounded-2xl border-primary/30 hover:opacity-90 hover:text-foreground"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                恢复
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleBatchExport}
                disabled={selectedWorks.length === 0}
                className="rounded-2xl border-primary/30 hover:opacity-90 hover:text-foreground"
              >
                <Download className="w-4 h-4 mr-1" />
                导出
              </Button>
            )}
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleBatchDelete}
              disabled={selectedWorks.length === 0}
              className="rounded-lg"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              {showTrash ? '永久删除' : '删除'}
            </Button>
          </div>
        </div>
      )}

      {/* Works Grid/List */}
      {filteredWorks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
            <FileText className="w-12 h-12 text-primary" />
          </div>
          <h3>{searchQuery ? '未找到结果' : (showTrash ? '废纸篓是空的' : '还没有思维导图')}</h3>
          <p className="text-muted-foreground text-center max-w-md">
            {searchQuery 
              ? '尝试调整搜索关键词或筛选条件'
              : (showTrash ? '删除的思维导图会显示在这里' : '创建第一张思维导图，开启你的可视化思维旅程')}
          </p>

        </div>
      ) : groupedWorks ? (
        // Grouped view by category
        <div className="space-y-6">
          {Object.entries(groupedWorks).map(([category, worksInCategory], index) => (
            <div key={category}>
              {/* Category header with dividing line */}
              <div className="flex items-center mb-8">
                {index > 0 && (
                  <div className="h-px flex-grow bg-border mr-4"></div>
                )}
                <h3 className="text-lg font-medium">{category} ({worksInCategory.length})</h3>
                <div className="h-px flex-grow bg-border ml-4"></div>
              </div>
              
              {/* Works in this category */}
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                    : 'space-y-3'
                }
              >
                {worksInCategory.map((work) => (
                  <Card
                    key={work.id}
                    className={`
                      rounded-2xl shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer group 
                      border-2 border-primary/10 hover:border-primary/30 bg-card
                      ${viewMode === 'list' ? 'hover:scale-[1.01]' : 'hover:scale-[1.03]'}
                      ${work.isReadonly ? 'opacity-90' : ''}
                    `}
                    onClick={() => onEditWork(work.id)}
                  >
                    <CardContent className={`p-0 ${viewMode === 'list' ? 'flex flex-row items-center' : ''}`}>
                      {/* Thumbnail */}
                      <div className={`flex items-center justify-center relative overflow-hidden ${viewMode === 'grid' ? 'h-40 rounded-t-2xl' : 'h-32 w-32 rounded-l-2xl flex-shrink-0'} bg-[var(--bg-color)]`} style={{ '--bg-color': generateThumbnail(work).bgColor } as React.CSSProperties}>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent" />
                        {/* Selection checkbox */}
                        <button
                          type="button"
                          onClick={(e) => toggleWorkSelection(work.id, e)}
                          title="选择作品"
                          className={`absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center transition-all z-20 hover:scale-110 bg-white/90 dark:bg-slate-700/90 hover:bg-primary/20`}
                        >
                          {selectedWorks.includes(work.id) ? (
                            <Check className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                        {/* Star button - only show when not in trash */}
                        {!showTrash && (
                          <button
                            type="button"
                            onClick={(e) => !work.isReadonly && toggleStar(work.id, e)}
                            title={work.starred ? '取消收藏' : '收藏'}
                            disabled={work.isReadonly}
                            className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all z-10 hover:scale-110 ${
                              work.starred 
                                ? 'bg-warning/20 hover:bg-warning/30 dark:bg-slate-700/90 dark:hover:bg-slate-600'
                                : 'bg-white/90 hover:bg-white dark:bg-slate-800/90 dark:hover:bg-slate-700'
                            } ${work.isReadonly ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <Star className={`w-4 h-4 ${work.starred ? 'fill-warning text-warning dark:fill-warning dark:text-warning' : 'text-muted-foreground dark:text-slate-500'}`} />
                          </button>
                        )}
                        {/* Readonly badge */}
                        {work.isReadonly && (
                          <Badge className="absolute top-3 left-12 bg-warning/20 text-warning border-warning/30 gap-1 z-10">
                            <Lock className="w-3 h-3" />
                            只读
                          </Badge>
                        )}
                        {/* Icon based on work tags */}
                        {generateThumbnail(work).icon === 'FileText' && <FileText className={`text-primary/60 relative z-0 ${viewMode === 'grid' ? 'w-16 h-16' : 'w-12 h-12'}`} />}
                        {generateThumbnail(work).icon === 'Star' && <Star className={`text-primary/60 relative z-0 ${viewMode === 'grid' ? 'w-16 h-16' : 'w-12 h-12'}`} />}
                        {generateThumbnail(work).icon === 'Clock' && <Clock className={`text-primary/60 relative z-0 ${viewMode === 'grid' ? 'w-16 h-16' : 'w-12 h-12'}`} />}
                        {generateThumbnail(work).icon === 'Folder' && <Folder className={`text-primary/60 relative z-0 ${viewMode === 'grid' ? 'w-16 h-16' : 'w-12 h-12'}`} />}
                        {generateThumbnail(work).icon === 'Tag' && <Tag className={`text-primary/60 relative z-0 ${viewMode === 'grid' ? 'w-16 h-16' : 'w-12 h-12'}`} />}
                      </div>

                      {/* Info */}
                      <div className="p-5 flex-1 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="truncate mb-2">{work.title}</h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 whitespace-nowrap">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(work.lastModified).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-muted-foreground/50">•</span>
            <span>{work.nodes} 个节点</span>
          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge 
                              variant="outline" 
                              className="rounded-lg text-xs border-primary/30 bg-primary/5 text-primary dark:bg-primary/10 dark:border-primary/40"
                            >
                              {work.category}
                            </Badge>
                            {(work.tags || []).slice(0, 2).map((tag) => (
                              <Badge 
                                key={tag} 
                                variant="outline" 
                                className="rounded-lg text-xs border-secondary/30 bg-secondary/5 text-secondary dark:bg-secondary/10 dark:border-secondary/40"
                              >
                                {tag}
                              </Badge>
                            ))}
                            {(work.tags || []).length > 2 && (
                              <Badge 
                                variant="outline" 
                                className="rounded-lg text-xs border-muted bg-muted/50 text-muted-foreground"
                              >
                                +{(work.tags || []).length - 2}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Actions Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={work.isReadonly}
                                className="opacity-0 group-hover:opacity-100 transition-opacity rounded-lg h-8 w-8 p-0 flex-shrink-0 ${work.isReadonly ? 'opacity-50 cursor-not-allowed' : ''}"
                              >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl">
                            {showTrash ? (
                              // 废纸篓中的操作
                              <>
                                <DropdownMenuItem
                                  onClick={(e) => handleRestoreWork(work.id, e)}
                                  className="rounded-lg"
                                >
                                  <RotateCcw className="w-4 h-4 mr-2" />
                                  恢复
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => handlePermanentDelete(work.id, e)}
                                  className="text-destructive focus:text-destructive rounded-lg"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  永久删除
                                </DropdownMenuItem>
                              </>
                            ) : (
                              // 常规操作
                              <>
                                {!work.isReadonly && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={(e) => openRenameDialog(work, e)}
                                      className="rounded-lg"
                                    >
                                      <FileEdit className="w-4 h-4 mr-2" />
                                      重命名
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => handleCopyWork(work.id, e)}
                                      className="rounded-lg"
                                    >
                                      <FileText className="w-4 h-4 mr-2" />
                                      复制
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => openTagDialog(work, e)}
                                      className="rounded-lg"
                                    >
                                      <Tag className="w-4 h-4 mr-2" />
                                      管理标签
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}
                                <DropdownMenuItem onClick={(e) => e.stopPropagation()} className="rounded-lg">
                                  <Download className="w-4 h-4 mr-2" />
                                  导出
                                </DropdownMenuItem>
                                {!work.isReadonly && (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteWork(work.id);
                                    }}
                                    className="text-destructive focus:text-destructive rounded-lg"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    删除
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
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
  // Regular view (non-grouped)
  <div
    className={
      viewMode === 'grid'
        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
        : 'space-y-3'
    }
  >
    {filteredWorks.map((work) => (
      <Card
        key={work.id}
        className={`
          rounded-2xl shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer group 
          border-2 border-primary/10 hover:border-primary/30 bg-card
          ${viewMode === 'list' ? 'hover:scale-[1.01]' : 'hover:scale-[1.03]'}
          ${work.isReadonly ? 'opacity-90' : ''}
        `}
        onClick={() => onEditWork(work.id)}
      >
              <CardContent className={`p-0 ${viewMode === 'list' ? 'flex flex-row items-center' : ''}`}>
                {/* Thumbnail */}
                <div className={`flex items-center justify-center relative overflow-hidden ${viewMode === 'grid' ? 'h-40 rounded-t-2xl' : 'h-32 w-32 rounded-l-2xl flex-shrink-0'} bg-[var(--bg-color)]`} style={{ '--bg-color': generateThumbnail(work).bgColor } as React.CSSProperties}>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent" />
                  {/* Selection checkbox */}
                  <button
                    type="button"
                    onClick={(e) => toggleWorkSelection(work.id, e)}
                    title="选择作品"
                    className={`absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center transition-all z-20 hover:scale-110 bg-white/90 dark:bg-slate-700/90 hover:bg-primary/20`}
                  >
                    {selectedWorks.includes(work.id) ? (
                      <Check className="w-4 h-4 text-primary" />
                    ) : (
                      <Square className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                  {/* Star button - only show when not in trash */}
                  {!showTrash && (
                    <button
                      type="button"
                      onClick={(e) => !work.isReadonly && toggleStar(work.id, e)}
                      title={work.starred ? '取消收藏' : '收藏'}
                      disabled={work.isReadonly}
                      className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all z-10 hover:scale-110 ${
                        work.starred 
                          ? 'bg-warning/20 hover:bg-warning/30 dark:bg-slate-700/90 dark:hover:bg-slate-600'
                          : 'bg-white/90 hover:bg-white dark:bg-slate-800/90 dark:hover:bg-slate-700'
                      } ${work.isReadonly ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Star className={`w-4 h-4 ${work.starred ? 'fill-warning text-warning dark:fill-warning dark:text-warning' : 'text-muted-foreground dark:text-slate-500'}`} />
                    </button>
                  )}
                  {/* Readonly badge */}
                  {work.isReadonly && (
                    <Badge className="absolute top-3 left-12 bg-warning/20 text-warning border-warning/30 gap-1 z-10">
                      <Lock className="w-3 h-3" />
                      只读
                    </Badge>
                  )}
                  {/* Icon based on work tags */}
                  {generateThumbnail(work).icon === 'FileText' && <FileText className={`text-primary/60 relative z-0 ${viewMode === 'grid' ? 'w-16 h-16' : 'w-12 h-12'}`} />}
                  {generateThumbnail(work).icon === 'Star' && <Star className={`text-primary/60 relative z-0 ${viewMode === 'grid' ? 'w-16 h-16' : 'w-12 h-12'}`} />}
                  {generateThumbnail(work).icon === 'Clock' && <Clock className={`text-primary/60 relative z-0 ${viewMode === 'grid' ? 'w-16 h-16' : 'w-12 h-12'}`} />}
                  {generateThumbnail(work).icon === 'Folder' && <Folder className={`text-primary/60 relative z-0 ${viewMode === 'grid' ? 'w-16 h-16' : 'w-12 h-12'}`} />}
                  {generateThumbnail(work).icon === 'Tag' && <Tag className={`text-primary/60 relative z-0 ${viewMode === 'grid' ? 'w-16 h-16' : 'w-12 h-12'}`} />}
                </div>

                {/* Info */}
                <div className="p-5 flex-1 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="truncate mb-2">{work.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(work.lastModified).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-muted-foreground/50">•</span>
                      <span>{work.nodes} 个节点</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge 
                        variant="outline" 
                        className="rounded-lg text-xs border-primary/30 bg-primary/5 text-primary dark:bg-primary/10 dark:border-primary/40"
                      >
                        {work.category}
                      </Badge>
                      {(work.tags || []).slice(0, 2).map((tag) => (
                        <Badge 
                          key={tag} 
                          variant="outline" 
                          className="rounded-lg text-xs border-secondary/30 bg-secondary/5 text-secondary dark:bg-secondary/10 dark:border-secondary/40"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {(work.tags || []).length > 2 && (
                        <Badge 
                          variant="outline" 
                          className="rounded-lg text-xs border-muted bg-muted/50 text-muted-foreground"
                        >
                          +{(work.tags || []).length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={work.isReadonly}
                        className="opacity-0 group-hover:opacity-100 transition-opacity rounded-lg h-8 w-8 p-0 flex-shrink-0 ${work.isReadonly ? 'opacity-50 cursor-not-allowed' : ''}"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                      {showTrash ? (
                        // 废纸篓中的操作
                        <>
                          <DropdownMenuItem
                            onClick={(e) => handleRestoreWork(work.id, e)}
                            className="rounded-lg"
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            恢复
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => handlePermanentDelete(work.id, e)}
                            className="text-destructive focus:text-destructive rounded-lg"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            永久删除
                          </DropdownMenuItem>
                        </>
                      ) : (
                        // 常规操作
                        <>
                          {!work.isReadonly && (
                            <>
                              <DropdownMenuItem
                                onClick={(e) => openRenameDialog(work, e)}
                                className="rounded-lg"
                              >
                                <FileEdit className="w-4 h-4 mr-2" />
                                重命名
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => handleCopyWork(work.id, e)}
                                className="rounded-lg"
                              >
                                <FileText className="w-4 h-4 mr-2" />
                                复制
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => openTagDialog(work, e)}
                                className="rounded-lg"
                              >
                                <Tag className="w-4 h-4 mr-2" />
                                管理标签
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()} className="rounded-lg">
                            <Download className="w-4 h-4 mr-2" />
                            导出
                          </DropdownMenuItem>
                          {!work.isReadonly && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteWork(work.id);
                              }}
                              className="text-destructive focus:text-destructive rounded-lg"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              删除
                            </DropdownMenuItem>
                          )}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {filteredWorks.length > 0 && (
        <div className="flex items-center justify-between mt-8 p-4 bg-card rounded-2xl border border-primary/20">
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              显示 {Math.max(1, (currentPage - 1) * pageSize + 1)} - {Math.min(currentPage * pageSize, totalWorks)} 项，共 {totalWorks} 项
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm">每页显示：</span>
              <Select value={pageSize.toString()} onValueChange={(value) => {
                setPageSize(Number(value));
                setCurrentPage(1);
              }}>
                <SelectTrigger className="w-[100px] rounded-xl border-primary/20">
                  <SelectValue placeholder="每页显示" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="rounded-lg"
            >
              上一页
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.ceil(totalWorks / pageSize) }, (_, i) => i + 1)
                .filter(page => {
                  // 只显示当前页附近的页码
                  return page === 1 || page === Math.ceil(totalWorks / pageSize) || 
                         (page >= currentPage - 2 && page <= currentPage + 2);
                })
                .map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="rounded-lg min-w-[32px] h-8"
                  >
                    {page}
                  </Button>
                ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(Math.ceil(totalWorks / pageSize), currentPage + 1))}
              disabled={currentPage === Math.ceil(totalWorks / pageSize)}
              className="rounded-lg"
            >
              下一页
            </Button>
          </div>
        </div>
      )}

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>重命名思维导图</DialogTitle>
            <DialogDescription>
              输入新的思维导图名称。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">标题</Label>
              <Input
                id="title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="输入思维导图标题"
                className="rounded-xl"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRename();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setRenameDialogOpen(false)}
              className="rounded-xl"
            >
              取消
            </Button>
            <Button 
              onClick={handleRename}
              className="rounded-xl bg-gradient-to-br from-primary to-secondary"
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tag Management Dialog */}
      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>管理标签</DialogTitle>
            <DialogDescription>
              为该思维导图添加或移除标签。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tag">新增标签</Label>
              <div className="flex gap-3">
                <Input
                  id="tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="输入标签名称"
                  className="rounded-xl"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddTag();
                    }
                  }}
                />
                <Button 
                  onClick={handleAddTag}
                  className="rounded-xl"
                  disabled={!newTag.trim()}
                >
                  添加
                </Button>
              </div>
            </div>
            {selectedWork?.tags && selectedWork.tags.length > 0 && (
              <div className="space-y-2">
                <Label>当前标签</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedWork.tags.map((tag) => (
                    <Badge 
                      key={tag} 
                      variant="outline"
                      className="rounded-lg text-xs border-primary/30 bg-primary/5 cursor-pointer hover:bg-destructive/10 hover:border-destructive hover:text-destructive transition-colors"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag}
                      <span className="ml-1">×</span>
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">点击标签即可移除</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              onClick={() => {
                setTagDialogOpen(false);
                setSelectedWork(null);
                setNewTag('');
              }}
              className="rounded-xl bg-gradient-to-br from-primary to-secondary"
            >
              完成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Layout Selection Dialog */}
      <LayoutSelectionDialog
        isOpen={showLayoutDialog}
        onClose={() => setShowLayoutDialog(false)}
        onSelect={handleLayoutSelect}
      />
    </div>
  );
}