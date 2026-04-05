import React, { useEffect, useRef, useState } from 'react';
import { MindMapNode } from '../../models/Work';
import { Square, Circle, Diamond, Palette, X, SlidersHorizontal, Spline, AudioWaveform, BookOpen, Text, Bold, Italic, Underline, Undo, RefreshCw, Plus, List, ListOrdered, Heading1, Heading2, Image as ImageIcon, Heart, Type } from 'lucide-react';
import { Asset, assetService } from '../../services/assets/AssetService';
import { AssetSelectorDialog } from '../assets/AssetSelectorDialog';

import {
  Slider,
} from '../ui/slider';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../ui/tabs';
import {
  Input,
} from '../ui/input';
import {
  Textarea,
} from '../ui/textarea';
import {
  Label,
} from '../ui/label';
import {
  Button,
} from '../ui/button';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';


interface StylePanelProps {
  selectedNodes: string[];
  nodes: MindMapNode[];
  customColors: string[];
  onCustomColorsChange: (colors: string[]) => void;
  onStyleChange: (nodeIds: string[], style: {
    shape?: string;
    shapeAssetId?: string;
    color?: string;
    fontSize?: number;
    fontWeight?: 'normal' | 'bold';
    fontStyle?: 'normal' | 'italic';
    textDecoration?: 'none' | 'underline';
    fontFamily?: string;
    icon?: string;
    connectionType?: string;
    connectorAssetId?: string;
    fontStyleAssetId?: string;
    size?: number;
  }) => void;
  onTextChange: (nodeId: string, text: string) => void;
  onContentChange: (nodeId: string, content: string) => void;
  isOpen: boolean;
  onClose: () => void;
  canvasWidth?: number;
  zoom?: number;
  pan?: { x: number; y: number };
  canvasContainerRef?: React.RefObject<HTMLDivElement>;
}

const COLORS = [
  '#14B8A6', // 青绿色
  '#0EA5E9', // 蓝色
  '#3B82F6', // 蓝色
  '#8B5CF6', // 紫色
  '#EC4899', // 粉色
  '#F43F5E', // 红色
  '#EAB308', // 黄色
  '#22C55E', // 绿色
  '#64748B', // 灰色
];

const SHAPES = [
  { value: 'rounded', label: '圆角矩形', icon: Square },
  { value: 'rectangle', label: '矩形', icon: Square },
  { value: 'circle', label: '圆形', icon: Circle },
  { value: 'diamond', label: '菱形', icon: Diamond },
];

const CONNECTION_TYPES = [
  { value: 'straight', label: '直线', icon: 'straight' },
  { value: 'dashed', label: '虚线', icon: 'dashed' },
  { value: 'curved', label: '曲线', icon: 'curve' },
  { value: 'wavy', label: '波浪线', icon: 'wavy' },
];







