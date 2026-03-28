import { useState } from 'react';
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
  const [pageSize, setPageSize] = useState(12); // 默认12，是3的倍数，适合一行显示4个素材

  // 从素材服务获取数据
  const allAssets = assetService.getAllAssets();
  const iconAssets = assetService.getAssetsByType('icon');
  const shapeAssets = assetService.getAssetsByType('shape');
  const connectorAssets = assetService.getAssetsByType('connector');
  const iconSetAssets = assetService.getAssetsByType('iconSet');
  const fontStyleAssets = assetService.getAssetsByType('fontStyle');
  const colorSchemeAssets = assetService.getAssetsByType('colorScheme');
  const backgroundAssets = assetService.getAssetsByType('background');
  const animationAssets = assetService.getAssetsByType('animation');
  const tags = assetService.getAllTags();

  // 获取收藏的素材 ID 列表
  const favoriteAssetIds = favoriteAssets.map(asset => asset.id);

  // 筛选后的收藏素材
  const filteredFavoriteAssets = favoriteAssets.filter(asset => {
    if (favoriteFilterType === 'all') return true;
    return asset.type === favoriteFilterType;
  });

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

  // 筛选后的素材
  const filteredAssets = allAssets.filter(asset => {
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
  });
  
  // 分页计算
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedAssets = filteredAssets.slice(startIndex, endIndex);
  
  // 其他类型的素材也需要分页
  const paginatedIconAssets = iconAssets.slice(startIndex, endIndex);
  const paginatedShapeAssets = shapeAssets.slice(startIndex, endIndex);
  const paginatedConnectorAssets = connectorAssets.slice(startIndex, endIndex);
  const paginatedIconSetAssets = iconSetAssets.slice(startIndex, endIndex);
  const paginatedFontStyleAssets = fontStyleAssets.slice(startIndex, endIndex);
  const paginatedColorSchemeAssets = colorSchemeAssets.slice(startIndex, endIndex);
  const paginatedBackgroundAssets = backgroundAssets.slice(startIndex, endIndex);
  const paginatedAnimationAssets = animationAssets.slice(startIndex, endIndex);
  const paginatedFavoriteAssets = filteredFavoriteAssets.slice(startIndex, endIndex);
  
  // 总素材数（直接使用计算值，不设置状态）
  const totalAssetsCount = filteredAssets.length;

  // 处理收藏
  const handleToggleFavorite = (asset: Asset) => {
    setFavoriteAssets(prev => {
      let newFavorites;
      const index = prev.findIndex(a => a.id === asset.id);
      if (index !== -1) {
        // 取消收藏
        newFavorites = prev.filter(a => a.id !== asset.id);
      } else {
        // 添加收藏
        newFavorites = [...prev, asset];
      }
      // 保存到 localStorage
      assetService.saveFavoriteAssets(newFavorites);
      return newFavorites;
    });
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
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
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
        
        {/* 分页 */}
        {filteredAssets.length > 0 && (
          <div className="flex items-center justify-between mt-8 p-4 bg-card rounded-2xl border border-primary/20">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                显示 {Math.max(1, (currentPage - 1) * pageSize + 1)} - {Math.min(currentPage * pageSize, totalAssetsCount)} 项，共 {totalAssetsCount} 项
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
                {Array.from({ length: Math.ceil(totalAssetsCount / pageSize) }, (_, i) => i + 1)
                  .filter(page => {
                    // 只显示当前页附近的页码
                    return page === 1 || page === Math.ceil(totalAssetsCount / pageSize) || 
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
                onClick={() => setCurrentPage(Math.min(Math.ceil(totalAssetsCount / pageSize), currentPage + 1))}
                disabled={currentPage === Math.ceil(totalAssetsCount / pageSize)}
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
