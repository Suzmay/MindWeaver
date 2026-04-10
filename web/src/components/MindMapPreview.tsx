import { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Minus,
  Download,
  ArrowLeft,
  Save,
  Share2,
  RefreshCw,
  Edit3,
  Sparkles,
  Grid3X3,
  Palette,
  Heart,
} from 'lucide-react';
import { AssetSelectorDialog } from './assets/AssetSelectorDialog';
import { Asset, assetService } from '../services/assets/AssetService';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { CanvasRenderer } from './canvas/CanvasRenderer';
import { MiniMap } from './canvas/MiniMap';
import { NodeCard } from './editor/NodeCard';
import { MindMapNode, Work } from '../models/Work';
import { useStorage } from '../context/StorageContext';
import { EncryptionService } from '../services/storage/encryption/EncryptionService';
import { KeyManager } from '../services/storage/encryption/KeyManager';
import { LayoutManager, LayoutMode, LayoutDirection } from './editor/LayoutManager';



interface MindMapPreviewProps {
  workId: string;
  onBack: () => void;
  onEdit: () => void;
}

interface FocusContentCardProps {
  node: MindMapNode;
  nodes: MindMapNode[];
  zoom: number;
  pan: { x: number; y: number };
  canvasContainerRef: React.RefObject<HTMLDivElement>;
  contentCardPosition: { x: number; y: number; width: number; height: number } | null;
}

// 将 kebab-case 转换为 PascalCase
const kebabToPascalCase = (str: string): string => {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
};

const renderMarkdown = (text: string) => {
  if (!text) return '无';
  
  // 提取大图标
  let largeIconSvg: string | null = null;
  const largeIconMatch = text.match(/:icon-([\w-]+?)-large:/);
  if (largeIconMatch) {
    const iconId = largeIconMatch[1];
    // 先尝试直接使用 iconId（适用于 iconify 图标）
    let asset = assetService.getAssetById(iconId);
    if (!asset) {
      // 再尝试添加 icon- 前缀（适用于默认图标）
      asset = assetService.getAssetById(`icon-${iconId}`);
    }
    if (asset) {
      // 先检查是否有 svg（内置图标）
      if (asset.data && asset.data.svg) {
        largeIconSvg = asset.data.svg
          .replace(/width="[^"]*"/, 'width="128"')
          .replace(/height="[^"]*"/, 'height="128"')
          .replace(/viewBox="[^"]*"/, 'viewBox="0 0 24 24"');
      } else if (asset.data && asset.data.content) {
        // 再检查是否有 content（用户上传的图片）
        largeIconSvg = `<img src="${asset.data.content}" alt="图标" class="w-32 h-32 object-contain" />`;
      }
    } else {
      // 如果在资产中找不到，尝试从图标组合中查找
      const pascalName = kebabToPascalCase(iconId);
      const iconSvg = assetService.getIconSvgByName(pascalName);
      if (iconSvg) {
        // 检查是否是 data URL（用户上传的图片）
        if (iconSvg.startsWith('data:')) {
          largeIconSvg = `<img src="${iconSvg}" alt="图标" class="w-32 h-32 object-contain" />`;
        } else {
          // 是 SVG 字符串（内置图标）
          largeIconSvg = iconSvg
            .replace(/width="[^"]*"/, 'width="128"')
            .replace(/height="[^"]*"/, 'height="128"')
            .replace(/viewBox="[^"]*"/, 'viewBox="0 0 24 24"');
        }
      }
    }
  }
  
  // 去除大图标标记后的文本
  const textWithoutLargeIcon = text.replace(/:icon-[\w-]+?-large:/g, '');
  
  // 通用的图标替换函数（只处理小图标）
  const replaceSmallIcons = (str: string) => {
    let result = str;
    
    // 替换小图标
    result = result.replace(/:icon-([\w-]+?):/g, (match, iconId) => {
      // 先尝试直接使用 iconId（适用于 iconify 图标）
      let asset = assetService.getAssetById(iconId);
      if (!asset) {
        // 再尝试添加 icon- 前缀（适用于默认图标）
        asset = assetService.getAssetById(`icon-${iconId}`);
      }
      if (asset) {
        // 先检查是否有 svg（内置图标）
        if (asset.data && asset.data.svg) {
          return `<span class="inline-flex items-center justify-center w-4 h-4 align-middle" style="vertical-align: middle;">${asset.data.svg}</span>`;
        } else if (asset.data && asset.data.content) {
          // 再检查是否有 content（用户上传的图片）
          return `<span class="inline-flex items-center justify-center w-4 h-4 align-middle" style="vertical-align: middle;"><img src="${asset.data.content}" alt="图标" class="w-4 h-4 object-contain" /></span>`;
        }
      } else {
          // 如果在资产中找不到，尝试从图标组合中查找
          const pascalName = kebabToPascalCase(iconId);
          const iconSvg = assetService.getIconSvgByName(pascalName);
          if (iconSvg) {
            // 检查是否是 data URL（用户上传的图片）
            if (iconSvg.startsWith('data:')) {
              return `<span class="inline-flex items-center justify-center w-4 h-4 align-middle" style="vertical-align: middle;"><img src="${iconSvg}" alt="图标" class="w-4 h-4 object-contain" /></span>`;
            } else {
              // 是 SVG 字符串（内置图标）
              return `<span class="inline-flex items-center justify-center w-4 h-4 align-middle" style="vertical-align: middle;">${iconSvg}</span>`;
            }
          }
        }
      return match;
    });
    
    return result;
  };
  
  const lines = textWithoutLargeIcon.split('\n').map((line, index) => {
    if (line.startsWith('# ')) {
      return <h1 key={index} className="text-xl font-bold mt-1 mb-1">{line.substring(2)}</h1>;
    }
    if (line.startsWith('## ')) {
      return <h2 key={index} className="text-lg font-semibold mt-1 mb-1">{line.substring(3)}</h2>;
    }
    if (line.startsWith('- ')) {
      let listContent = line.substring(2);
      listContent = listContent
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/__(.*?)__/g, '<u>$1</u>');
      listContent = replaceSmallIcons(listContent);
      return <li key={index} className="ml-4 list-disc" dangerouslySetInnerHTML={{ __html: listContent }} />;
    }
    if (line.match(/^\d+\. /)) {
      let listContent = line.substring(line.indexOf(' ') + 1);
      listContent = listContent
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/__(.*?)__/g, '<u>$1</u>');
      listContent = replaceSmallIcons(listContent);
      return <li key={index} className="ml-4 list-decimal" dangerouslySetInnerHTML={{ __html: listContent }} />;
    }
    let processedLine = line
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/__(.*?)__/g, '<u>$1</u>');
    processedLine = replaceSmallIcons(processedLine);
    
    return <p key={index} dangerouslySetInnerHTML={{ __html: processedLine }} />;
  });
  
  // 如果有大图标，使用特殊布局
  if (largeIconSvg) {
    return (
      <div className="flex items-start gap-4">
        <div className="flex-1">{lines}</div>
        <div 
          className="flex-shrink-0 flex items-center justify-center" 
          style={{ width: '128px', height: '128px', alignSelf: 'center' }}
          dangerouslySetInnerHTML={{ __html: largeIconSvg }} 
        />
      </div>
    );
  }
  
  return lines;
};