export const StylePanel: React.FC<StylePanelProps> = ({
  selectedNodes,
  nodes,
  customColors,
  onCustomColorsChange,
  onStyleChange,
  onTextChange,
  onContentChange,
  isOpen,
  onClose,
  zoom = 1,
  pan = { x: 0, y: 0 },
  canvasContainerRef,
}) => {
  // 收藏素材状态
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  // 素材选择弹窗状态
  const [isIconSelectorOpen, setIsIconSelectorOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [panelPositionState, setPanelPositionState] = useState<Record<string, string>>({});
  const [isColorReplaceDialogOpen, setIsColorReplaceDialogOpen] = useState(false);
  const [pendingColor, setPendingColor] = useState<string>('');
  const [selectedColorToReplace, setSelectedColorToReplace] = useState<number>(0);
  const longPressTimer = useRef<number | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  // 撤销和恢复功能相关状态
  const [initialContent, setInitialContent] = useState<string>('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const historyRef = useRef({ history, historyIndex, initialContent });

  // 同步状态到ref
  useEffect(() => {
    historyRef.current = { history, historyIndex, initialContent };
  }, [history, historyIndex, initialContent]);

  useEffect(() => {
    if (isOpen) {
      const handleClickOutside = (event: MouseEvent) => {
        // 如果对话框打开，不检查点击外部
        if (isColorReplaceDialogOpen || isIconSelectorOpen) {
          return;
        }
        if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
          onClose();
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose, isColorReplaceDialogOpen, isIconSelectorOpen]);

  // 当面板打开时初始化面板位置状态
  useEffect(() => {
    if (isOpen && Object.keys(panelPositionState).length === 0) {
      setPanelPositionState(calculatePanelPosition());
    }
  }, [isOpen, canvasContainerRef]);

  // 当面板关闭时重置位置状态
  useEffect(() => {
    if (!isOpen) {
      setPanelPositionState({});
    }
  }, [isOpen]);

  // 当面板打开时初始化初始内容和历史记录
  useEffect(() => {
    if (isOpen && selectedNodes.length > 0) {
      const referenceNode = nodes.find((node) => node.id === selectedNodes[0]);
      if (referenceNode) {
        const content = referenceNode.content || '';
        setInitialContent(content);
        setHistory([content]);
        setHistoryIndex(0);
      }
    }
  }, [isOpen, selectedNodes[0]]);



  // 加载收藏的素材
  useEffect(() => {
    if (isOpen) {
      const favorites = assetService.loadFavoriteAssets();
      const assets = favorites.filter((asset: Asset) => 
        ['shape', 'connector', 'fontStyle'].includes(asset.type)
      );
      setFilteredAssets(assets);
    }
  }, [isOpen]);

  // 处理鼠标按下事件（长按开始拖动）
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // 只处理左键点击（0）
    if (e.button !== 0) return;
    
    // 检查点击是否在输入框或其他交互元素上
    const target = e.target as HTMLElement;
    const isInteractiveElement = target.tagName === 'INPUT' || 
                                target.tagName === 'BUTTON' || 
                                target.tagName === 'SELECT' || 
                                target.tagName === 'TEXTAREA' || 
                                target.isContentEditable ||
                                target.classList.contains('cursor-pointer');
    
    if (isInteractiveElement) {
      // 如果点击在交互元素上，不开始拖动
      return;
    }
    
    // 防止拖动过程中选择文本
    e.preventDefault();
    
    // 设置长按定时器以开始拖动
    const timer = window.setTimeout(() => {
      setIsDragging(true);
      draggingRef.current = true;
      
      // 计算鼠标到面板原点的偏移量
      if (panelRef.current) {
        const rect = panelRef.current.getBoundingClientRect();
        dragOffset.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
        
        // 添加全局鼠标移动和释放监听器
        document.addEventListener('mousemove', handleGlobalMouseMove);
        document.addEventListener('mouseup', handleGlobalMouseUp);
      }
      
      // 在拖动过程中全局禁用文本选择
      document.body.style.userSelect = 'none';
    }, 500); // 500ms长按
    
    longPressTimer.current = timer;
  };

  // 处理全局鼠标移动事件（拖动过程中）
  const handleGlobalMouseMove = (e: MouseEvent) => {
    if (!draggingRef.current || !panelRef.current) return;
    
    // 防止拖动过程中选择文本
    e.preventDefault();
    
    // 取消之前的动画帧以避免累积
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    
    // 使用requestAnimationFrame实现更平滑的拖动
    rafRef.current = requestAnimationFrame(() => {
      if (!panelRef.current) return;
      
      // 计算新位置
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;
      
      // 直接操作DOM以获得即时响应
      panelRef.current.style.left = `${newX}px`;
      panelRef.current.style.top = `${newY}px`;
      panelRef.current.style.right = 'auto';
      panelRef.current.style.bottom = 'auto';
      
      // 更新状态以保持一致性（但DOM已经更新）
      setPanelPositionState({
        left: `${newX}px`,
        top: `${newY}px`
      });
    });
  };

  // 处理全局鼠标释放事件（结束拖动）
  const handleGlobalMouseUp = () => {
    // 如果存在长按定时器则清除
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    // 取消任何待处理的动画帧
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    
    // 移除全局事件监听器
    document.removeEventListener('mousemove', handleGlobalMouseMove);
    document.removeEventListener('mouseup', handleGlobalMouseUp);
    
    // 重新启用文本选择
    document.body.style.userSelect = '';
    
    // 重置拖动状态
    draggingRef.current = false;
    setIsDragging(false);
  };

  // 处理鼠标移动事件（为了兼容性）
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      // 防止拖动过程中选择文本
      e.preventDefault();
    }
  };

  if (!isOpen || selectedNodes.length === 0) return null;

  // 获取第一个选中的节点作为参考
  const referenceNode = nodes.find((node) => node.id === selectedNodes[0]);
  if (!referenceNode) return null;

  // 计算样式面板的宽度和高度以避免滚动
  const panelWidth = 560; // 增加宽度以容纳素材标签页
  const panelHeight = Math.min(800, window.innerHeight - 100); // 增加高度

  // 计算节点在屏幕上的位置
  const getNodeScreenPosition = (node: MindMapNode) => {
    if (!canvasContainerRef?.current) {
      return { x: 0, y: 0 };
    }
    
    const containerRect = canvasContainerRef.current.getBoundingClientRect();
    const nodeScreenX = containerRect.left + pan.x + node.x * zoom;
    const nodeScreenY = containerRect.top + pan.y + node.y * zoom;
    
    return { x: nodeScreenX, y: nodeScreenY };
  };

  // 计算面板位置以避免与选中的节点重叠并保持在画布内
  const calculatePanelPosition = () => {
    if (!canvasContainerRef?.current) {
      return {
        right: '4rem',
        top: '5rem'
      };
    }
    
    const containerRect = canvasContainerRef.current.getBoundingClientRect();
    const nodePos = getNodeScreenPosition(referenceNode);
    const nodeWidth = 150 * zoom; // 估计节点宽度
    const nodeHeight = 60 * zoom; // 估计节点高度
    
    // 默认位置：画布右侧，顶部固定
    const position: Record<string, string> = {
      right: '4rem',
      top: '5rem'
    };
    
    // 检查默认位置是否与节点重叠
    let panelLeft = window.innerWidth - parseInt(position.right) - panelWidth;
    let panelTop = parseInt(position.top);
    
    const nodeRight = nodePos.x + nodeWidth;
    const nodeBottom = nodePos.y + nodeHeight;
    
    // 检查是否重叠
    const isOverlapping = (
      panelLeft < nodeRight &&
      panelLeft + panelWidth > nodePos.x &&
      panelTop < nodeBottom &&
      panelTop + panelHeight > nodePos.y
    );
    
    if (isOverlapping) {
      // 清除之前的位置
      Object.keys(position).forEach(key => delete position[key]);
      
      // 尝试将面板放在画布左侧，保持顶部位置不变
      if (nodePos.x > panelWidth + 20 && containerRect.left + 20 + panelWidth < nodePos.x) {
        position.left = '4rem';
        position.top = '5rem';
        panelLeft = parseInt(position.left);
      }
      // 尝试将面板放在画布下方，保持顶部位置不变
      else if (nodePos.y + nodeHeight + panelHeight + 20 < containerRect.bottom) {
        position.right = '4rem';
        position.top = '5rem';
        panelTop = parseInt(position.top);
      }
      // 尝试将面板放在画布上方，保持顶部位置不变
      else if (nodePos.y - panelHeight - 20 > containerRect.top) {
        position.right = '4rem';
        position.top = '5rem';
        panelTop = parseInt(position.top);
      }
      //  fallback: 画布右侧，顶部固定
      else {
        position.right = '4rem';
        position.top = '5rem';
      }
    }
    
    // 确保面板保持在画布边界内
    const ensureWithinCanvas = () => {
      let adjustedPosition = { ...position };
      
      // 计算当前面板位置
      let currentLeft = window.innerWidth - (position.right ? parseInt(position.right) : 0) - panelWidth;
      if (position.left) {
        currentLeft = parseInt(position.left);
      }
      
      let currentTop = parseInt(position.top); // 始终使用top属性，保持顶部位置不变
      
      // 调整以保持在画布左侧边界内
      if (currentLeft < containerRect.left + 20) {
        Object.keys(adjustedPosition).forEach(key => {
          if (key === 'left' || key === 'right') {
            delete adjustedPosition[key];
          }
        });
        adjustedPosition.left = `${containerRect.left + 20}px`;
      }
      
      // 调整以保持在画布右侧边界内
      if (currentLeft + panelWidth > containerRect.right - 20) {
        Object.keys(adjustedPosition).forEach(key => {
          if (key === 'left' || key === 'right') {
            delete adjustedPosition[key];
          }
        });
        adjustedPosition.right = `${window.innerWidth - (containerRect.right - 20)}px`;
      }
      
      // 调整以保持在画布顶部边界内
      if (currentTop < containerRect.top + 20) {
        adjustedPosition.top = `${containerRect.top + 20}px`;
      }
      
      // 调整以保持在画布底部边界内 - 只调整高度，不改变顶部位置
      // 这里我们不使用bottom属性，而是通过限制最大高度来确保面板不超出画布
      
      return adjustedPosition;
    };
    
    return ensureWithinCanvas();
  };

  // 计算初始面板位置（用于状态初始化）
  // const panelPosition = calculatePanelPosition(); // 不直接使用，但函数在useEffect中被调用

  const handleShapeChange = (shape: 'rectangle' | 'rounded' | 'circle' | 'diamond') => {
    onStyleChange(selectedNodes, { shape, shapeAssetId: undefined });
  };

  const handleColorChange = (color: string) => {
    onStyleChange(selectedNodes, { color });
  };

  const handleFontSizeChange = (fontSize: number[]) => {
    onStyleChange(selectedNodes, { fontSize: fontSize[0] });
  };

  const handleConnectionChange = (connectionType: 'straight' | 'curved' | 'dashed' | 'wavy') => {
    onStyleChange(selectedNodes, { connectionType, connectorAssetId: undefined });
  };

  const handleFontWeightChange = (fontWeight: 'normal' | 'bold') => {
    onStyleChange(selectedNodes, { fontWeight });
  };

  const handleFontStyleChange = (fontStyle: 'normal' | 'italic') => {
    onStyleChange(selectedNodes, { fontStyle });
  };

  const handleTextDecorationChange = (textDecoration: 'none' | 'underline') => {
    onStyleChange(selectedNodes, { textDecoration });
  };

  const handleResetFontStyle = () => {
    onStyleChange(selectedNodes, {
      fontSize: undefined,
      fontWeight: undefined,
      fontStyle: undefined,
      textDecoration: undefined,
      fontStyleAssetId: undefined
    });
  };

  // 文本格式处理函数
  const applyFormat = (formatType: string) => {
    if (!referenceNode) return;
    
    const content = referenceNode.content || '';
    let newContent = content;
    
    // 尝试获取Textarea元素以获取光标位置
    const textarea = contentTextareaRef.current;
    
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      if (start !== end) {
        // 处理选中文本
        const selectedText = content.substring(start, end);
        const selectedLines = selectedText.split('\n');
        
        // 处理标题和列表格式
        if (['heading1', 'heading2', 'bulletList', 'numberedList'].includes(formatType)) {
          let modifiedLines: string[] = [];
          
          selectedLines.forEach((line, index) => {
            let modifiedLine = line;
            switch (formatType) {
              case 'heading1':
                // 移除可能存在的现有标题标记
                modifiedLine = line.replace(/^#{1,6}\s*/, '');
                modifiedLine = `# ${modifiedLine}`;
                break;
              case 'heading2':
                // 移除可能存在的现有标题标记
                modifiedLine = line.replace(/^#{1,6}\s*/, '');
                modifiedLine = `## ${modifiedLine}`;
                break;
              case 'bulletList':
                // 移除可能存在的现有列表标记
                modifiedLine = line.replace(/^([-*+]|\d+\.)\s*/, '');
                modifiedLine = `- ${modifiedLine}`;
                break;
              case 'numberedList':
                // 移除可能存在的现有列表标记
                modifiedLine = line.replace(/^([-*+]|\d+\.)\s*/, '');
                modifiedLine = `${index + 1}. ${modifiedLine}`;
                break;
              default:
                break;
            }
            modifiedLines.push(modifiedLine);
          });
          
          const modifiedText = modifiedLines.join('\n');
          newContent = content.substring(0, start) + modifiedText + content.substring(end);
        } else {
          // 处理粗体、斜体、下划线
          switch (formatType) {
            case 'bold':
              newContent = content.substring(0, start) + `**${selectedText}**` + content.substring(end);
              break;
            case 'italic':
              newContent = content.substring(0, start) + `*${selectedText}*` + content.substring(end);
              break;
            case 'underline':
              newContent = content.substring(0, start) + `__${selectedText}__` + content.substring(end);
              break;
            default:
              break;
          }
        }
      } else {
        // 处理光标位置
        // 计算当前光标所在的行
        const lines = content.substring(0, start).split('\n');
        const currentLineStart = lines.slice(0, -1).reduce((acc, line) => acc + line.length + 1, 0);
        const currentLineEnd = content.indexOf('\n', start) === -1 ? content.length : content.indexOf('\n', start);
        const currentLine = content.substring(currentLineStart, currentLineEnd);
        
        // 根据格式类型处理当前行
        let modifiedLine = currentLine;
        switch (formatType) {
          case 'heading1':
            // 移除可能存在的现有标题标记
            modifiedLine = currentLine.replace(/^#{1,6}\s*/, '');
            modifiedLine = `# ${modifiedLine}`;
            break;
          case 'heading2':
            // 移除可能存在的现有标题标记
            modifiedLine = currentLine.replace(/^#{1,6}\s*/, '');
            modifiedLine = `## ${modifiedLine}`;
            break;
          case 'bulletList':
            // 移除可能存在的现有列表标记
            modifiedLine = currentLine.replace(/^([-*+]|\d+\.)\s*/, '');
            modifiedLine = `- ${modifiedLine}`;
            break;
          case 'numberedList':
            // 移除可能存在的现有列表标记
            modifiedLine = currentLine.replace(/^([-*+]|\d+\.)\s*/, '');
            modifiedLine = `1. ${modifiedLine}`;
            break;
          case 'bold':
            // 在光标位置插入粗体标记
            newContent = content.substring(0, start) + '****' + content.substring(start);
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = start + 2;
            }, 0);
            break;
          case 'italic':
            // 在光标位置插入斜体标记
            newContent = content.substring(0, start) + '**' + content.substring(start);
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = start + 1;
            }, 0);
            break;
          case 'underline':
            // 在光标位置插入下划线标记
            newContent = content.substring(0, start) + '____' + content.substring(start);
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = start + 2;
            }, 0);
            break;
          default:
            break;
        }
        
        // 如果是标题或列表格式，替换当前行
        if (['heading1', 'heading2', 'bulletList', 'numberedList'].includes(formatType)) {
          newContent = content.substring(0, currentLineStart) + modifiedLine + content.substring(currentLineEnd);
        }
      }
    } else {
      // 如果无法获取Textarea元素，使用简化处理
      switch (formatType) {
        case 'heading1':
          newContent = `# ${content}`;
          break;
        case 'heading2':
          newContent = `## ${content}`;
          break;
        case 'bulletList':
          newContent = content.split('\n').map(line => `- ${line}`).join('\n');
          break;
        case 'numberedList':
          newContent = content.split('\n').map((line, index) => `${index + 1}. ${line}`).join('\n');
          break;
        case 'bold':
          newContent = `**${content}**`;
          break;
        case 'italic':
          newContent = `*${content}*`;
          break;
        case 'underline':
          newContent = `__${content}__`;
          break;
        default:
          break;
      }
    }
    
    // 更新历史记录
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newContent);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
    
    onContentChange(referenceNode.id, newContent);
  };

  // 撤销功能
  const handleUndo = () => {
    if (!referenceNode || historyRef.current.historyIndex <= 0) return;
    
    // 撤销到上一个历史记录
    const previousIndex = historyRef.current.historyIndex - 1;
    const previousContent = historyRef.current.history[previousIndex];
    setHistoryIndex(previousIndex);
    onContentChange(referenceNode.id, previousContent);
  };

  // 恢复功能（恢复到初始内容）
  const handleReset = () => {
    if (!referenceNode) return;
    const content = historyRef.current.initialContent;
    setHistory([content]);
    setHistoryIndex(0);
    onContentChange(referenceNode.id, content);
  };

  const handleAddCustomColor = () => {
    const currentColor = referenceNode.color;
    // 检查颜色是否已经在预设颜色中
    if (!COLORS.includes(currentColor)) {
      // 检查颜色是否已经在自定义颜色中
      if (!customColors.includes(currentColor)) {
        // 限制自定义颜色数量为8个
        if (customColors.length >= 8) {
          // 打开对话框让用户选择
          setPendingColor(currentColor);
          setSelectedColorToReplace(0);
          setIsColorReplaceDialogOpen(true);
        } else {
          // 添加新颜色
          const newCustomColors = [...customColors, currentColor];
          onCustomColorsChange(newCustomColors);
        }
      }
    }
  };

  const handleConfirmReplaceColor = () => {
    const newCustomColors = [...customColors];
    newCustomColors[selectedColorToReplace] = pendingColor;
    onCustomColorsChange(newCustomColors);
    setIsColorReplaceDialogOpen(false);
    setPendingColor('');
  };

  const handleCancelReplaceColor = () => {
    setIsColorReplaceDialogOpen(false);
    setPendingColor('');
  };

  // 处理面板上的鼠标释放事件
  const handleMouseUp = () => {
    // 如果存在长按定时器则清除
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // 处理素材选择
  const handleAssetSelect = (asset: Asset) => {
    switch (asset.type) {
      case 'icon':
        onStyleChange(selectedNodes, { icon: asset.data?.lucideName || asset.id });
        break;
      case 'shape':
        // 保存素材ID和类型，支持动态渲染
        const shapeType = asset.data?.type || 'rounded';
        onStyleChange(selectedNodes, { 
          shape: shapeType,
          shapeAssetId: asset.id // 保存素材ID用于动态渲染
        });
        break;
      case 'connector':
        // 保存素材ID和类型，支持动态渲染
        const connectorType = asset.data?.type || 'curved';
        onStyleChange(selectedNodes, { 
          connectionType: connectorType,
          connectorAssetId: asset.id // 保存素材ID用于动态渲染
        });
        break;
      case 'fontStyle':
        onStyleChange(selectedNodes, {
          fontWeight: asset.data?.fontWeight as 'normal' | 'bold' | undefined,
          fontStyle: asset.data?.fontStyle as 'normal' | 'italic' | undefined,
          textDecoration: asset.data?.textDecoration as 'none' | 'underline' | undefined,
          fontFamily: asset.data?.fontFamily,
          fontStyleAssetId: asset.id // 保存素材ID用于标识选中状态
        });
        break;
    }
  };

  // 处理图标选择并插入
  const handleIconSelect = (asset: Asset | null, size: 'small' | 'large') => {
    if (asset && asset.type === 'icon' && referenceNode) {
      let content = referenceNode.content || '';
      
      // 根据大小生成不同格式的图标
      // 小图标：:icon-{name}:
      // 大图标：:icon-{name}-large:
      // 从 asset.id (如 'icon-lightbulb') 提取名称部分 (如 'lightbulb')
      let iconName;
      if (asset.data?.lucideName) {
        // 如果有 lucideName，使用它（来自图标组合的图标）
        iconName = asset.data.lucideName;
      } else {
        // 否则从 asset.id 提取（普通图标）
        iconName = asset.id.replace(/^icon-/, '');
      }
      
      // 转换为小写并替换驼峰命名为连字符
      const normalizedIconName = iconName
        .replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2')
        .toLowerCase();
      
      const iconFormat = size === 'small' ? `:icon-${normalizedIconName}:` : `:icon-${normalizedIconName}-large:`;
      
      let newContent;
      let cursorPosition: number;
      
      // 尝试获取Textarea元素以获取光标位置
      const textarea = contentTextareaRef.current;
      
      if (size === 'large') {
        // 大图标：先移除已有的大图标，然后插入在最后一行的下一行
        let contentWithoutLargeIcon = content.replace(/:icon-[\w-]+?-large:/g, '');
        
        // 确保内容末尾有一个换行
        if (contentWithoutLargeIcon && !contentWithoutLargeIcon.endsWith('\n')) {
          contentWithoutLargeIcon += '\n';
        }
        
        newContent = contentWithoutLargeIcon + iconFormat;
        cursorPosition = newContent.length;
      } else {
        // 小图标：在光标位置插入
        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          
          // 在光标位置插入图标
          newContent = content.substring(0, start) + iconFormat + content.substring(end);
          cursorPosition = start + iconFormat.length;
        } else {
          // 如果没有获取到textarea，则追加到末尾
          newContent = content + iconFormat;
          cursorPosition = newContent.length;
        }
      }
      
      // 更新内容
      onContentChange(referenceNode.id, newContent);
      
      // 更新历史记录
      setHistory(prev => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push(newContent);
        return newHistory;
      });
      setHistoryIndex(prev => prev + 1);
      
      // 关闭弹窗
      setIsIconSelectorOpen(false);
      
      // 聚焦到文本框并设置光标位置
      if (textarea) {
        setTimeout(() => {
          textarea.focus();
          textarea.selectionStart = textarea.selectionEnd = cursorPosition;
        }, 0);
      }
    }
  };

  return (
    <div 
      ref={panelRef}
      className={`fixed bg-card border border-primary/20 rounded-2xl shadow-lg p-5 z-60 overflow-x-auto overflow-y-auto ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        width: `${panelWidth}px`,
        minHeight: '500px',
        maxHeight: 'calc(100vh - 120px)',
        ...panelPositionState,
        willChange: 'transform, left, top'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="flex flex-col h-full">
        {/* 标题栏 */}
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-primary/10">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">样式面板</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 rounded-full hover:bg-primary/10">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* 标签页 */}
        <div className="flex-1 flex overflow-x-auto">
          <Tabs defaultValue="shape" className="w-full flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <TabsList className="flex-1 flex gap-1 bg-muted/50 rounded-xl p-1 overflow-x-auto h-12 justify-center">
                <TabsTrigger value="shape" className="rounded-lg flex items-center gap-2 h-10 transition-all whitespace-nowrap hover:bg-primary/10 px-3">
                  <Square className="w-4 h-4" />
                  <span>形状</span>
                </TabsTrigger>
                <TabsTrigger value="connection" className="rounded-lg flex items-center gap-2 h-10 transition-all whitespace-nowrap hover:bg-primary/10 px-3">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                  <span>连接线</span>
                </TabsTrigger>
                <TabsTrigger value="color" className="rounded-lg flex items-center gap-2 h-10 transition-all whitespace-nowrap hover:bg-primary/10 px-3">
                  <Palette className="w-4 h-4" />
                  <span>颜色</span>
                </TabsTrigger>
                <TabsTrigger value="title" className="rounded-lg flex items-center gap-2 h-10 transition-all whitespace-nowrap hover:bg-primary/10 px-3">
                  <Text className="w-4 h-4" />
                  <span>标题</span>
                </TabsTrigger>
                <TabsTrigger value="content" className="rounded-lg flex items-center gap-2 h-10 transition-all whitespace-nowrap hover:bg-primary/10 px-3">
                  <BookOpen className="w-4 h-4" />
                  <span>内容</span>
                </TabsTrigger>
                <TabsTrigger value="assets" className="rounded-lg flex items-center gap-2 h-10 transition-all whitespace-nowrap hover:bg-primary/10 px-3">
                  <Heart className="w-4 h-4" />
                  <span>素材</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="shape" className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 gap-4 w-full">
                <Card className="border border-primary/10 shadow-sm w-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">节点形状</CardTitle>
                    <CardDescription className="text-xs">选择节点的基本形状</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {SHAPES.map((shape) => {
                        const IconComponent = shape.icon;
                        return (
                          <Button
                            key={shape.value}
                            variant={referenceNode.shape === shape.value ? 'default' : 'outline'}
                            className="justify-start h-12 rounded-lg transition-all"
                            onClick={() => handleShapeChange(shape.value as any)}
                          >
                            <IconComponent className="w-5 h-5 mr-2" />
                            {shape.label}
                          </Button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border border-primary/10 shadow-sm w-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">形状大小</CardTitle>
                    <CardDescription className="text-xs">调整节点的大小</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label className="text-sm">节点宽度</Label>
                          <span className="text-xs font-medium text-muted-foreground">{referenceNode.size || 100}%</span>
                        </div>
                        <Slider
                          value={[referenceNode.size || 100]}
                          min={75}
                          max={275}
                          step={5}
                          onValueChange={(value) => onStyleChange(selectedNodes, { size: value[0] })}
                          className="pt-2"
                        />
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          variant={referenceNode.size === 75 ? "default" : "outline"}
                          size="sm"
                          onClick={() => onStyleChange(selectedNodes, { size: 75 })}
                          className="h-8"
                        >
                          小
                        </Button>
                        <Button
                          variant={(referenceNode.size === 100 || referenceNode.size === undefined) ? "default" : "outline"}
                          size="sm"
                          onClick={() => onStyleChange(selectedNodes, { size: 100 })}
                          className="h-8"
                        >
                          中
                        </Button>
                        <Button
                          variant={referenceNode.size === 200 ? "default" : "outline"}
                          size="sm"
                          onClick={() => onStyleChange(selectedNodes, { size: 200 })}
                          className="h-8"
                        >
                          大
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="connection" className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 gap-4 w-full">
                <Card className="border border-primary/10 shadow-sm w-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">连接线形式</CardTitle>
                    <CardDescription className="text-xs">选择节点之间连接线的样式</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-3">
                      {CONNECTION_TYPES.map((connection) => (
                        <Button
                          key={connection.value}
                          variant={((referenceNode.connectionType === connection.value) || (referenceNode.connectionType === undefined && connection.value === 'curved')) ? 'default' : 'outline'}
                          className="justify-start h-12 rounded-lg transition-all"
                          onClick={() => handleConnectionChange(connection.value as any)}
                        >
                            {connection.value === 'straight' && (
                              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 12h16" />
                              </svg>
                            )}
                            {connection.value === 'dashed' && (
                              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5">
                                <path d="M2 12h20" />
                              </svg>
                            )}
                            {connection.value === 'curved' && (
                              <Spline className="w-5 h-5 mr-2" />
                            )}
                            {connection.value === 'wavy' && (
                              <AudioWaveform className="w-5 h-5 mr-2" />
                            )}
                          {connection.label}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="color" className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 gap-4 w-full">
                <Card className="border border-primary/10 shadow-sm w-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">节点颜色</CardTitle>
                    <CardDescription className="text-xs">选择节点的背景颜色</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3 mb-8">
                      {COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`w-10 h-10 rounded-full border-2 transition-all flex-shrink-0 ${referenceNode.color === color ? 'border-primary ring-2 ring-primary/30 scale-110' : 'border-transparent hover:border-border hover:scale-105'}`}
                          style={{ backgroundColor: color }}
                          onClick={() => handleColorChange(color)}
                          aria-label={`选择颜色 ${color}`}
                        />
                      ))}
                      {/* 自定义颜色 */}
                      {customColors.map((color) => (
                        <button
                          key={`custom-${color}`}
                          type="button"
                          className={`w-10 h-10 rounded-full border-2 transition-all flex-shrink-0 ${referenceNode.color === color ? 'border-primary ring-2 ring-primary/30 scale-110' : 'border-transparent hover:border-border hover:scale-105'}`}
                          style={{ backgroundColor: color }}
                          onClick={() => handleColorChange(color)}
                          aria-label={`选择自定义颜色 ${color}`}
                        />
                      ))}
                      {/* 添加自定义颜色按钮 */}
                      <button
                        type="button"
                        className="w-10 h-10 rounded-full border-2 border-dashed border-border transition-all flex-shrink-0 hover:border-primary hover:scale-105 flex items-center justify-center"
                        onClick={handleAddCustomColor}
                        aria-label="添加自定义颜色"
                      >
                        <Plus className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>

                    <div className="space-y-3 pt-6">
                      <Label className="text-sm font-medium">自定义颜色</Label>
                      <div className="flex gap-3">
                        <div className="w-16 h-16 border-2 rounded-lg overflow-hidden flex items-center justify-center">
                          <input
                            type="color"
                            value={referenceNode.color}
                            onChange={(e) => handleColorChange(e.target.value)}
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
                          value={referenceNode.color}
                          onChange={(e) => handleColorChange(e.target.value)}
                          className="flex-1 rounded-lg border-2"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

        
              </div>
            </TabsContent>

            <TabsContent value="title" className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 gap-4 w-full">
                <Card className="border border-primary/10 shadow-sm w-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">标题内容</CardTitle>
                    <CardDescription className="text-xs">修改节点的标题内容</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm">节点标题</Label>
                      <Input
                        value={referenceNode.title || ''}
                        onChange={(e) => onTextChange(referenceNode.id, e.target.value)}
                        className="rounded-lg border-2"
                        placeholder="输入节点标题"
                      />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border border-primary/10 shadow-sm w-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">字体设置</CardTitle>
                    <CardDescription className="text-xs">调整节点文本的样式</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm">字体大小</Label>
                        <span className="text-xs font-medium text-muted-foreground">{referenceNode.fontSize || 14}px</span>
                      </div>
                      <Slider
                        value={[referenceNode.fontSize || 14]}
                        min={8}
                        max={32}
                        step={1}
                        onValueChange={handleFontSizeChange}
                        className="pt-2"
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      <Button 
                        variant={referenceNode.fontWeight === 'bold' ? 'default' : 'outline'}
                        className="h-9 rounded-lg transition-all hover:bg-primary/10"
                        onClick={() => handleFontWeightChange(referenceNode.fontWeight === 'bold' ? 'normal' : 'bold')}
                      >
                        <Bold className="w-4 h-4 mr-2" />
                        粗体
                      </Button>
                      <Button 
                        variant={referenceNode.fontStyle === 'italic' ? 'default' : 'outline'}
                        className="h-9 rounded-lg transition-all hover:bg-primary/10"
                        onClick={() => handleFontStyleChange(referenceNode.fontStyle === 'italic' ? 'normal' : 'italic')}
                      >
                        <Italic className="w-4 h-4 mr-2" />
                        斜体
                      </Button>
                      <Button 
                        variant={referenceNode.textDecoration === 'underline' ? 'default' : 'outline'}
                        className="h-9 rounded-lg transition-all hover:bg-primary/10"
                        onClick={() => handleTextDecorationChange(referenceNode.textDecoration === 'underline' ? 'none' : 'underline')}
                      >
                        <Underline className="w-4 h-4 mr-2" />
                        下划线
                      </Button>
                      <Button 
                        variant={!referenceNode.fontStyleAssetId ? 'default' : 'outline'}
                        className="h-9 rounded-lg transition-all hover:bg-primary/10"
                        onClick={handleResetFontStyle}
                      >
                        <Type className="w-4 h-4 mr-2" />
                        默认字体
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="content" className="flex-1 overflow-y-auto">
              <div className="flex flex-col h-full">
                <Card className="border border-primary/10 shadow-sm w-full flex-grow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">节点内容</CardTitle>
                    <CardDescription className="text-xs">修改节点的详细内容</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-0 flex flex-col h-full">
                    <div className="flex-grow flex flex-col">
                      {/* 文字编辑工具栏 */}
                      <div className="flex gap-1 p-1 bg-muted/30 rounded-lg mb-0.5 justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded"
                          title="大标题"
                          onClick={() => applyFormat('heading1')}
                        >
                          <Heading1 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded"
                          title="小标题"
                          onClick={() => applyFormat('heading2')}
                        >
                          <Heading2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded"
                          title="项目符号"
                          onClick={() => applyFormat('bulletList')}
                        >
                          <List className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded"
                          title="编号列表"
                          onClick={() => applyFormat('numberedList')}
                        >
                          <ListOrdered className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded"
                          title="插入图标"
                          onClick={() => setIsIconSelectorOpen(true)}
                        >
                          <ImageIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded"
                          title="粗体"
                          onClick={() => applyFormat('bold')}
                        >
                          <Bold className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded"
                          title="斜体"
                          onClick={() => applyFormat('italic')}
                        >
                          <Italic className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded"
                          title="下划线"
                          onClick={() => applyFormat('underline')}
                        >
                          <Underline className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded"
                          title="撤销"
                          onClick={handleUndo}
                        >
                          <Undo className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded"
                          title="重置"
                          onClick={handleReset}
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </div>
                      {/* 内容输入框 */}
                      <div className="flex-grow">
                        <Textarea
                          ref={contentTextareaRef}
                          value={referenceNode.content || ''}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            const oldValue = referenceNode.content || '';
                            
                            // 检查是否是按下回车键（通过比较换行符数量）
                            const newLineCount = (newValue.match(/\n/g) || []).length;
                            const oldLineCount = (oldValue.match(/\n/g) || []).length;
                            
                            if (newLineCount > oldLineCount) {
                              // 确实是按下了回车键
                              const lines = newValue.split('\n');
                              const newLineIndex = lines.length - 1;
                              
                              // 确保新行存在且不为空
                              if (newLineIndex > 0 && lines[newLineIndex].trim() === '') {
                                const previousLine = lines[newLineIndex - 1].trim();
                                
                                // 检查前一行是否是列表项
                                const bulletListMatch = previousLine.match(/^[-*+]\s/);
                                const numberedListMatch = previousLine.match(/^\d+\.\s/);
                                
                                if (bulletListMatch) {
                                  // 保持项目符号列表格式
                                  lines[newLineIndex] = '- ';
                                  const updatedValue = lines.join('\n');
                                  // 更新历史记录
                                  setHistory(prev => {
                                    const newHistory = prev.slice(0, historyIndex + 1);
                                    newHistory.push(updatedValue);
                                    return newHistory;
                                  });
                                  setHistoryIndex(prev => prev + 1);
                                  onContentChange(referenceNode.id, updatedValue);
                                  return;
                                } else if (numberedListMatch) {
                                  // 保持编号列表格式，递增编号
                                  const currentNumber = parseInt(numberedListMatch[0]);
                                  lines[newLineIndex] = `${currentNumber + 1}. `;
                                  const updatedValue = lines.join('\n');
                                  // 更新历史记录
                                  setHistory(prev => {
                                    const newHistory = prev.slice(0, historyIndex + 1);
                                    newHistory.push(updatedValue);
                                    return newHistory;
                                  });
                                  setHistoryIndex(prev => prev + 1);
                                  onContentChange(referenceNode.id, updatedValue);
                                  return;
                                }
                              }
                            }
                            
                            // 其他情况，直接更新值
                            // 更新历史记录
                            setHistory(prev => {
                              const newHistory = prev.slice(0, historyIndex + 1);
                              newHistory.push(newValue);
                              return newHistory;
                            });
                            setHistoryIndex(prev => prev + 1);
                            onContentChange(referenceNode.id, newValue);
                          }}
                          className="rounded-lg border-2 w-full h-full resize-none"
                          placeholder="输入节点内容..."
                          style={{ minHeight: '300px' }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="assets" className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 gap-4 w-full">
                <Card className="border border-primary/10 shadow-sm w-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">收藏素材</CardTitle>
                    <CardDescription className="text-xs">选择已收藏的素材应用到节点</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* 形状 */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">形状</h4>
                        <div className="grid grid-cols-4 gap-2">
                          {filteredAssets
                            .filter(asset => asset.type === 'shape')
                            .map((asset) => {
                              const isSelected = referenceNode.shapeAssetId === asset.id;
                              return (
                                <button
                                  key={asset.id}
                                  onClick={() => handleAssetSelect(asset)}
                                  className={`p-2 border rounded-lg hover:border-primary transition-all flex flex-col items-center bg-card ${isSelected ? 'border-primary bg-primary/5' : ''}`}
                                >
                                  <img
                                    src={asset.thumbnail}
                                    alt={asset.name}
                                    className="w-8 h-8 mb-1"
                                  />
                                  <span className="text-xs text-center">{asset.name}</span>
                                </button>
                              );
                            })}
                        </div>
                      </div>

                      {/* 连接线 */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">连接线</h4>
                        <div className="grid grid-cols-4 gap-2">
                          {filteredAssets
                            .filter(asset => asset.type === 'connector')
                            .map((asset) => {
                              const isSelected = referenceNode.connectorAssetId === asset.id;
                              return (
                                <button
                                  key={asset.id}
                                  onClick={() => handleAssetSelect(asset)}
                                  className={`p-2 border rounded-lg hover:border-primary transition-all flex flex-col items-center bg-card ${isSelected ? 'border-primary bg-primary/5' : ''}`}
                                >
                                  <img
                                    src={asset.thumbnail}
                                    alt={asset.name}
                                    className="w-8 h-8 mb-1"
                                  />
                                  <span className="text-xs text-center">{asset.name}</span>
                                </button>
                              );
                            })}
                        </div>
                      </div>

                      {/* 字体样式 */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">字体样式</h4>
                        <div className="grid grid-cols-4 gap-2">
                          {filteredAssets
                            .filter(asset => asset.type === 'fontStyle')
                            .map((asset) => {
                              const isSelected = referenceNode.fontStyleAssetId === asset.id;
                              return (
                                <button
                                  key={asset.id}
                                  onClick={() => handleAssetSelect(asset)}
                                  className={`p-2 border rounded-lg hover:border-primary transition-all flex flex-col items-center bg-card ${isSelected ? 'border-primary bg-primary/5' : ''}`}
                                >
                                  <img
                                    src={asset.thumbnail}
                                    alt={asset.name}
                                    className="w-8 h-8 mb-1"
                                  />
                                  <span className="text-xs text-center">{asset.name}</span>
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

          </Tabs>
        </div>
      </div>

      {/* 多选信息 */}
      {selectedNodes.length > 1 && (
        <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/10">
          <p className="text-sm text-muted-foreground">
            正在编辑 <span className="font-semibold text-primary">{selectedNodes.length}</span> 个节点
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            修改将应用到所有选中的节点
          </p>
        </div>
      )}

      {/* 颜色替换对话框 */}
      <Dialog open={isColorReplaceDialogOpen} onOpenChange={setIsColorReplaceDialogOpen}>
        <DialogContent className="w-[260px]">
          <DialogHeader>
            <DialogTitle>自定义颜色已达上限</DialogTitle>
            <DialogDescription>
              最多支持8个自定义颜色的保存，请选择覆盖的颜色：
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex flex-wrap gap-3">
              {customColors.map((color, index) => (
                <button
                  key={index}
                  type="button"
                  className={`w-10 h-10 rounded-full border-2 transition-all flex-shrink-0 ${selectedColorToReplace === index ? 'border-primary ring-2 ring-primary/30 scale-110' : 'border-transparent hover:border-border hover:scale-105'}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColorToReplace(index)}
                  aria-label={`选择要覆盖的颜色 ${index + 1}`}
                />
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-primary flex-shrink-0" style={{ backgroundColor: pendingColor }} />
              <span className="text-sm text-muted-foreground">将被添加的新颜色</span>
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancelReplaceColor}>
              取消
            </Button>
            <Button onClick={handleConfirmReplaceColor}>
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 图标选择弹窗 */}
      <AssetSelectorDialog
        isOpen={isIconSelectorOpen}
        onClose={() => setIsIconSelectorOpen(false)}
        title="选择图标"
        assetTypes={['icon', 'iconSet']}
        onSelectAsset={handleIconSelect}
      />

    </div>
  );
};