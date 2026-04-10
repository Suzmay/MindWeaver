import React, { useState, useEffect, useRef } from 'react';
import { Heart, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogPortal,
  DialogOverlay,
  DialogPrimitive,
} from '../ui/dialog';
import { Asset, assetService } from '../../services/assets/AssetService';

export type AssetType = 'icon' | 'shape' | 'connector' | 'iconSet' | 'fontStyle' | 'colorScheme' | 'background' | 'animation';

// 将 SVG 转换为 data URL
const svgToDataUrl = (svg: string): string => {
  const encoded = encodeURIComponent(svg);
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
};

interface AssetSelectorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  assetTypes: AssetType[];
  onSelectAsset: (asset: Asset | null, size: 'small' | 'large', activeTab?: string) => void;
  onPreviewAsset?: (asset: Asset | null) => void; // 预览素材（可选）
  showConfirmButton?: boolean; // 是否显示确定按钮（预览模式）
  currentAssetBackground?: Asset | null; // 当前使用的素材背景
  currentAssetColorScheme?: Asset | null; // 当前使用的素材配色方案
  currentAssetAnimation?: Asset | null; // 当前使用的素材动画
}

export const AssetSelectorDialog: React.FC<AssetSelectorDialogProps> = ({
  isOpen,
  onClose,
  title,
  assetTypes,
  onSelectAsset,
  onPreviewAsset,
  showConfirmButton = false,
  currentAssetBackground,
  currentAssetColorScheme,
  currentAssetAnimation,
}) => {
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [iconSize, setIconSize] = useState<'small' | 'large'>('small');
  const [activeTab, setActiveTab] = useState<'icons' | 'iconSets' | 'backgrounds' | 'animations' | 'colorSchemes'>('icons');
  const [selectedIconSet, setSelectedIconSet] = useState<Asset | null>(null);
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null); // 当前预览的素材
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // 加载收藏的素材并筛选指定类型
    const favorites = assetService.loadFavoriteAssets();
    const filtered = favorites.filter(asset => assetTypes.includes(asset.type));
    setFilteredAssets(filtered);
    
    // 只在对话框首次打开时设置默认标签页
    if (isOpen && !isInitializedRef.current) {
      // 设置默认标签页
      const isSpecial = assetTypes.includes('background') || assetTypes.includes('animation');
      if (isSpecial) {
        const hasBackgrounds = filtered.some(asset => asset.type === 'background');
        const hasAnimations = filtered.some(asset => asset.type === 'animation');
        if (hasBackgrounds) {
          setActiveTab('backgrounds');
        } else if (hasAnimations) {
          setActiveTab('animations');
        }
      } else {
        setActiveTab('icons');
      }
      isInitializedRef.current = true;
    }
    
    // 当对话框关闭时，重置初始化状态
    if (!isOpen) {
      isInitializedRef.current = false;
    }
  }, [isOpen, assetTypes]);

  const handleAssetClick = (asset: Asset) => {
    if (asset.type === 'iconSet') {
      // 如果是图标组合，显示组合中的图标
      setSelectedIconSet(asset);
    } else if (showConfirmButton && onPreviewAsset) {
      // 预览模式：点击预览，不直接关闭
      if (previewAsset?.id === asset.id) {
        // 再次点击取消预览
        setPreviewAsset(null);
        onPreviewAsset(null);
      } else {
        setPreviewAsset(asset);
        onPreviewAsset(asset);
      }
    } else {
      // 普通模式：直接选择并关闭
      onSelectAsset(asset, iconSize, activeTab);
      onClose();
    }
  };

  const handleIconClick = (icon: any) => {
    // 创建一个临时的图标资产
    const tempIconAsset: Asset = {
      id: `icon-${icon.name}`,
      name: icon.name,
      type: 'icon',
      category: '图标',
      tags: ['图标'],
      thumbnail: svgToDataUrl(icon.svg),
      uploader: '官方',
      data: {
        svg: icon.svg,
        lucideName: icon.name
      }
    };
    
    onSelectAsset(tempIconAsset, iconSize, activeTab);
    onClose();
  };

  const handleBackToIconSets = () => {
    setSelectedIconSet(null);
  };

  // 过滤图标和图标组合
  const icons = filteredAssets.filter(asset => asset.type === 'icon');
  const iconSets = filteredAssets.filter(asset => asset.type === 'iconSet');
  
  // 过滤背景、动画和配色方案
  const backgrounds = filteredAssets.filter(asset => asset.type === 'background');
  const animations = filteredAssets.filter(asset => asset.type === 'animation');
  const colorSchemes = filteredAssets.filter(asset => asset.type === 'colorScheme');
  
  // 判断是否为背景、动画或配色方案模式
  const isBackgroundMode = assetTypes.includes('background');
  const isAnimationMode = assetTypes.includes('animation');
  const isColorSchemeMode = assetTypes.includes('colorScheme');
  const isSpecialMode = isBackgroundMode || isAnimationMode || isColorSchemeMode;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content className="bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 flex flex-col w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg max-w-4xl max-h-[70vh] overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <div className="flex justify-between items-center">
              <DialogTitle className="flex items-center gap-2">
                {isSpecialMode ? title : '选择在素材中心收藏的图标'}
              </DialogTitle>
              {!isSpecialMode && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`px-3 py-1 rounded-lg text-sm ${iconSize === 'small' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                    onClick={() => setIconSize('small')}
                  >
                    小图标
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-1 rounded-lg text-sm ${iconSize === 'large' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                    onClick={() => setIconSize('large')}
                  >
                    大图标
                  </button>
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {isSpecialMode ? (
              // 背景和动画模式 - 使用标签页
              <>
                <div className="flex border-b flex-shrink-0">
                  {backgrounds.length > 0 && (
                    <button
                      className={`px-4 py-2 border-b-2 ${activeTab === 'backgrounds' ? 'border-primary text-primary' : 'border-transparent'}`}
                      onClick={() => {
                        setActiveTab('backgrounds');
                        // 切换标签页时取消预览，同取消按钮逻辑
                        if (previewAsset && onPreviewAsset) {
                          setPreviewAsset(null);
                          onPreviewAsset(null);
                        }
                      }}
                    >
                      导图背景
                    </button>
                  )}
                  {animations.length > 0 && (
                    <button
                      className={`px-4 py-2 border-b-2 ${activeTab === 'animations' ? 'border-primary text-primary' : 'border-transparent'}`}
                      onClick={() => {
                        setActiveTab('animations');
                        // 切换标签页时取消预览，同取消按钮逻辑
                        if (previewAsset && onPreviewAsset) {
                          setPreviewAsset(null);
                          onPreviewAsset(null);
                        }
                      }}
                    >
                      动画效果
                    </button>
                  )}
                  {colorSchemes.length > 0 && (
                    <button
                      className={`px-4 py-2 border-b-2 ${activeTab === 'colorSchemes' ? 'border-primary text-primary' : 'border-transparent'}`}
                      onClick={() => {
                        setActiveTab('colorSchemes');
                        // 切换标签页时取消预览，同取消按钮逻辑
                        if (previewAsset && onPreviewAsset) {
                          setPreviewAsset(null);
                          onPreviewAsset(null);
                        }
                      }}
                    >
                      配色方案
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto py-4">
                  {activeTab === 'backgrounds' && (
                    backgrounds.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                        <p>暂无收藏的导图背景</p>
                        <p className="text-sm mt-2">请到素材中心收藏您需要的背景</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {backgrounds.map((asset) => {
                          const isSelected = previewAsset?.id === asset.id;
                          const isCurrent = currentAssetBackground?.id === asset.id;
                          return (
                            <button
                              key={asset.id}
                              onClick={() => handleAssetClick(asset)}
                              className={`p-2 border rounded-lg hover:border-primary transition-all flex flex-col items-center bg-card ${isSelected ? 'border-primary bg-primary/5' : ''} ${isCurrent ? 'border-green-500 bg-green-50' : ''}`}
                            >
                              <img
                                src={asset.thumbnail}
                                alt={asset.name}
                                className="w-16 h-16 mb-1 object-cover rounded"
                              />
                              <span className="text-xs text-center">{asset.name}</span>
                              {isCurrent && (
                                <span className="text-xs text-green-500 mt-1">当前使用</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )
                  )}
                  
                  {activeTab === 'animations' && (
                    animations.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                        <p>暂无收藏的动画效果</p>
                        <p className="text-sm mt-2">请到素材中心收藏您需要的动画</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {animations.map((asset) => {
                          const isSelected = previewAsset?.id === asset.id;
                          const isCurrent = currentAssetAnimation?.id === asset.id;
                          return (
                            <button
                              key={asset.id}
                              onClick={() => handleAssetClick(asset)}
                              className={`p-2 border rounded-lg hover:border-primary transition-all flex flex-col items-center bg-card ${isSelected ? 'border-primary bg-primary/5' : ''} ${isCurrent ? 'border-green-500 bg-green-50' : ''}`}
                            >
                              <img
                                src={asset.thumbnail}
                                alt={asset.name}
                                className="w-16 h-16 mb-1 object-cover rounded"
                              />
                              <span className="text-xs text-center">{asset.name}</span>
                              {isCurrent && (
                                <span className="text-xs text-green-500 mt-1">当前使用</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )
                  )}
                  {activeTab === 'colorSchemes' && (
                    colorSchemes.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                        <p>暂无收藏的配色方案</p>
                        <p className="text-sm mt-2">请到素材中心收藏您需要的配色方案</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {colorSchemes.map((asset) => {
                          const isSelected = previewAsset?.id === asset.id;
                          const isCurrent = currentAssetColorScheme?.id === asset.id;
                          return (
                            <button
                              key={asset.id}
                              onClick={() => handleAssetClick(asset)}
                              className={`p-2 border rounded-lg hover:border-primary transition-all flex flex-col items-center bg-card ${isSelected ? 'border-primary bg-primary/5' : ''} ${isCurrent ? 'border-green-500 bg-green-50' : ''}`}
                            >
                              <img
                                src={asset.thumbnail}
                                alt={asset.name}
                                className="w-16 h-16 mb-1 object-cover rounded"
                              />
                              <span className="text-xs text-center">{asset.name}</span>
                              {isCurrent && (
                                <span className="text-xs text-green-500 mt-1">当前使用</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )
                  )}
                </div>
              </>
            ) : !selectedIconSet ? (
              // 主标签页：图标和图标组合
              <>
                <div className="flex border-b">
                  <button
                    className={`px-4 py-2 border-b-2 ${activeTab === 'icons' ? 'border-primary text-primary' : 'border-transparent'}`}
                    onClick={() => setActiveTab('icons')}
                  >
                    图标
                  </button>
                  {iconSets.length > 0 && (
                    <button
                      className={`px-4 py-2 border-b-2 ${activeTab === 'iconSets' ? 'border-primary text-primary' : 'border-transparent'}`}
                      onClick={() => setActiveTab('iconSets')}
                    >
                      图标组合
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto py-4">
                  {activeTab === 'icons' ? (
                    icons.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                        <p>暂无收藏的图标</p>
                        <p className="text-sm mt-2">请到素材中心收藏您需要的图标</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {icons.map((asset) => (
                          <button
                            key={asset.id}
                            onClick={() => handleAssetClick(asset)}
                            className="p-2 border rounded-lg hover:border-primary transition-all flex flex-col items-center bg-card"
                          >
                            {/* 预览图 */}
                            <img
                              src={asset.thumbnail}
                              alt={asset.name}
                              className="w-8 h-8 mb-1"
                            />

                            {/* 名称 */}
                            <span className="text-xs text-center">
                              {asset.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    )
                  ) : (
                    iconSets.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                        <p>暂无收藏的图标组合</p>
                        <p className="text-sm mt-2">请到素材中心收藏您需要的图标组合</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {iconSets.map((asset) => (
                          <button
                            key={asset.id}
                            onClick={() => handleAssetClick(asset)}
                            className="p-2 border rounded-lg hover:border-primary transition-all flex flex-col items-center bg-card"
                          >
                            {/* 预览图 */}
                            <img
                              src={asset.thumbnail}
                              alt={asset.name}
                              className="w-8 h-8 mb-1"
                            />

                            {/* 名称 */}
                            <span className="text-xs text-center">
                              {asset.name}
                            </span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground mt-1" />
                          </button>
                        ))}
                      </div>
                    )
                  )}
                </div>
              </>
            ) : (
              // 图标组合详情页
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex items-center gap-2 py-2 border-b">
                  <button
                    className="flex items-center gap-1 text-sm text-primary"
                    onClick={handleBackToIconSets}
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    返回
                  </button>
                  <span className="text-sm font-medium">{selectedIconSet.name}</span>
                </div>

                <div className="flex-1 overflow-y-auto py-4">
                  {selectedIconSet.data?.icons ? (
                    <div className="grid grid-cols-4 gap-2">
                      {selectedIconSet.data.icons.map((icon: any) => (
                        <button
                          key={icon.name}
                          onClick={() => handleIconClick(icon)}
                          className="p-2 border rounded-lg hover:border-primary transition-all flex flex-col items-center bg-card"
                        >
                          {/* 预览图 */}
                          <img
                            src={icon.svg.startsWith('data:') ? icon.svg : svgToDataUrl(icon.svg)}
                            alt={icon.name}
                            className="w-8 h-8 mb-1"
                          />

                          {/* 名称 */}
                          <span className="text-xs text-center">
                            {icon.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>图标组合中没有图标</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 flex justify-between">
            <Button variant="outline" onClick={onClose}>
              {showConfirmButton ? '取消' : '关闭'}
            </Button>
            {showConfirmButton && (
              <Button onClick={() => {
                if (previewAsset) {
                  onSelectAsset(previewAsset, iconSize, activeTab);
                } else {
                  // 没有预览素材，恢复本来的背景和动画
                  onSelectAsset(null, iconSize, activeTab);
                }
                onClose();
              }} disabled={!!(previewAsset && 
                ((currentAssetBackground && previewAsset.id === currentAssetBackground.id) || 
                 (currentAssetAnimation && previewAsset.id === currentAssetAnimation.id)))}>
                确定
              </Button>
            )}
          </DialogFooter>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};

export default AssetSelectorDialog;
