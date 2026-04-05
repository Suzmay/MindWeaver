import { useState, useEffect } from 'react';
import { Search, Upload, Filter, Globe } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import AssetPreview from './assets/AssetPreview';
import IconifySearch from './iconify/IconifySearch';
import { assetService, Asset } from '../services/assets/AssetService';
import { iconifyService } from '../services/iconify/IconifyService';

export function AssetsPage() {

  // 状态管理
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [favoriteAssets, setFavoriteAssets] = useState<Asset[]>(() => {
    // 从 localStorage 加载收藏的素材
    return assetService.loadFavoriteAssets();
  });
  const [favoriteFilterType, setFavoriteFilterType] = useState<string>('all'); // 收藏页面的类型筛选
  const [activeTab, setActiveTab] = useState('all'); // 当前活动标签
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    // 从 localStorage 读取保存的 pageSize，默认12
    const savedPageSize = localStorage.getItem('assetsPageSize');
    return savedPageSize ? Number(savedPageSize) : 12;
  }); // 默认12，是3的倍数，适合一行显示4个素材

  // 系统字体相关状态
  const [allAssetsWithSystemFonts, setAllAssetsWithSystemFonts] = useState<Asset[]>([]);
  const [fontStyleAssetsWithSystemFonts, setFontStyleAssetsWithSystemFonts] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 从素材服务获取数据（同步版本，不包含系统字体）
  const allAssets = assetService.getAllAssets();
  const iconAssets = assetService.getAssetsByType('icon');
  const shapeAssets = assetService.getAssetsByType('shape');
  const connectorAssets = assetService.getAssetsByType('connector');
  const iconSetAssets = assetService.getAssetsByType('iconSet');
  const colorSchemeAssets = assetService.getAssetsByType('colorScheme');
  const backgroundAssets = assetService.getAssetsByType('background');
  const animationAssets = assetService.getAssetsByType('animation');
  const tags = assetService.getAllTags();

  // 加载系统字体
  useEffect(() => {
    const loadSystemFonts = async () => {
      setIsLoading(true);
      try {
        // 获取包含系统字体的所有素材
        const assets = await assetService.getAllAssetsWithSystemFonts();
        setAllAssetsWithSystemFonts(assets);
        
        // 获取包含系统字体的字体样式素材
        const fontAssets = await assetService.getAssetsByTypeWithSystemFonts('fontStyle');
        setFontStyleAssetsWithSystemFonts(fontAssets);
      } catch (error) {
        console.error('Failed to load system fonts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSystemFonts();
  }, []);

  // 获取收藏的素材 ID 列表
  const favoriteAssetIds = favoriteAssets.map(asset => asset.id);

  // 筛选后的收藏素材
  const filteredFavoriteAssets = favoriteAssets.filter(asset => {
    // 类型筛选
    if (favoriteFilterType !== 'all' && asset.type !== favoriteFilterType) {
      return false;
    }
    // 搜索筛选
    if (searchKeyword) {
      const lowerKeyword = searchKeyword.toLowerCase();
      return (
        asset.name.toLowerCase().includes(lowerKeyword) ||
        asset.tags.some(tag => tag.toLowerCase().includes(lowerKeyword)) ||
        asset.category.toLowerCase().includes(lowerKeyword)
      );
    }
    return true;
  });
  
  // 收藏素材分页计算
  const favoriteStartIndex = (currentPage - 1) * pageSize;
  const favoriteEndIndex = favoriteStartIndex + pageSize;
  const paginatedFavoriteAssets = filteredFavoriteAssets.slice(favoriteStartIndex, favoriteEndIndex);
  const totalFavoriteCount = filteredFavoriteAssets.length;

  // 获取收藏中各类型数量
  const favoriteTypeCounts = {
    all: favoriteAssets.length,
    icon: favoriteAssets.filter(a => a.type === 'icon').length,
    shape: favoriteAssets.filter(a => a.type === 'shape').length,
    connector: favoriteAssets.filter(a => a.type === 'connector').length,
    iconSet: favoriteAssets.filter(a => a.type === 'iconSet').length,
    fontStyle: favoriteAssets.filter(a => a.type === 'fontStyle').length,
    colorScheme: favoriteAssets.filter(a => a.type === 'colorScheme').length,
    background: favoriteAssets.filter(a => a.type === 'background').length,
    animation: favoriteAssets.filter(a => a.type === 'animation').length,
  };

  // 筛选后的素材（包含系统字体）
  const filteredAssets = (activeTab === 'fontStyles' ? allAssetsWithSystemFonts : allAssets).filter(asset => {
    // 类型筛选
    if (filterType !== 'all' && asset.type !== filterType) {
      return false;
    }
    // 标签筛选
    if (filterTag && !asset.tags.includes(filterTag)) {
      return false;
    }
    // 搜索筛选
    if (searchKeyword) {
      const lowerKeyword = searchKeyword.toLowerCase();
      return (
        asset.name.toLowerCase().includes(lowerKeyword) ||
        asset.tags.some(tag => tag.toLowerCase().includes(lowerKeyword)) ||
        asset.category.toLowerCase().includes(lowerKeyword)
      );
    }
    return true;
  }).sort((a, b) => {
    // 收藏的素材永远在前面
    const aIsFavorite = favoriteAssetIds.includes(a.id);
    const bIsFavorite = favoriteAssetIds.includes(b.id);
    if (aIsFavorite && !bIsFavorite) return -1;
    if (!aIsFavorite && bIsFavorite) return 1;
    return 0; // 收藏状态相同时，保持原有顺序
  });
  
  // 分页计算
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedAssets = filteredAssets.slice(startIndex, endIndex);
  
  // 对各类型素材先搜索筛选，再按收藏状态排序，确保收藏的在前面
  const filteredAndSortedIconAssets = [...iconAssets].filter(asset => {
    if (searchKeyword) {
      const lowerKeyword = searchKeyword.toLowerCase();
      return (
        asset.name.toLowerCase().includes(lowerKeyword) ||
        asset.tags.some(tag => tag.toLowerCase().includes(lowerKeyword)) ||
        asset.category.toLowerCase().includes(lowerKeyword)
      );
    }
    return true;
  }).sort((a, b) => {
    const aIsFavorite = favoriteAssetIds.includes(a.id);
    const bIsFavorite = favoriteAssetIds.includes(b.id);
    if (aIsFavorite && !bIsFavorite) return -1;
    if (!aIsFavorite && bIsFavorite) return 1;
    return 0;
  });
  
  const filteredAndSortedShapeAssets = [...shapeAssets].filter(asset => {
    if (searchKeyword) {
      const lowerKeyword = searchKeyword.toLowerCase();
      return (
        asset.name.toLowerCase().includes(lowerKeyword) ||
        asset.tags.some(tag => tag.toLowerCase().includes(lowerKeyword)) ||
        asset.category.toLowerCase().includes(lowerKeyword)
      );
    }
    return true;
  }).sort((a, b) => {
    const aIsFavorite = favoriteAssetIds.includes(a.id);
    const bIsFavorite = favoriteAssetIds.includes(b.id);
    if (aIsFavorite && !bIsFavorite) return -1;
    if (!aIsFavorite && bIsFavorite) return 1;
    return 0;
  });
  
  const filteredAndSortedConnectorAssets = [...connectorAssets].filter(asset => {
    if (searchKeyword) {
      const lowerKeyword = searchKeyword.toLowerCase();
      return (
        asset.name.toLowerCase().includes(lowerKeyword) ||
        asset.tags.some(tag => tag.toLowerCase().includes(lowerKeyword)) ||
        asset.category.toLowerCase().includes(lowerKeyword)
      );
    }
    return true;
  }).sort((a, b) => {
    const aIsFavorite = favoriteAssetIds.includes(a.id);
    const bIsFavorite = favoriteAssetIds.includes(b.id);
    if (aIsFavorite && !bIsFavorite) return -1;
    if (!aIsFavorite && bIsFavorite) return 1;
    return 0;
  });
  
  const filteredAndSortedIconSetAssets = [...iconSetAssets].filter(asset => {
    if (searchKeyword) {
      const lowerKeyword = searchKeyword.toLowerCase();
      return (
        asset.name.toLowerCase().includes(lowerKeyword) ||
        asset.tags.some(tag => tag.toLowerCase().includes(lowerKeyword)) ||
        asset.category.toLowerCase().includes(lowerKeyword)
      );
    }
    return true;
  }).sort((a, b) => {
    const aIsFavorite = favoriteAssetIds.includes(a.id);
    const bIsFavorite = favoriteAssetIds.includes(b.id);
    if (aIsFavorite && !bIsFavorite) return -1;
    if (!aIsFavorite && bIsFavorite) return 1;
    return 0;
  });
  
  const filteredAndSortedFontStyleAssets = [...fontStyleAssetsWithSystemFonts].filter(asset => {
    if (searchKeyword) {
      const lowerKeyword = searchKeyword.toLowerCase();
      return (
        asset.name.toLowerCase().includes(lowerKeyword) ||
        asset.tags.some(tag => tag.toLowerCase().includes(lowerKeyword)) ||
        asset.category.toLowerCase().includes(lowerKeyword)
      );
    }
    return true;
  }).sort((a, b) => {
    const aIsFavorite = favoriteAssetIds.includes(a.id);
    const bIsFavorite = favoriteAssetIds.includes(b.id);
    if (aIsFavorite && !bIsFavorite) return -1;
    if (!aIsFavorite && bIsFavorite) return 1;
    return 0;
  });
  
  const filteredAndSortedColorSchemeAssets = [...colorSchemeAssets].filter(asset => {
    if (searchKeyword) {
      const lowerKeyword = searchKeyword.toLowerCase();
      return (
        asset.name.toLowerCase().includes(lowerKeyword) ||
        asset.tags.some(tag => tag.toLowerCase().includes(lowerKeyword)) ||
        asset.category.toLowerCase().includes(lowerKeyword)
      );
    }
    return true;
  }).sort((a, b) => {
    const aIsFavorite = favoriteAssetIds.includes(a.id);
    const bIsFavorite = favoriteAssetIds.includes(b.id);
    if (aIsFavorite && !bIsFavorite) return -1;
    if (!aIsFavorite && bIsFavorite) return 1;
    return 0;
  });
  
  const filteredAndSortedBackgroundAssets = [...backgroundAssets].filter(asset => {
    if (searchKeyword) {
      const lowerKeyword = searchKeyword.toLowerCase();
      return (
        asset.name.toLowerCase().includes(lowerKeyword) ||
        asset.tags.some(tag => tag.toLowerCase().includes(lowerKeyword)) ||
        asset.category.toLowerCase().includes(lowerKeyword)
      );
    }
    return true;
  }).sort((a, b) => {
    const aIsFavorite = favoriteAssetIds.includes(a.id);
    const bIsFavorite = favoriteAssetIds.includes(b.id);
    if (aIsFavorite && !bIsFavorite) return -1;
    if (!aIsFavorite && bIsFavorite) return 1;
    return 0;
  });
  
  const filteredAndSortedAnimationAssets = [...animationAssets].filter(asset => {
    if (searchKeyword) {
      const lowerKeyword = searchKeyword.toLowerCase();
      return (
        asset.name.toLowerCase().includes(lowerKeyword) ||
        asset.tags.some(tag => tag.toLowerCase().includes(lowerKeyword)) ||
        asset.category.toLowerCase().includes(lowerKeyword)
      );
    }
    return true;
  }).sort((a, b) => {
    const aIsFavorite = favoriteAssetIds.includes(a.id);
    const bIsFavorite = favoriteAssetIds.includes(b.id);
    if (aIsFavorite && !bIsFavorite) return -1;
    if (!aIsFavorite && bIsFavorite) return 1;
    return 0;
  });

  // 其他类型的素材也需要分页
  const paginatedIconAssets = filteredAndSortedIconAssets.slice(startIndex, endIndex);
  const paginatedShapeAssets = filteredAndSortedShapeAssets.slice(startIndex, endIndex);
  const paginatedConnectorAssets = filteredAndSortedConnectorAssets.slice(startIndex, endIndex);
  const paginatedIconSetAssets = filteredAndSortedIconSetAssets.slice(startIndex, endIndex);
  const paginatedFontStyleAssets = filteredAndSortedFontStyleAssets.slice(startIndex, endIndex);
  const paginatedColorSchemeAssets = filteredAndSortedColorSchemeAssets.slice(startIndex, endIndex);
  const paginatedBackgroundAssets = filteredAndSortedBackgroundAssets.slice(startIndex, endIndex);
  const paginatedAnimationAssets = filteredAndSortedAnimationAssets.slice(startIndex, endIndex);
  // 注意：paginatedFavoriteAssets 已经在上面定义了
   
  // 各个标签页的素材总数
  const tabTotalCounts: Record<string, number> = {
    'all': filteredAssets.length,
    'icons': filteredAndSortedIconAssets.length,
    'shapes': filteredAndSortedShapeAssets.length,
    'connectors': filteredAndSortedConnectorAssets.length,
    'iconSets': filteredAndSortedIconSetAssets.length,
    'fontStyles': filteredAndSortedFontStyleAssets.length,
    'colorSchemes': filteredAndSortedColorSchemeAssets.length,
    'backgrounds': filteredAndSortedBackgroundAssets.length,
    'animations': filteredAndSortedAnimationAssets.length,
  };
  
  // 获取当前标签页的总数
  const getCurrentTabTotalCount = () => {
    return tabTotalCounts[activeTab] || filteredAssets.length;
  };

  // 生成唯一的素材ID，处理命名冲突
  const generateUniqueId = (baseId: string, existingIds: string[]): string => {
    if (!existingIds.includes(baseId)) {
      return baseId;
    }
    // 如果ID已存在，添加数字后缀
    let counter = 1;
    let newId = `${baseId}-${counter}`;
    while (existingIds.includes(newId)) {
      counter++;
      newId = `${baseId}-${counter}`;
    }
    return newId;
  };

  // 处理收藏
  const handleToggleFavorite = async (asset: Asset) => {
    setFavoriteAssets(prev => {
      let newFavorites;
      const index = prev.findIndex(a => a.id === asset.id);
      if (index !== -1) {
        // 取消收藏
        newFavorites = prev.filter(a => a.id !== asset.id);
      } else {
        // 添加收藏，处理ID冲突
        const existingIds = prev.map(a => a.id);
        const uniqueId = generateUniqueId(asset.id, existingIds);
        let assetWithUniqueId = uniqueId === asset.id 
          ? asset 
          : { ...asset, id: uniqueId };
        
        // 如果是 iconify 图标，需要获取 SVG 内容
        if (asset.type === 'icon' && asset.data?.iconifyName && !asset.data?.svg) {
          // 异步获取 SVG 并更新
          fetchIconifySvg(asset.data.iconifyName).then(svg => {
            if (svg) {
              setFavoriteAssets(current => {
                const updatedIndex = current.findIndex(a => a.id === uniqueId);
                if (updatedIndex !== -1) {
                  const updated = [...current];
                  updated[updatedIndex] = {
                    ...updated[updatedIndex],
                    data: { ...updated[updatedIndex].data, svg }
                  };
                  assetService.saveFavoriteAssets(updated);
                  return updated;
                }
                return current;
              });
            }
          });
        }
        
        newFavorites = [...prev, assetWithUniqueId];
      }
      // 保存到 localStorage
      assetService.saveFavoriteAssets(newFavorites);
      return newFavorites;
    });
  };
  
  // 获取 Iconify 图标的 SVG
  const fetchIconifySvg = async (iconifyName: string): Promise<string | null> => {
    try {
      const iconData = await iconifyService.getIcon(iconifyName);
      if (iconData) {
        return iconifyService.generateSvg(iconData);
      }
    } catch (error) {
      console.error('Failed to fetch iconify svg:', error);
    }
    return null;
  };

  // 移除游客模式限制，允许游客访问素材中心

  return (
    <div className="p-8 space-y-6">
      {/* 页面头部 */}
      <div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1>素材中心</h1>
            <p className="text-muted-foreground mt-1">
              浏览和使用丰富的思维导图素材
            </p>
          </div>
          <div className="flex gap-2">
            <Button className="rounded-2xl gap-2 bg-gradient-to-br from-primary to-secondary hover:opacity-90 shadow-ocean font-semibold">
              <Upload className="w-5 h-5" />
              上传素材
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  className="rounded-2xl gap-2 bg-gradient-to-br from-primary to-secondary hover:opacity-90 shadow-ocean font-semibold"
                  disabled={activeTab === 'iconify'}
                >
                  <Filter className="w-5 h-5" />
                  筛选标签
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="rounded-xl">
                <DropdownMenuItem 
                  key="all" 
                  onClick={() => { setFilterTag(null); setFilterType('all'); }}
                  className={`rounded-lg ${!filterTag ? 'bg-accent dark:bg-accent/30' : ''}`}
                  disabled={activeTab === 'iconify'}
                >
                  全部
                </DropdownMenuItem>
                {tags.map((tag) => (
                  <DropdownMenuItem 
                    key={tag} 
                    onClick={() => { setFilterTag(tag); setFilterType('all'); }}
                    className={`rounded-lg ${filterTag === tag ? 'bg-accent dark:bg-accent/30' : ''}`}
                    disabled={activeTab === 'iconify'}
                  >
                    {tag}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* 搜索框 */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute left-3 top-0 bottom-0 flex items-center">
              <Search className="w-5 h-5 text-muted-foreground" />
            </div>
            <Input 
              placeholder={activeTab === 'iconify' ? '搜索 Iconify 图标 (例如: arrow, home, user...)' : '搜索素材...'} 
              className="pl-10 rounded-xl border-primary/20 focus:border-primary"
              value={searchKeyword}
              onChange={(e) => {
                setSearchKeyword(e.target.value);
                // 本地素材搜索需要重置页码
                if (activeTab !== 'iconify') {
                  setCurrentPage(1);
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div>
        <Tabs defaultValue="all" value={activeTab} onValueChange={(newTab) => {
        setActiveTab(newTab);
        setCurrentPage(1);
      }} className="w-full">
          <div className="flex justify-center">
            <TabsList className="mb-4">
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="icons">图标</TabsTrigger>
            <TabsTrigger value="shapes">形状</TabsTrigger>
            <TabsTrigger value="connectors">连接线</TabsTrigger>
            <TabsTrigger value="iconSets">图标组合</TabsTrigger>
            <TabsTrigger value="fontStyles">字体样式</TabsTrigger>
            <TabsTrigger value="colorSchemes">配色方案</TabsTrigger>
            <TabsTrigger value="backgrounds">导图背景</TabsTrigger>
            <TabsTrigger value="animations">动画效果</TabsTrigger>
            <TabsTrigger value="iconify" className="gap-1">
              <Globe className="w-4 h-4" />
              Iconify
            </TabsTrigger>
            <TabsTrigger value="favorites">收藏</TabsTrigger>
          </TabsList>
          </div>
          
          <TabsContent value="all" className="mt-0">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {paginatedAssets.map((asset) => (
                <AssetPreview 
                  key={asset.id} 
                  asset={asset} 
                  isFavorite={favoriteAssetIds.includes(asset.id)}
                  onToggleFavorite={() => handleToggleFavorite(asset)}
                />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="icons" className="mt-0">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {paginatedIconAssets.map((asset) => (
                <AssetPreview 
                  key={asset.id} 
                  asset={asset} 
                  isFavorite={favoriteAssetIds.includes(asset.id)}
                  onToggleFavorite={() => handleToggleFavorite(asset)}
                />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="shapes" className="mt-0">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {paginatedShapeAssets.map((asset) => (
                <AssetPreview 
                  key={asset.id} 
                  asset={asset} 
                  isFavorite={favoriteAssetIds.includes(asset.id)}
                  onToggleFavorite={() => handleToggleFavorite(asset)}
                />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="connectors" className="mt-0">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {paginatedConnectorAssets.map((asset) => (
                <AssetPreview 
                  key={asset.id} 
                  asset={asset} 
                  isFavorite={favoriteAssetIds.includes(asset.id)}
                  onToggleFavorite={() => handleToggleFavorite(asset)}
                />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="iconSets" className="mt-0">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {paginatedIconSetAssets.map((asset) => (
                <AssetPreview 
                  key={asset.id} 
                  asset={asset} 
                  isFavorite={favoriteAssetIds.includes(asset.id)}
                  onToggleFavorite={() => handleToggleFavorite(asset)}
                />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="fontStyles" className="mt-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="text-muted-foreground">正在加载系统字体...</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {paginatedFontStyleAssets.map((asset) => (
                  <AssetPreview 
                    key={asset.id} 
                    asset={asset} 
                    isFavorite={favoriteAssetIds.includes(asset.id)}
                    onToggleFavorite={() => handleToggleFavorite(asset)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="colorSchemes" className="mt-0">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {paginatedColorSchemeAssets.map((asset) => (
                <AssetPreview 
                  key={asset.id} 
                  asset={asset} 
                  isFavorite={favoriteAssetIds.includes(asset.id)}
                  onToggleFavorite={() => handleToggleFavorite(asset)}
                />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="backgrounds" className="mt-0">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {paginatedBackgroundAssets.map((asset) => (
                <AssetPreview 
                  key={asset.id} 
                  asset={asset} 
                  isFavorite={favoriteAssetIds.includes(asset.id)}
                  onToggleFavorite={() => handleToggleFavorite(asset)}
                />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="animations" className="mt-0">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {paginatedAnimationAssets.map((asset) => (
                <AssetPreview 
                  key={asset.id} 
                  asset={asset} 
                  isFavorite={favoriteAssetIds.includes(asset.id)}
                  onToggleFavorite={() => handleToggleFavorite(asset)}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="iconify" className="mt-0">
            <IconifySearch
              searchKeyword={searchKeyword}
              onToggleFavorite={handleToggleFavorite}
              favoriteIds={favoriteAssetIds}
            />
          </TabsContent>
          
          <TabsContent value="favorites" className="mt-0">
            {/* 收藏类型筛选 */}
            {favoriteAssets.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge
                  variant="outline"
                  className={`cursor-pointer rounded-lg bg-input-background ${favoriteFilterType === 'all' ? 'border-primary text-primary font-semibold' : ''}`}
                  onClick={() => setFavoriteFilterType('all')}
                >
                  全部 ({favoriteTypeCounts.all})
                </Badge>
                {favoriteTypeCounts.icon > 0 && (
                  <Badge
                    variant="outline"
                    className={`cursor-pointer rounded-lg bg-input-background ${favoriteFilterType === 'icon' ? 'border-primary text-primary font-semibold' : ''}`}
                    onClick={() => setFavoriteFilterType('icon')}
                  >
                    图标 ({favoriteTypeCounts.icon})
                  </Badge>
                )}
                {favoriteTypeCounts.shape > 0 && (
                  <Badge
                    variant="outline"
                    className={`cursor-pointer rounded-lg bg-input-background ${favoriteFilterType === 'shape' ? 'border-primary text-primary font-semibold' : ''}`}
                    onClick={() => setFavoriteFilterType('shape')}
                  >
                    形状 ({favoriteTypeCounts.shape})
                  </Badge>
                )}
                {favoriteTypeCounts.connector > 0 && (
                  <Badge
                    variant="outline"
                    className={`cursor-pointer rounded-lg bg-input-background ${favoriteFilterType === 'connector' ? 'border-primary text-primary font-semibold' : ''}`}
                    onClick={() => setFavoriteFilterType('connector')}
                  >
                    连接线 ({favoriteTypeCounts.connector})
                  </Badge>
                )}
                {favoriteTypeCounts.iconSet > 0 && (
                  <Badge
                    variant="outline"
                    className={`cursor-pointer rounded-lg bg-input-background ${favoriteFilterType === 'iconSet' ? 'border-primary text-primary font-semibold' : ''}`}
                    onClick={() => setFavoriteFilterType('iconSet')}
                  >
                    图标组合 ({favoriteTypeCounts.iconSet})
                  </Badge>
                )}
                {favoriteTypeCounts.fontStyle > 0 && (
                  <Badge
                    variant="outline"
                    className={`cursor-pointer rounded-lg bg-input-background ${favoriteFilterType === 'fontStyle' ? 'border-primary text-primary font-semibold' : ''}`}
                    onClick={() => setFavoriteFilterType('fontStyle')}
                  >
                    字体样式 ({favoriteTypeCounts.fontStyle})
                  </Badge>
                )}
                {favoriteTypeCounts.colorScheme > 0 && (
                  <Badge
                    variant="outline"
                    className={`cursor-pointer rounded-lg bg-input-background ${favoriteFilterType === 'colorScheme' ? 'border-primary text-primary font-semibold' : ''}`}
                    onClick={() => setFavoriteFilterType('colorScheme')}
                  >
                    配色方案 ({favoriteTypeCounts.colorScheme})
                  </Badge>
                )}
                {favoriteTypeCounts.background > 0 && (
                  <Badge
                    variant="outline"
                    className={`cursor-pointer rounded-lg bg-input-background ${favoriteFilterType === 'background' ? 'border-primary text-primary font-semibold' : ''}`}
                    onClick={() => setFavoriteFilterType('background')}
                  >
                    导图背景 ({favoriteTypeCounts.background})
                  </Badge>
                )}
                {favoriteTypeCounts.animation > 0 && (
                  <Badge
                    variant="outline"
                    className={`cursor-pointer rounded-lg bg-input-background ${favoriteFilterType === 'animation' ? 'border-primary text-primary font-semibold' : ''}`}
                    onClick={() => setFavoriteFilterType('animation')}
                  >
                    动画效果 ({favoriteTypeCounts.animation})
                  </Badge>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {paginatedFavoriteAssets.map((asset) => (
                <AssetPreview 
                  key={asset.id} 
                  asset={asset} 
                  isFavorite={true}
                  onToggleFavorite={() => handleToggleFavorite(asset)}
                />
              ))}
            </div>
            {favoriteAssets.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                暂无收藏素材，去浏览并收藏一些吧！
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        {/* 分页 - 只在非收藏标签页显示 */}
        {activeTab !== 'favorites' && activeTab !== 'iconify' && getCurrentTabTotalCount() > 0 && (
          <div className="flex items-center justify-between mt-8 p-4 bg-card rounded-2xl border border-primary/20">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                显示 {Math.max(1, (currentPage - 1) * pageSize + 1)} - {Math.min(currentPage * pageSize, getCurrentTabTotalCount())} 项，共 {getCurrentTabTotalCount()} 项
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm">每页显示：</span>
                <Select value={pageSize.toString()} onValueChange={(value) => {
                  const newPageSize = Number(value);
                  setPageSize(newPageSize);
                  setCurrentPage(1);
                  // 保存到 localStorage
                  localStorage.setItem('assetsPageSize', newPageSize.toString());
                }}>
                  <SelectTrigger className="w-[100px] rounded-xl border-primary/20">
                    <SelectValue placeholder="每页显示" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="8">8</SelectItem>
                    <SelectItem value="12">12</SelectItem>
                    <SelectItem value="16">16</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="24">24</SelectItem>
                    <SelectItem value="28">28</SelectItem>
                    <SelectItem value="32">32</SelectItem>
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
                {Array.from({ length: Math.ceil(getCurrentTabTotalCount() / pageSize) }, (_, i) => i + 1)
                  .filter(page => {
                    // 只显示当前页附近的页码
                    return page === 1 || page === Math.ceil(getCurrentTabTotalCount() / pageSize) || 
                           (page >= currentPage - 2 && page <= currentPage + 2);
                  })
                  .map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="rounded-lg"
                    >
                      {page}
                    </Button>
                  ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(Math.ceil(getCurrentTabTotalCount() / pageSize), currentPage + 1))}
                disabled={currentPage === Math.ceil(getCurrentTabTotalCount() / pageSize)}
                className="rounded-lg"
              >
                下一页
              </Button>
            </div>
          </div>
        )}
        
        {/* 收藏标签页的分页 */}
        {activeTab === 'favorites' && totalFavoriteCount > 0 && (
          <div className="flex items-center justify-between mt-8 p-4 bg-card rounded-2xl border border-primary/20">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                显示 {Math.max(1, (currentPage - 1) * pageSize + 1)} - {Math.min(currentPage * pageSize, totalFavoriteCount)} 项，共 {totalFavoriteCount} 项
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm">每页显示：</span>
                <Select value={pageSize.toString()} onValueChange={(value) => {
                  const newPageSize = Number(value);
                  setPageSize(newPageSize);
                  setCurrentPage(1);
                  // 保存到 localStorage
                  localStorage.setItem('assetsPageSize', newPageSize.toString());
                }}>
                  <SelectTrigger className="w-[100px] rounded-xl border-primary/20">
                    <SelectValue placeholder="每页显示" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="8">8</SelectItem>
                    <SelectItem value="12">12</SelectItem>
                    <SelectItem value="16">16</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="24">24</SelectItem>
                    <SelectItem value="28">28</SelectItem>
                    <SelectItem value="32">32</SelectItem>
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
                {Array.from({ length: Math.ceil(totalFavoriteCount / pageSize) }, (_, i) => i + 1)
                  .filter(page => {
                    // 只显示当前页附近的页码
                    return page === 1 || page === Math.ceil(totalFavoriteCount / pageSize) || 
                           (page >= currentPage - 2 && page <= currentPage + 2);
                  })
                  .map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="rounded-lg"
                    >
                      {page}
                    </Button>
                  ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(Math.ceil(totalFavoriteCount / pageSize), currentPage + 1))}
                disabled={currentPage === Math.ceil(totalFavoriteCount / pageSize)}
                className="rounded-lg"
              >
                下一页
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
