import { useState, useCallback, useEffect } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';
import { Badge } from '../ui/badge';
import AssetPreview from '../assets/AssetPreview';
import { iconifyService, IconifySearchResult } from '../../services/iconify/IconifyService';
import { Asset } from '../../services/assets/AssetService';

interface IconifySearchProps {
  searchKeyword: string;
  onToggleFavorite?: (asset: Asset) => void;
  favoriteIds?: string[];
}

export default function IconifySearch({ searchKeyword, onToggleFavorite, favoriteIds = [] }: IconifySearchProps) {
  const [searchResult, setSearchResult] = useState<IconifySearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);

  // 搜索图标
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResult(null);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    console.log('Searching for:', query);
    
    try {
      const result = await iconifyService.searchIcons(query, 48);
      console.log('Search result:', result);
      setSearchResult(result);
      
      // 检查是否真的获取到了数据
      if (result.icons.length === 0) {
        console.log('No icons found for query:', query);
      }
    } catch (err) {
      console.error('Search failed:', err);
      setError('搜索失败，请检查网络连接');
    }
    
    setIsLoading(false);
    setSelectedCollection(null);
  }, []);

  // 监听 searchKeyword 变化
  useEffect(() => {
    handleSearch(searchKeyword);
  }, [searchKeyword, handleSearch]);

  // 将 Iconify 图标转换为 Asset 格式
  const convertToAsset = (iconName: string): Asset => {
    const [prefix, name] = iconName.split(':');
    const collection = searchResult?.collections?.[prefix];
    
    return {
      id: `iconify-${iconName}`,
      name: name.replace(/-/g, ' '),
      type: 'icon',
      category: collection?.name || prefix,
      tags: ['Iconify', prefix, ...(collection?.category ? [collection.category] : [])],
      thumbnail: iconifyService.getIconSvgUrl(iconName),
      uploader: collection?.author?.name || 'Iconify',
      data: {
        iconifyName: iconName,
        prefix,
        collection: collection?.name || prefix,
      },
    };
  };

  // 过滤图标
  const filteredIcons = selectedCollection
    ? searchResult?.icons.filter(icon => icon.startsWith(`${selectedCollection}:`)) || []
    : searchResult?.icons || [];

  // 获取所有集合
  const collections = searchResult?.collections
    ? Object.entries(searchResult.collections).map(([key, value]) => ({
        key,
        ...value,
      }))
    : [];

  return (
    <div className="space-y-4">
      {/* 加载状态 */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* 集合筛选 */}
      {!isLoading && collections.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Badge
            variant="outline"
            className={`cursor-pointer rounded-lg bg-input-background ${selectedCollection === null ? 'border-primary text-primary font-semibold' : ''}`}
            onClick={() => setSelectedCollection(null)}
          >
            全部 ({searchResult?.total || 0})
          </Badge>
          {collections.map((collection) => (
            <Badge
              key={collection.key}
              variant="outline"
              className={`cursor-pointer rounded-lg bg-input-background ${selectedCollection === collection.key ? 'border-primary text-primary font-semibold' : ''}`}
              onClick={() => setSelectedCollection(collection.key)}
            >
              {collection.name} ({collection.total})
            </Badge>
          ))}
        </div>
      )}

      {/* 搜索结果 */}
      {filteredIcons.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredIcons.map((iconName) => {
            const asset = convertToAsset(iconName);
            
            return (
              <AssetPreview
                key={iconName}
                asset={asset}
                isFavorite={favoriteIds.includes(asset.id)}
                onToggleFavorite={() => onToggleFavorite?.(asset)}
              />
            );
          })}
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="text-center py-8 text-red-500">
          <p>{error}</p>
          <p className="text-sm mt-2 text-muted-foreground">
            如果问题持续存在，可能是网络连接问题
          </p>
        </div>
      )}

      {/* 空状态 */}
      {searchResult && filteredIcons.length === 0 && !isLoading && !error && (
        <div className="text-center py-8 text-muted-foreground">
          未找到匹配的图标，请尝试其他关键词
        </div>
      )}

      {/* 提示信息 */}
      {!searchResult && !isLoading && (
        <div className="text-center py-8 text-muted-foreground">
          <p>输入关键词搜索 Iconify 图标库</p>
          <p className="text-sm mt-2">
            支持 200+ 图标集，超过 20 万个图标
          </p>
          <a
            href="https://iconify.design/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline mt-2"
          >
            了解更多 <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
}