const FocusContentCard: React.FC<FocusContentCardProps> = ({
  node,
  nodes,
  zoom,
  pan,
  canvasContainerRef,
  contentCardPosition,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  // 计算内容卡片的最佳位置（使用从 CanvasRenderer 获取的位置和尺寸）
  const calculateCardPosition = () => {
    if (!canvasContainerRef.current || !contentCardPosition) {
      return { left: 0, top: 0 };
    }

    const containerRect = canvasContainerRef.current.getBoundingClientRect();

    // CanvasRenderer 返回的是 Canvas 坐标系中的坐标（已经经过 ctx.scale）
    // 转换为屏幕坐标：Canvas坐标 * zoom + pan + 容器偏移
    // 注意：Canvas坐标已经是缩放后的，所以需要先除以zoom再乘以zoom？不对
    // 实际上，CanvasRenderer中的坐标是在ctx.scale之后的，所以：
    // 屏幕坐标 = Canvas坐标 * zoom + pan + 容器偏移
    let screenX = contentCardPosition.x * zoom + pan.x + containerRect.left;
    let screenY = contentCardPosition.y * zoom + pan.y + containerRect.top;

    // 使用 CanvasRenderer 传递的尺寸（未缩放），转换为像素尺寸
    const pixelWidth = contentCardPosition.width * zoom;
    const pixelHeight = contentCardPosition.height * zoom;
    
    // 将中心点转换为左上角
    screenX -= pixelWidth / 2;
    screenY -= pixelHeight / 2;

    return { left: screenX, top: screenY };
  };

  const [cardPosition, setCardPosition] = useState(calculateCardPosition());

  useEffect(() => {
    setCardPosition(calculateCardPosition());
  }, [zoom, pan, nodes, contentCardPosition]);

  // 计算卡片样式
  const cardStyle = () => {
    if (!contentCardPosition) {
      return {
        left: cardPosition.left,
        top: cardPosition.top,
        minWidth: '200px',
        maxWidth: '600px',
      };
    }
    // Canvas 传递的是未缩放的尺寸，需要乘以 zoom 转换为像素
    const pixelWidth = contentCardPosition.width * zoom;
    const pixelHeight = contentCardPosition.height * zoom;
    return {
      left: cardPosition.left,
      top: cardPosition.top,
      width: pixelWidth,
      height: pixelHeight,
      minWidth: `${pixelWidth}px`,
      maxWidth: '600px',
    };
  };

  return (
    <div
      ref={cardRef}
      className="fixed z-50 bg-card border border-primary/20 rounded-xl shadow-lg p-4"
      style={{ ...cardStyle(), boxSizing: 'border-box' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-3">
        <h3 className="font-semibold text-sm">{node.title}</h3>
      </div>

      <div className="text-sm text-muted-foreground">
        {renderMarkdown(node.content || '')}
      </div>
    </div>
  );
};

export function MindMapPreview({ workId, onBack, onEdit }: MindMapPreviewProps) {
  const storage = useStorage();
  const encryptionService = EncryptionService.getInstance();
  const keyManager = KeyManager.getInstance();

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [work, setWork] = useState<Work | null>(null);
  const [nodes, setNodes] = useState<MindMapNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [showAnimation, setShowAnimation] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [canvasBackground, setCanvasBackground] = useState<string>('');
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [bubbleInfo, setBubbleInfo] = useState<{
    nodeId: string;
    position: { x: number; y: number };
    direction: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    showContent: boolean;
  } | null>(null);
  const [hiddenLevels] = useState<Set<number>>(new Set());
  const [isInteracting, setIsInteracting] = useState(false);
  const [parentMap, setParentMap] = useState<Map<string, string>>(new Map()); // 子节点 ID 到父节点 ID 的映射表
  const [showSaveDialog, setShowSaveDialog] = useState(false); // 保存背景颜色提示对话框
  const [originalBackground, setOriginalBackground] = useState<string>(''); // 原始背景颜色，用于检测是否修改
  const [isUsingAssetBackground, setIsUsingAssetBackground] = useState(false); // 是否使用了素材背景
  const [currentAssetBackground, setCurrentAssetBackground] = useState<Asset | null>(null); // 当前使用的素材背景
  const [currentAssetBackgroundId, setCurrentAssetBackgroundId] = useState<string | null>(null); // 当前使用的素材背景
  const [originalAssetBackgroundId, setOriginalAssetBackgroundId] = useState<string | null>(null); // 原始素材背景ID，用于检测是否修改

  const [currentAssetAnimation, setCurrentAssetAnimation] = useState<Asset | null>(null); // 当前使用的素材动画
  const [currentAssetAnimationId, setCurrentAssetAnimationId] = useState<string | null>(null); // 当前使用的素材动画ID
  const [originalAssetAnimationId, setOriginalAssetAnimationId] = useState<string | null>(null); // 原始素材动画ID，用于检测是否修改
  const [animationVersion, setAnimationVersion] = useState(0); // 动画版本号，用于触发 CanvasRenderer 重新渲染
  const [isAnimationPaused, setIsAnimationPaused] = useState(false); // 动画是否暂停
  const [savePurpose, setSavePurpose] = useState<'edit' | 'back' | null>(null); // 保存的目的：编辑或返回
  const [previewBackground, setPreviewBackground] = useState<string | null>(null); // 预览时的背景颜色

  // 素材选择弹窗状态
  const [isAssetDialogOpen, setIsAssetDialogOpen] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null); // 当前预览的素材
  const [originalShowAnimation, setOriginalShowAnimation] = useState<boolean>(false); // 预览前的原始动画状态
  const justConfirmedRef = useRef(false); // 标记是否刚刚完成了确定操作

  // 聚焦模式状态
  interface FocusState {
    focusedNode: string | null;      // 当前聚焦的节点ID
    isFocusMode: boolean;            // 是否处于聚焦模式
    focusAnimationProgress: number;  // 聚焦动画进度 (0-1)
    focusZoomLevel: number;          // 聚焦时的缩放级别
    focusPan: { x: number; y: number }; // 聚焦时的画布平移位置
  }
  
  const [focusState, setFocusState] = useState<FocusState>({
    focusedNode: null,
    isFocusMode: false,
    focusAnimationProgress: 0,
    focusZoomLevel: 1,
    focusPan: { x: 0, y: 0 }
  });
  const [animationStateBeforeFocus, setAnimationStateBeforeFocus] = useState<boolean>(false); // 记录聚焦前的动画状态
  const [userManuallyToggledAnimation, setUserManuallyToggledAnimation] = useState<boolean>(false); // 标记用户是否在聚焦期间手动调整了动画
  const [focusContentCardPosition, setFocusContentCardPosition] = useState<{ x: number; y: number; width: number; height: number } | null>(null); // 从 CanvasRenderer 获取的内容卡片位置

  // 默认节点数据（用于新建的思维导图）
  const getDefaultNodes = (layout: { mode: LayoutMode; direction: LayoutDirection }): MindMapNode[] => {
    // 基础节点数据（不包含位置）
    const baseNodes: MindMapNode[] = [
      {
        id: 'root',
        x: 0,
        y: 0,
        title: '中心主题',
        summary: '这是思维导图的中心主题',
        content: '在这里添加详细内容...',
        type: 'concept',
        shape: 'rounded',
        color: '#14B8A6',
        fontSize: 16,
        connectionType: 'curved',
        children: ['node1', 'node2', 'node3'],
        expanded: true,
        level: 0,
      },
      {
        id: 'node1',
        x: 0,
        y: 0,
        title: '分支一',
        summary: '分支一的摘要',
        content: '',
        type: 'concept',
        shape: 'rounded',
        color: '#0EA5E9',
        fontSize: 14,
        connectionType: 'curved',
        children: [],
        expanded: true,
        level: 1,
      },
      {
        id: 'node2',
        x: 0,
        y: 0,
        title: '分支二',
        summary: '分支二的摘要',
        content: '',
        type: 'concept',
        shape: 'rounded',
        color: '#06B6D4',
        fontSize: 14,
        connectionType: 'curved',
        children: [],
        expanded: true,
        level: 1,
      },
      {
        id: 'node3',
        x: 0,
        y: 0,
        title: '分支三',
        summary: '分支三的摘要',
        content: '',
        type: 'concept',
        shape: 'rounded',
        color: '#22D3EE',
        fontSize: 14,
        connectionType: 'curved',
        children: [],
        expanded: true,
        level: 1,
      },
    ];

    // 应用预设布局
    const layoutOptions = {
      mode: layout.mode,
      direction: layout.direction,
      levelSpacing: 150,
      nodeSpacing: 80,
      centerX: 0,
      centerY: 0,
    };
    return LayoutManager.applyLayout(baseNodes, layoutOptions);
  };

  useEffect(() => {
    const loadWorkData = async () => {
      try {
        const workDetails = await storage.getWork(workId);
        
        if (workDetails) {
          setWork(workDetails);
          
          let finalNodes: MindMapNode[] = [];
          if (workDetails.encryptedData) {
            try {
              const key = keyManager.getKey();
              if (key) {
                const decryptedData = await encryptionService.decrypt(workDetails.encryptedData, key);
                
                if (decryptedData.nodes) {
                  finalNodes = decryptedData.nodes;
                }
                // 加载背景设置
                const savedBackground = decryptedData.canvasBackground || '';
                setCanvasBackground(savedBackground);
                setOriginalBackground(savedBackground);
                
                // 加载素材背景信息
                if (decryptedData.assetBackground) {
                  setCurrentAssetBackground(decryptedData.assetBackground);
                  setCurrentAssetBackgroundId(decryptedData.assetBackground.id);
                  setOriginalAssetBackgroundId(decryptedData.assetBackground.id);
                  setIsUsingAssetBackground(true);
                  // 重新应用素材背景的样式
                  const asset = decryptedData.assetBackground;
                  if (asset.data?.content) {
                    // 用户上传的图片背景
                    setCanvasBackground(asset.data.content);
                    setOriginalBackground(asset.data.content);
                  } else if (asset.data?.type === 'gradient' && asset.data?.colors) {
                    const gradient = `linear-gradient(135deg, ${asset.data.colors.join(', ')})`;
                    setCanvasBackground(gradient);
                    setOriginalBackground(gradient);
                  } else if (asset.data?.type === 'grid' && asset.data?.size && asset.data?.color && asset.data?.backgroundColor) {
                    const bgColor = asset.data.backgroundColor;
                    setCanvasBackground(bgColor);
                    setOriginalBackground(bgColor);
                  } else if (asset.data?.type === 'solid' && asset.data?.color) {
                    setCanvasBackground(asset.data.color);
                    setOriginalBackground(asset.data.color);
                  }
                } else {
                  setCurrentAssetBackground(null);
                  setCurrentAssetBackgroundId(null);
                  setOriginalAssetBackgroundId(null);
                  setIsUsingAssetBackground(false);
                }
                
                // 加载素材动画信息
                if (decryptedData.assetAnimation) {
                  setCurrentAssetAnimation(decryptedData.assetAnimation);
                  setCurrentAssetAnimationId(decryptedData.assetAnimation.id);
                  setOriginalAssetAnimationId(decryptedData.assetAnimation.id);
                  setShowAnimation(true);
                } else {
                  setCurrentAssetAnimation(null);
                  setCurrentAssetAnimationId(null);
                  setOriginalAssetAnimationId(null);
                }
              }
            } catch (decryptError) {
              // 解密失败，使用默认数据
            }
          }
          
          // 如果没有数据（新建的思维导图），使用默认节点并根据预设布局应用位置
          if (finalNodes.length === 0 && workDetails.layout) {
            const layout = { 
              mode: workDetails.layout.mode as LayoutMode, 
              direction: workDetails.layout.direction as LayoutDirection 
            };
            finalNodes = getDefaultNodes(layout);
          }
          
          const nodesWithLevels = calculateNodeLevels(finalNodes);
          setNodes(nodesWithLevels);
          
          // 预处理父节点关系，建立子节点 ID 到父节点 ID 的映射表
          const newParentMap = new Map<string, string>();
          nodesWithLevels.forEach(node => {
            node.children.forEach(childId => {
              newParentMap.set(childId, node.id);
            });
          });
          setParentMap(newParentMap);
          
          const allNodeIds = nodesWithLevels.map(n => n.id);
          setExpandedNodes(new Set(allNodeIds));
        }
      } catch (error) {
        // 加载失败，使用默认数据
      }
    };

    loadWorkData();
  }, [workId]);

  const calculateNodeLevels = (nodes: MindMapNode[]): MindMapNode[] => {
    const nodeMap = new Map<string, MindMapNode>();
    nodes.forEach(node => nodeMap.set(node.id, node));
    
    const calculateLevel = (nodeId: string, parentLevel: number): number => {
      const node = nodeMap.get(nodeId);
      if (!node) return 0;
      
      const level = parentLevel + 1;
      node.level = level;
      
      node.children.forEach(childId => {
        calculateLevel(childId, level);
      });
      
      return level;
    };
    
    const rootNode = nodes.find(node => node.id === 'root');
    if (rootNode) {
      rootNode.level = 0;
      rootNode.children.forEach(childId => {
        calculateLevel(childId, 0);
      });
    }
    
    return nodes;
  };

  const handlePanChange = (newPan: { x: number; y: number }) => {
    setIsInteracting(true);
    setPan(newPan);
    // 操作完成后延迟重置交互状态
    setTimeout(() => setIsInteracting(false), 300);
  };

  const handleRefresh = () => {
    setIsInteracting(true);
    if (canvasContainerRef.current) {
      const { width, height } = canvasContainerRef.current.getBoundingClientRect();
      setPan({ x: width / 2, y: height / 2 });
      setZoom(1);
    }
    // 操作完成后延迟重置交互状态
    setTimeout(() => setIsInteracting(false), 300);
  };

  const handleZoomChange = (newZoom: number) => {
    setIsInteracting(true);
    setZoom(newZoom);
    // 操作完成后延迟重置交互状态
    setTimeout(() => setIsInteracting(false), 300);
  };

  const handleCanvasClick = () => {
    if (focusState.isFocusMode) {
      exitFocusMode();
    } else {
      setBubbleInfo(null);
    }
  };

  const handleNodeSelect = () => {
  };

  const handleNodeExpand = (nodeId: string, expand?: boolean) => {
    const newExpandedNodes = new Set(expandedNodes);
    const shouldExpand = expand !== undefined ? expand : !expandedNodes.has(nodeId);
    
    if (shouldExpand) {
      newExpandedNodes.add(nodeId);
    } else {
      newExpandedNodes.delete(nodeId);
    }
    
    setExpandedNodes(newExpandedNodes);
  };

  useEffect(() => {
    const handleResize = () => {
      if (canvasContainerRef.current) {
        const { width, height } = canvasContainerRef.current.getBoundingClientRect();
        setPan({ x: width / 2, y: height / 2 });
        setCanvasSize({ width, height });
      }
    };

    const setupCanvasPosition = () => {
      if (canvasContainerRef.current) {
        handleResize();
      } else {
        setTimeout(setupCanvasPosition, 100);
      }
    };

    setTimeout(setupCanvasPosition, 100);
    
    window.addEventListener('resize', handleResize);
    
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    
    const setupObserver = () => {
      if (canvasContainerRef.current) {
        resizeObserver.observe(canvasContainerRef.current);
      } else {
        setTimeout(setupObserver, 100);
      }
    };

    setupObserver();
    
    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, []);

  const handleShare = () => {
    alert('分享功能开发中，敬请期待！');
  };

  const handleExport = () => {
    alert('导出功能开发中，敬请期待！');
  };

  // 保存背景颜色到作品数据
  const saveCanvasBackground = async () => {
    if (!work) {
      console.error('作品数据不存在，无法保存背景');
      return;
    }
    
    try {
      const key = keyManager.getKey();
      if (!key) {
        return;
      }
      
      // 获取当前作品数据
      const workDetails = await storage.getWork(workId);
      if (!workDetails) {
        return;
      }
      if (!workDetails.encryptedData) {
        return;
      }
      
      // 解密现有数据
      const decryptedData = await encryptionService.decrypt(workDetails.encryptedData, key);
      
      // 更新背景颜色
      decryptedData.canvasBackground = canvasBackground;
      
      // 保存素材背景信息
      if (currentAssetBackground) {
        decryptedData.assetBackground = currentAssetBackground;
      } else {
        delete decryptedData.assetBackground;
      }
      
      // 保存素材动画信息
      if (currentAssetAnimation) {
        decryptedData.assetAnimation = currentAssetAnimation;
      } else {
        delete decryptedData.assetAnimation;
      }
      
      // 重新加密并保存
      const encryptedData = await encryptionService.encrypt(decryptedData, key);
      await storage.updateWork(workId, {
        encryptedData,
      });
      
      // 更新原始背景状态，避免重复提示
      setOriginalBackground(canvasBackground);
      setOriginalAssetBackgroundId(currentAssetBackgroundId);
    } catch (error) {
      // 保存失败，忽略错误
    }
  };

  // 处理编辑按钮点击
  const handleEdit = () => {
    // 检测背景或动画是否被修改
    if (canvasBackground !== originalBackground || 
        currentAssetBackgroundId !== originalAssetBackgroundId || 
        currentAssetAnimationId !== originalAssetAnimationId) {
      setSavePurpose('edit');
      setShowSaveDialog(true);
    } else {
      onEdit();
    }
  };

  // 处理保存按钮点击
  const handleSave = async () => {
    if (canvasBackground !== originalBackground || 
        currentAssetBackgroundId !== originalAssetBackgroundId || 
        currentAssetAnimationId !== originalAssetAnimationId) {
      await saveCanvasBackground();
      // 更新原始状态
      setOriginalBackground(canvasBackground);
      setOriginalAssetBackgroundId(currentAssetBackgroundId);
      setOriginalAssetAnimationId(currentAssetAnimationId);
    }
  };



  // 处理返回按钮点击
  const handleBack = () => {
    // 检测背景或动画是否被修改
    if (canvasBackground !== originalBackground || 
        currentAssetBackgroundId !== originalAssetBackgroundId || 
        currentAssetAnimationId !== originalAssetAnimationId) {
      setSavePurpose('back');
      setShowSaveDialog(true);
    } else {
      onBack();
    }
  };

  // 计算聚焦位置
  const calculateFocusPosition = () => {
    // 在聚焦模式下，节点位置会被设置为 { x: 0, y: 0 }
    // 所以直接返回画布中心位置即可
    const canvasWidth = canvasSize.width;
    const canvasHeight = canvasSize.height;
    const canvasCenterX = canvasWidth / 2;
    const canvasCenterY = canvasHeight / 2;
    
    return {
      x: canvasCenterX,
      y: canvasCenterY
    };
  };

  // 处理节点聚焦
  const handleNodeFocus = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) {
      return;
    }

    // 记录聚焦前的动画状态，并暂时关闭动画以确保聚焦操作顺利完成
    setAnimationStateBeforeFocus(showAnimation);
    setUserManuallyToggledAnimation(false); // 重置用户手动调整标记
    setShowAnimation(false);

    const focusPosition = calculateFocusPosition();
    setFocusState({
      focusedNode: nodeId,
      isFocusMode: true,
      focusAnimationProgress: 0,
      focusZoomLevel: 1.2, // 固定放大到120%
      focusPan: focusPosition
    });
  };

  // 退出聚焦模式
  const exitFocusMode = () => {
    // 先暂停动画，确保退出聚焦模式的过程顺利
    setIsAnimationPaused(true);
    
    setFocusState(prev => ({
      ...prev,
      isFocusMode: false,
      focusAnimationProgress: 0
    }));
    setBubbleInfo(null);
    // 重置聚焦相关状态
    setUserManuallyToggledAnimation(false);
    
    // 延迟一小段时间后重新打开动画，确保已经成功回到正常界面
    setTimeout(() => {
      // 如果之前动画是开启的，重新开启动画
      if (animationStateBeforeFocus) {
        setShowAnimation(true);
      }
      // 取消暂停，允许动画继续播放
      setIsAnimationPaused(false);
    }, 300);
  };

  // 处理素材预览
  const handleAssetPreview = (asset: Asset | null) => {
    if (asset === null) {
      // 取消预览，恢复原始状态
      setCanvasBackground(originalBackground);
      setPreviewBackground(null);
      setShowAnimation(originalShowAnimation);
      setPreviewAsset(null);
      // 只有在没有选定素材背景的情况下，才将 isUsingAssetBackground 设置为 false
      if (!currentAssetBackground) {
        setIsUsingAssetBackground(false);
      }

    } else {
      // 首次预览，保存原始状态
      if (!previewAsset) {
        setOriginalBackground(canvasBackground);
        setOriginalShowAnimation(showAnimation);
      }
      
      // 应用预览
      setPreviewAsset(asset);
      switch (asset.type) {
        case 'background':
          if (asset.data?.content) {
            // 支持用户上传的图片背景
            setPreviewBackground(asset.data.content);
            setIsUsingAssetBackground(true);
          } else if (asset.data?.type === 'gradient' && asset.data?.colors) {
            // 提取渐变的第一个颜色作为预览背景值
            const previewColor = asset.data.colors[0] || '#ffffff';
            setPreviewBackground(previewColor);
            setIsUsingAssetBackground(true);
          } else if (asset.data?.type === 'grid' && asset.data?.size && asset.data?.color && asset.data?.backgroundColor) {
            // 创建格子背景
            const previewColor = asset.data.backgroundColor;
            setPreviewBackground(previewColor);
            setIsUsingAssetBackground(true);
          } else if (asset.data?.type === 'solid' && asset.data?.color) {
            const previewColor = asset.data.color;
            setPreviewBackground(previewColor);
            setIsUsingAssetBackground(true);
          }
          break;
        case 'animation':
          if (asset.data?.type) {
            // 预览动画时，先暂停，然后更新动画版本号，再继续播放
            setIsAnimationPaused(true);
            // 预览动画时，确保动画处于开启状态
            setShowAnimation(true);
            // 更新动画版本号，确保 CanvasRenderer 重新渲染，只运行预览的动画
            setAnimationVersion(prev => prev + 1);
            // 延迟一小段时间后继续播放动画，确保动画切换完成
            setTimeout(() => {
              setIsAnimationPaused(false);
            }, 50);
          }
          break;
      }
    }
  };

  // 处理素材选择（确定）
  const handleAssetSelect = (asset: Asset | null, _size: 'small' | 'large', activeTab?: string) => {
    // 标记刚刚完成了确定操作
    justConfirmedRef.current = true;
    
    if (asset === null) {
      // 根据当前活动标签页只恢复相关状态
      if (activeTab === 'backgrounds') {
        // 恢复本来的背景（背景按钮选择的颜色）
        setIsUsingAssetBackground(false);
        setCurrentAssetBackground(null);
        setCurrentAssetBackgroundId(null);
        // 保持当前的 canvasBackground，因为它已经是背景按钮选择的颜色
      } else if (activeTab === 'animations') {
        // 恢复动画状态
        setCurrentAssetAnimation(null);
        setCurrentAssetAnimationId(null);
        setShowAnimation(false);
      }
    } else {
      // 应用素材
      switch (asset.type) {
        case 'background':
          if (asset.data?.content) {
            // 支持用户上传的图片背景
            setIsUsingAssetBackground(true);
            setCurrentAssetBackground(asset);
            setCurrentAssetBackgroundId(asset.id);
          } else if (asset.data?.type === 'gradient' && asset.data?.colors) {
            // 只更新素材背景相关状态，不修改 canvasBackground
            setIsUsingAssetBackground(true);
            setCurrentAssetBackground(asset);
            setCurrentAssetBackgroundId(asset.id);
          } else if (asset.data?.type === 'grid' && asset.data?.size && asset.data?.color && asset.data?.backgroundColor) {
              // 只更新素材背景相关状态，不修改 canvasBackground
              setIsUsingAssetBackground(true);
              setCurrentAssetBackground(asset);
              setCurrentAssetBackgroundId(asset.id);
          } else if (asset.data?.type === 'solid' && asset.data?.color) {
            // 只更新素材背景相关状态，不修改 canvasBackground
            setIsUsingAssetBackground(true);
            setCurrentAssetBackground(asset);
            setCurrentAssetBackgroundId(asset.id);
          }
          break;
        case 'animation':
          if (asset.data?.type) {
            setCurrentAssetAnimation(asset);
            setCurrentAssetAnimationId(asset.id);
            setShowAnimation(true);
            // 更新动画版本号，触发 CanvasRenderer 重新渲染
            setAnimationVersion(prev => prev + 1);
          }
          break;
      }
    }
    
    // 清空预览状态（在应用完成后）
    setPreviewAsset(null);
  };

  // 处理取消素材选择
  const handleAssetDialogClose = () => {
    // 如果刚刚完成了确定操作，不要恢复原始状态
    if (justConfirmedRef.current) {
      justConfirmedRef.current = false;
      setIsAssetDialogOpen(false);
      return;
    }
    // 如果有预览，恢复到当前保存的状态
    if (previewAsset) {
      // 先暂停动画，确保切换过程顺利
      setIsAnimationPaused(true);
      
      // 恢复到当前保存的背景
      if (currentAssetBackground) {
        // 如果有保存的素材背景，恢复到素材背景状态
        setIsUsingAssetBackground(true);
      } else {
        // 否则恢复到原始背景
        setCanvasBackground(originalBackground);
        setIsUsingAssetBackground(false);
      }
      
      setShowAnimation(originalShowAnimation);
      setPreviewAsset(null);
      setPreviewBackground(null);
      
      // 延迟一小段时间后继续播放动画，确保动画切换完成
      setTimeout(() => {
        setIsAnimationPaused(false);
      }, 50);
    }
    setIsAssetDialogOpen(false);
  };

  // 聚焦动画效果（处理聚焦动画进度，并在完成后恢复动画状态）
  useEffect(() => {
    if (focusState.isFocusMode && focusState.focusAnimationProgress < 1) {
      const animate = () => {
        setFocusState(prev => {
          const newProgress = Math.min(1, prev.focusAnimationProgress + 0.05);
          return {
            ...prev,
            focusAnimationProgress: newProgress
          };
        });
        
        if (focusState.focusAnimationProgress < 0.95) {
          requestAnimationFrame(animate);
        }
      };
      
      const animationId = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animationId);
    }
  }, [focusState.isFocusMode, focusState.focusAnimationProgress]);

  // 单独的 effect：当聚焦动画完成时，恢复动画状态
  useEffect(() => {
    if (focusState.isFocusMode && focusState.focusAnimationProgress >= 1) {
      // 聚焦动画完成，如果用户没有在聚焦期间手动调整动画，则恢复之前的动画状态
      if (!userManuallyToggledAnimation) {
        setShowAnimation(animationStateBeforeFocus);
      }
    }
  }, [focusState.focusAnimationProgress, focusState.isFocusMode, userManuallyToggledAnimation, animationStateBeforeFocus]);

  return (
    <div className="h-screen flex flex-col">
      <div className="border-b bg-toolbar-background flex flex-wrap items-center justify-between px-4 gap-4 py-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBack} className="rounded-lg">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <h2>{work?.title || workId}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} className="rounded-lg">
            <RefreshCw className="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          <Button 
            variant={showAnimation ? "default" : "outline"} 
            size="sm" 
            onClick={() => {
              // 如果在聚焦期间手动调整动画，标记为已手动调整
              if (focusState.isFocusMode) {
                setUserManuallyToggledAnimation(true);
              }
              
              if (showAnimation) {
                // 关闭动画时：只设置 showAnimation = false，不要清除素材动画状态
                setShowAnimation(false);
              } else {
                // 打开动画时：检查是否有 currentAssetAnimation
                setShowAnimation(true);
                if (currentAssetAnimation) {
                  // 使用选中的素材动画
                } else {
                  // 使用默认动画
                }
              }
            }}
            className="rounded-lg w-20"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            动画
          </Button>

          <Button 
            variant={showGrid ? "default" : "outline"} 
            size="sm" 
            onClick={() => {
              setIsInteracting(true);
              setShowGrid(!showGrid);
              // 操作完成后延迟重置交互状态
              setTimeout(() => setIsInteracting(false), 300);
            }} 
            className="rounded-lg w-20"
          >
            <Grid3X3 className="w-4 h-4 mr-2" />
            网格
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-lg w-20">
                <Palette className="w-4 h-4 mr-2" />
                背景
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-lg p-4 min-w-[200px]">
              <div className="mb-4">
                <Button
                  variant={canvasBackground ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setCanvasBackground('');
                    setIsUsingAssetBackground(false);
                    setCurrentAssetBackground(null);
                  }}
                  disabled={!canvasBackground}
                  className="w-full mb-4"
                >
                  恢复默认
                </Button>
              </div>
              <div className="space-y-4">
                {/* 检查是否使用了素材背景 */}
                {isUsingAssetBackground ? (
                  <div className="flex items-center text-sm text-muted-foreground h-16">
                    背景来自素材，无法直接修改
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <div className="w-16 h-16 border-2 rounded-lg overflow-hidden flex items-center justify-center">
                      <input
                        type="color"
                        value={canvasBackground || '#ffffff'}
                        onChange={(e) => {
                          setCanvasBackground(e.target.value);
                          setIsUsingAssetBackground(false);
                          setCurrentAssetBackground(null);
                        }}
                        className="w-full h-full p-0 m-0 border-0 cursor-pointer"
                        style={{ 
                          appearance: 'none', 
                          background: 'none',
                          width: '100%',
                          height: '100%',
                          padding: 0,
                          margin: 0,
                          border: 'none',
                          outline: 'none'
                        }}
                        title="选择颜色"
                      />
                    </div>
                    <Input
                      type="text"
                      value={canvasBackground || '#ffffff'}
                      onChange={(e) => {
                        setCanvasBackground(e.target.value);
                        setIsUsingAssetBackground(false);
                        setCurrentAssetBackground(null);
                      }}
                      className="flex-1 rounded-lg border-2"
                      placeholder="输入颜色值"
                    />
                  </div>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 素材按钮 */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              // 打开对话框时，如果有当前使用的动画素材，默认选择那个
              if (currentAssetAnimation) {
                setPreviewAsset(currentAssetAnimation);
              }
              setIsAssetDialogOpen(true);
            }} 
            className="rounded-lg w-20"
            title="收藏素材"
          >
            <Heart className="w-4 h-4 mr-2" />
            素材
          </Button>

          <Separator orientation="vertical" className="h-6" />

          <div className="flex items-center gap-1 border rounded-lg p-1 bg-background">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom((prev) => Math.max(0.1, prev - 0.1))}
              className="h-7 px-2"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <span className="text-sm min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom((prev) => Math.min(3, prev + 0.1))}
              className="h-7 px-2"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          <Button variant="outline" size="sm" className="rounded-2xl w-20" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            保存
          </Button>
          <Button variant="outline" size="sm" className="rounded-2xl w-20" onClick={handleEdit}>
            <Edit3 className="w-4 h-4 mr-2" />
            编辑
          </Button>
          <Button variant="outline" size="sm" className="rounded-2xl w-20" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            分享
          </Button>
          <Button variant="outline" size="sm" className="rounded-2xl w-20" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            导出
          </Button>
        </div>
      </div>

      <div 
        ref={canvasContainerRef}
        className="flex-1 relative overflow-hidden"
        style={{ 
          backgroundColor: (() => {
            // 处理用户上传的图片背景：不设置背景色，直接使用背景图片
            if (previewAsset?.data?.content || (isUsingAssetBackground && currentAssetBackground?.data?.content)) {
              return 'transparent';
            }
            // 处理纯色背景
            if (previewAsset?.data?.type === 'solid' && previewAsset?.data?.color) {
              return previewAsset.data.color;
            }
            if (isUsingAssetBackground && currentAssetBackground?.data?.type === 'solid' && currentAssetBackground?.data?.color) {
              return currentAssetBackground.data.color;
            }
            // 处理格子背景的背景色
            if (previewAsset?.data?.type === 'grid' && previewAsset?.data?.backgroundColor) {
              return previewAsset.data.backgroundColor;
            }
            if (isUsingAssetBackground && currentAssetBackground?.data?.type === 'grid' && currentAssetBackground?.data?.backgroundColor) {
              return currentAssetBackground.data.backgroundColor;
            }
            return previewBackground || canvasBackground;
          })(),
          backgroundImage: (() => {
            // 处理用户上传的图片背景
            if (previewAsset?.data?.content) {
              return `url(${previewAsset.data.content})`;
            }
            if (isUsingAssetBackground && currentAssetBackground?.data?.content) {
              return `url(${currentAssetBackground.data.content})`;
            }
            // 处理渐变背景
            if (previewAsset) {
              if (previewAsset.data?.type === 'gradient' && previewAsset.data?.colors) {
                return `linear-gradient(135deg, ${previewAsset.data.colors.join(', ')})`;
              } else if (previewAsset.data?.type === 'grid' && previewAsset.data?.size && previewAsset.data?.color) {
                return `linear-gradient(to right, ${previewAsset.data.color} 1px, transparent 1px), linear-gradient(to bottom, ${previewAsset.data.color} 1px, transparent 1px)`;
              }
              return undefined;
            }
            if (isUsingAssetBackground && currentAssetBackground) {
              if (currentAssetBackground.data?.type === 'gradient' && currentAssetBackground.data?.colors) {
                return `linear-gradient(135deg, ${currentAssetBackground.data.colors.join(', ')})`;
              } else if (currentAssetBackground.data?.type === 'grid' && currentAssetBackground.data?.size && currentAssetBackground.data?.color) {
                return `linear-gradient(to right, ${currentAssetBackground.data.color} 1px, transparent 1px), linear-gradient(to bottom, ${currentAssetBackground.data.color} 1px, transparent 1px)`;
              }
              return undefined;
            }
            return undefined;
          })(),
          backgroundSize: (() => {
            // 处理用户上传的图片背景：设置为cover以填充整个画布
            if (previewAsset?.data?.content || (isUsingAssetBackground && currentAssetBackground?.data?.content)) {
              return 'cover';
            }
            // 处理格子背景的大小
            if (previewAsset) {
              if (previewAsset.data?.type === 'grid' && previewAsset.data?.size) {
                return `${previewAsset.data.size} ${previewAsset.data.size}`;
              }
              return undefined;
            }
            if (isUsingAssetBackground && currentAssetBackground) {
              if (currentAssetBackground.data?.type === 'grid' && currentAssetBackground.data?.size) {
                return `${currentAssetBackground.data.size} ${currentAssetBackground.data.size}`;
              }
              return undefined;
            }
            return undefined;
          })(),
          backgroundRepeat: (() => {
            // 处理用户上传的图片背景：不重复
            if (previewAsset?.data?.content || (isUsingAssetBackground && currentAssetBackground?.data?.content)) {
              return 'no-repeat';
            }
            return undefined;
          })(),
          backgroundPosition: (() => {
            // 处理用户上传的图片背景：居中
            if (previewAsset?.data?.content || (isUsingAssetBackground && currentAssetBackground?.data?.content)) {
              return 'center';
            }
            return undefined;
          })()
        }}
      >
        <CanvasRenderer
          nodes={nodes}
          zoom={focusState.isFocusMode ? focusState.focusZoomLevel : zoom}
          pan={focusState.isFocusMode ? focusState.focusPan : pan}
          onPanChange={handlePanChange}
          selectedNode={null}
          onCanvasClick={handleCanvasClick}
          onNodeSelect={() => handleNodeSelect()}
          expandedNodes={expandedNodes}
          onNodeExpand={handleNodeExpand}
          onNodeMove={() => {}}
          onNodeMenu={() => {}}
          hiddenLevels={hiddenLevels}
          bubbleInfo={bubbleInfo}
          onBubbleInfoChange={setBubbleInfo}
          showGrid={showGrid}
          showAnimation={showAnimation && !isInteracting}
          readOnly={true}
          onNodeFocus={handleNodeFocus}
          focusState={focusState}
          parentMap={parentMap}
          onFocusContentCardPosition={setFocusContentCardPosition}
          currentAssetAnimation={previewAsset?.type === 'animation' ? previewAsset : currentAssetAnimation}
          animationVersion={animationVersion}
          isAnimationPaused={isAnimationPaused}
        />

        {bubbleInfo && (
          <NodeCard
            node={nodes.find(n => n.id === bubbleInfo.nodeId)!}
            position={bubbleInfo.position}
            direction={bubbleInfo.direction}
            zoom={zoom}
            pan={pan}
            canvasContainerRef={canvasContainerRef}
            onSummaryChange={() => {}}
            onContentChange={() => {}}
            onGenerateSummary={async () => {}}
            isGenerating={false}
            onClose={() => setBubbleInfo(null)}
            readOnly={true}
          />
        )}

        {focusState.isFocusMode && focusState.focusedNode && (
          <FocusContentCard
            node={nodes.find(n => n.id === focusState.focusedNode)!}
            nodes={nodes}
            zoom={focusState.focusZoomLevel}
            pan={focusState.focusPan}
            canvasContainerRef={canvasContainerRef}
            contentCardPosition={focusContentCardPosition}
          />
        )}

        <div className="absolute top-4 left-4 w-48 h-32 bg-card border-2 border-primary/20 rounded-2xl shadow-ocean overflow-hidden">
          <MiniMap
            nodes={nodes}
            zoom={zoom}
            pan={pan}
            onPanChange={handlePanChange}
            onZoomChange={handleZoomChange}
            expandedNodes={expandedNodes}
            hiddenLevels={hiddenLevels}
            canvasSize={canvasSize}
          />
        </div>

        {/* 保存背景颜色提示对话框 */}
        <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <DialogContent className="w-[300px] min-h-[150px]">
            <DialogHeader>
              <DialogTitle>保存更改</DialogTitle>
              <DialogDescription>
                您有未保存的更改，是否要保存？
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex justify-between">
              <Button variant="outline" onClick={() => {
                setShowSaveDialog(false);
                if (savePurpose === 'edit') {
                  onEdit();
                } else {
                  onBack();
                }
              }}>
                不保存
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                  取消
                </Button>
                <Button onClick={async () => {
                  await saveCanvasBackground();
                  setShowSaveDialog(false);
                  if (savePurpose === 'edit') {
                    onEdit();
                  } else {
                    onBack();
                  }
                }}>
                  {savePurpose === 'edit' ? '保存并编辑' : '保存并返回'}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 素材选择弹窗 */}
        <AssetSelectorDialog
          isOpen={isAssetDialogOpen}
          onClose={handleAssetDialogClose}
          title="选择在素材中心收藏的预览素材"
          assetTypes={['background', 'animation']}
          onSelectAsset={handleAssetSelect}
          onPreviewAsset={handleAssetPreview}
          showConfirmButton={true}
          currentAssetBackground={currentAssetBackground}
          currentAssetAnimation={currentAssetAnimation}
        />
      </div>
    </div>
  );
}
