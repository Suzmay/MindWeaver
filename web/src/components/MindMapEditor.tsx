import { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Minus,
  Download,
  ArrowLeft,
  Save,
  Share2,
  Undo,
  Redo,
  Layout,
  Layers,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { CanvasRenderer,
} from './canvas/CanvasRenderer';
import { MiniMap } from './canvas/MiniMap';
import { NodeOperations } from './editor/NodeOperations';
import { Connection } from './editor/ConnectionManager';
import { StylePanel } from './editor/StylePanel';
import { LayoutManager, LayoutMode, LayoutDirection } from './editor/LayoutManager';
import { HistoryManager, HistoryState } from '../services/history/HistoryManager';
import { MindMapNode, Work } from '../models/Work';

import { ContextMenu } from './editor/ContextMenu';
import { useStorage } from '../context/StorageContext';
import { UserPreferencesService } from '../services/storage/UserPreferencesService';
import { EncryptionService } from '../services/storage/encryption/EncryptionService';
import { KeyManager } from '../services/storage/encryption/KeyManager';

interface MindMapEditorProps {
  workId: string;
  onBack: () => void;
}

export function MindMapEditor({ workId, onBack }: MindMapEditorProps) {
  // 服务
  const storage = useStorage();
  const preferencesService = UserPreferencesService.getInstance();
  const encryptionService = EncryptionService.getInstance();
  const keyManager = KeyManager.getInstance();

  // 状态
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [work, setWork] = useState<Work | null>(null);
  const [nodes, setNodes] = useState<MindMapNode[]>([
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
      x: -200,
      y: -100,
      title: '分支一',
      summary: '分支一的摘要',
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
      x: 200,
      y: -100,
      title: '分支二',
      summary: '分支二的摘要',
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
      y: 150,
      title: '分支三',
      summary: '分支三的摘要',
      type: 'concept',
      shape: 'rounded',
      color: '#22D3EE',
      fontSize: 14,
      connectionType: 'curved',
      children: [],
      expanded: true,
      level: 1,
    },
  ]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [isStylePanelOpen, setIsStylePanelOpen] = useState(false);

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root', 'node1', 'node2', 'node3']));
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextMenuNodeId, setContextMenuNodeId] = useState<string | null>(null);
  const [currentLayout, setCurrentLayout] = useState<{ mode: LayoutMode; direction: LayoutDirection }>({
    mode: 'mindmap',
    direction: 'horizontal'
  });
  
  // 隐藏层级的状态
  const [hiddenLevels, setHiddenLevels] = useState<Set<number>>(new Set());
  
  // 画布大小的状态（用于迷你地图）
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  
  // 引用
  const autoSaveTimerRef = useRef<number | null>(null);

  // 监控节点变化并确保新节点在 expandedNodes 集合中
  useEffect(() => {
    // 查找不在 expandedNodes 中的新节点
    const nodesNotInExpanded = nodes.filter(node => !expandedNodes.has(node.id));
    if (nodesNotInExpanded.length > 0) {
      const newExpandedNodes = new Set(expandedNodes);
      nodesNotInExpanded.forEach(node => {
        if (node.id !== 'root') { // 根节点已经在集合中
          newExpandedNodes.add(node.id);
        }
      });
      setExpandedNodes(newExpandedNodes);
    }
  }, [nodes, expandedNodes]);

  // 初始化用户偏好设置并设置自动保存
  useEffect(() => {
    const initializePreferences = async () => {
      try {
        await preferencesService.initialize();
        setupAutoSave();
      } catch (error) {
        console.error('初始化偏好设置错误:', error);
      }
    };
    
    initializePreferences();
    
    // 组件卸载时的清理
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, []);

  // 加载作品数据
  useEffect(() => {
    const loadWorkData = async () => {
      try {
        const workDetails = await storage.getWork(workId);
        
        if (workDetails) {
          setWork(workDetails);
          
          // 检查是否存在加密数据并尝试解密
          let finalNodes = nodes; // 默认使用当前节点
          let hasSavedNodePositions = false;
          if (workDetails.encryptedData) {
            try {
              const key = keyManager.getKey();
              if (key) {
                const decryptedData = await encryptionService.decrypt(workDetails.encryptedData, key);
                
                if (decryptedData.nodes) {
                  finalNodes = decryptedData.nodes; // 使用解密后的节点
                  hasSavedNodePositions = true;
                }
              }
            } catch (decryptError) {
              console.error('解密数据失败:', decryptError);
            }
          }
          
          // 计算节点层级
          let nodesWithLevels = calculateNodeLevels(finalNodes);
          
          // 如果指定了布局且没有保存节点位置，则应用布局
          if (workDetails.layout && !hasSavedNodePositions) {
            setCurrentLayout({ 
              mode: workDetails.layout.mode as LayoutMode, 
              direction: workDetails.layout.direction as LayoutDirection 
            });
            // 直接应用布局，不触发未保存更改
            const layoutOptions = {
              mode: workDetails.layout.mode as LayoutMode,
              direction: workDetails.layout.direction as LayoutDirection,
              levelSpacing: 150,
              nodeSpacing: 80,
              centerX: 0,
              centerY: 0,
            };
            const newNodes = LayoutManager.applyLayout(nodesWithLevels, layoutOptions);
            // 布局应用后重新计算层级
            nodesWithLevels = calculateNodeLevels(newNodes);
            setNodes(nodesWithLevels);
            addHistoryState(nodesWithLevels, connections, `应用${getLayoutName(workDetails.layout.mode as LayoutMode)}布局`);
            // 这里不要设置 hasUnsavedChanges - 这只是初始加载
          } else {
            // 如果有保存的节点位置或没有布局设置，直接使用解密后的节点
            setNodes(nodesWithLevels);
          }
        }
        
        // 确保初始加载后没有未保存的更改
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error('加载作品数据时出错:', error);
      }
    };

    loadWorkData();
  }, [workId]);

  // 递归获取所有子节点 ID
  const getAllDescendantNodeIds = (nodeId: string): string[] => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !node.children || node.children.length === 0) {
      return [];
    }
    
    const descendants: string[] = [...node.children];
    node.children.forEach(childId => {
      descendants.push(...getAllDescendantNodeIds(childId));
    });
    
    return descendants;
  };

  // 处理节点展开/折叠
  const handleNodeExpand = (nodeId: string, expanded: boolean) => {
    const newExpandedNodes = new Set(expandedNodes);
    if (expanded) {
      newExpandedNodes.add(nodeId);
    } else {
      // 当折叠节点时，也折叠其所有子节点
      newExpandedNodes.delete(nodeId);
      const descendantIds = getAllDescendantNodeIds(nodeId);
      descendantIds.forEach(id => {
        newExpandedNodes.delete(id);
      });
    }
    setExpandedNodes(newExpandedNodes);
  };

  // 处理画布点击（取消选择节点）
  const handleCanvasClick = () => {
    setSelectedNode(null);
    setSelectedNodes([]);
    setIsStylePanelOpen(false);
  };

  // 根据用户偏好设置自动保存
  const setupAutoSave = () => {
    // 清除现有的定时器（如果有）
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
    }
    
    // 从偏好设置中获取自动保存间隔（分钟）
    const autoSaveInterval = preferencesService.getPreference('autoSaveInterval');
    const intervalMs = autoSaveInterval * 60 * 1000; // 转换为毫秒
    
    // 设置新的间隔
    autoSaveTimerRef.current = setInterval(() => {
      if (hasUnsavedChanges) {
        autoSave();
      }
    }, intervalMs);
  };

  // 自动保存函数
  const autoSave = async () => {
    try {
      if (work && hasUnsavedChanges) {
        // 准备保存的作品数据
        const workData = {
          nodes,
          layout: currentLayout
        };
        
        // 获取加密密钥
        let key = keyManager.getKey();
        
        if (!key) {
          // 如果密钥不存在，生成一个
          key = await keyManager.generateKey();
        }
        
        // 加密作品数据
        const encryptedData = await encryptionService.encrypt(workData, key);
        
        // 保存作品数据
        await storage.updateWork(work.id, {
          encryptedData,
          layout: currentLayout
        });
        
        // 重置未保存更改标志
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('保存数据过程中出错:', error);
    }
  };

  // 处理平移变化
  const handlePanChange = (newPan: { x: number; y: number }) => {
    setPan(newPan);
  };

  // 处理刷新（重置视图到中心）
  const handleRefresh = () => {
    if (canvasContainerRef.current) {
      const { width, height } = canvasContainerRef.current.getBoundingClientRect();
      // 重置平移到中心
      setPan({ x: width / 2, y: height / 2 });
      // 重置缩放为 1.0
      setZoom(1);
    }
  };

  // 处理缩放变化（由迷你地图使用）
  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
  };

  // 管理器
  const historyManagerRef = useRef<HistoryManager>(new HistoryManager());

  // 初始化历史记录
  useEffect(() => {
    const initialState: HistoryState = {
      nodes,
      connections,
      timestamp: Date.now(),
      description: '初始状态',
    };
    historyManagerRef.current.addState(initialState);
    historyManagerRef.current.startAutoSave(30000, workId);

    return () => {
      historyManagerRef.current.stopAutoSave();
    };
  }, []);

  // 处理画布容器大小变化
  useEffect(() => {
    const handleResize = () => {
      if (canvasContainerRef.current) {
        const { width, height } = canvasContainerRef.current.getBoundingClientRect();
        // 更新平移以居中思维导图
        const centerX = width / 2;
        const centerY = height / 2;
        setPan({ x: centerX, y: centerY });
        // 更新画布大小以用于迷你地图
        setCanvasSize({ width, height });
      }
    };

    // 带重试逻辑的初始调整大小
    const setupCanvasPosition = () => {
      if (canvasContainerRef.current) {
        handleResize();
      } else {
        // 如果容器尚未可用则重试
        setTimeout(setupCanvasPosition, 100);
      }
    };

    // 组件挂载后开始设置
    setTimeout(setupCanvasPosition, 100);
    
    // 添加窗口大小变化的事件监听器
    window.addEventListener('resize', handleResize);
    
    // 使用 ResizeObserver 监听容器大小变化
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    
    // 带重试的设置观察者
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

  // 处理带保存确认的返回按钮
  const handleBackClick = () => {
    if (hasUnsavedChanges) {
      setShowSaveDialog(true);
    } else {
      onBack();
    }
  };

  // 处理带保存确认的预览按钮
  const handlePreviewClick = () => {
    if (hasUnsavedChanges) {
      setShowSaveDialog(true);
    } else {
      // 这里可以添加预览逻辑
    }
  };

  // 处理保存并退出
  const handleSaveAndExit = async () => {
    try {
      // 保存带布局信息的作品数据
      if (work) {
        // 检查是否有未保存的更改
        if (hasUnsavedChanges) {
          // 准备保存的作品数据
          const workData = {
            nodes,
            layout: currentLayout
          };
          
          // 获取加密密钥
          let key = keyManager.getKey();
          
          if (!key) {
            // 如果密钥不存在，生成一个
            key = await keyManager.generateKey();
          }
          
          // 加密作品数据
          const encryptedData = await encryptionService.encrypt(workData, key);
          
          // 保存作品数据
          await storage.updateWork(work.id, {
            encryptedData,
            layout: currentLayout
          });
        } else {
          await storage.updateWork(work.id, {
            layout: currentLayout
          });
        }
      }
      
      // 重置未保存更改标志
      setHasUnsavedChanges(false);
      setShowSaveDialog(false);
      onBack();
    } catch (error) {
      console.error('保存作品时出错:', error);
      // 即使保存失败，仍然退出以保持用户流程
      setHasUnsavedChanges(false);
      setShowSaveDialog(false);
      onBack();
    }
  };

  // 处理不保存就退出
  const handleExitWithoutSaving = () => {
    setShowSaveDialog(false);
    onBack();
  };

  // 处理取消退出
  const handleCancelExit = () => {
    setShowSaveDialog(false);
  };



  // 处理样式更改
  const handleStyleChange = (nodeIds: string[], style: any) => {
    const newNodes = NodeOperations.batchUpdateNodes(nodes, nodeIds, style);
    setNodes(newNodes);
    addHistoryState(newNodes, connections, '修改样式');
    setHasUnsavedChanges(true);
  };

  // 处理文本更改
  const handleTextChange = (nodeId: string, text: string) => {
    try {
      const newNodes = nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, title: text };
        }
        return node;
      });
      
      setNodes(newNodes);
      addHistoryState(newNodes, connections, '修改节点文本');
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error('修改节点文本过程中出错:', error);
    }
  };

  // 处理内容更改
  const handleContentChange = (nodeId: string, content: string) => {
    try {
      const newNodes = nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, content: content };
        }
        return node;
      });
      
      setNodes(newNodes);
      addHistoryState(newNodes, connections, '修改节点内容');
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error('修改节点内容过程中出错', error);
    }
  };

  // 处理布局更改
  const handleLayoutChange = (mode: LayoutMode, direction: LayoutDirection) => {
    const layoutOptions = {
      mode,
      direction,
      levelSpacing: 150,
      nodeSpacing: 80,
      centerX: 0,
      centerY: 0,
    };
    let newNodes = LayoutManager.applyLayout(nodes, layoutOptions);
    // 布局应用后计算节点层级
    newNodes = calculateNodeLevels(newNodes);
    setNodes(newNodes);
    setCurrentLayout({ mode, direction });
    addHistoryState(newNodes, connections, `应用${getLayoutName(mode)}布局`);
    setHasUnsavedChanges(true);
  };
  
  // 计算所有节点的层级
  const calculateNodeLevels = (nodes: MindMapNode[]): MindMapNode[] => {
    // 创建一个映射用于快速查找节点
    const nodeMap = new Map<string, MindMapNode>();
    nodes.forEach(node => nodeMap.set(node.id, node));
    
    // 递归函数计算层级
    const calculateLevel = (nodeId: string, parentLevel: number): number => {
      const node = nodeMap.get(nodeId);
      if (!node) return 0;
      
      const level = parentLevel + 1;
      
      // 更新节点层级
      node.level = level;
      
      // 计算子节点的层级
      node.children.forEach(childId => {
        calculateLevel(childId, level);
      });
      
      return level;
    };
    
    // 从根节点开始（层级 0）
    const rootNode = nodes.find(node => node.id === 'root');
    if (rootNode) {
      rootNode.level = 0;
      rootNode.children.forEach(childId => {
        calculateLevel(childId, 0);
      });
    }
    
    return nodes;
  };
  
  // 获取思维导图中的最大层级
  const getMaxLevel = (): number => {
    let maxLevel = 0;
    nodes.forEach(node => {
      if (node.level && node.level > maxLevel) {
        maxLevel = node.level;
      }
    });
    return maxLevel;
  };
  
  // 处理层级可见性切换（切换层级及其以下所有层级）
  const handleLevelToggle = (level: number) => {
    const newHiddenLevels = new Set(hiddenLevels);
    const maxLevel = getMaxLevel();
    
    // 检查该层级当前是否隐藏
    const isHidden = newHiddenLevels.has(level);
    
    // 切换该层级及其以下所有层级
    for (let i = level; i <= maxLevel; i++) {
      if (isHidden) {
        newHiddenLevels.delete(i);
      } else {
        newHiddenLevels.add(i);
      }
    }
    
    setHiddenLevels(newHiddenLevels);
  };

  // 获取布局名称
  const getLayoutName = (mode: LayoutMode): string => {
    const names = {
      mindmap: '思维导图',
      tree: '树状',
      organization: '组织结构',
      fishbone: '鱼骨图',
    };
    return names[mode];
  };

  // 处理撤销
  const handleUndo = () => {
    const previousState = historyManagerRef.current.undo();
    if (previousState) {
      setNodes(previousState.nodes);
      setConnections(previousState.connections);
    }
  };

  // 处理重做
  const handleRedo = () => {
    const nextState = historyManagerRef.current.redo();
    if (nextState) {
      setNodes(nextState.nodes);
      setConnections(nextState.connections);
    }
  };

  // 处理节点移动
  const handleNodeMove = (nodeId: string, x: number, y: number) => {
    // 防止中心主题（root节点）被移动
    if (nodeId === 'root') {
      return;
    }
    
    const newNodes = NodeOperations.updateNode(nodes, nodeId, { x, y });
    setNodes(newNodes);
    addHistoryState(newNodes, connections, '移动节点');
    setHasUnsavedChanges(true);
  };

  // 处理节点菜单（右键点击）
  const handleNodeMenu = (nodeId: string, x: number, y: number) => {
    // 设置选中节点状态（与点击相同）
    setSelectedNode(nodeId);
    setSelectedNodes([nodeId]);
    
    // 设置上下文菜单状态
    setContextMenuNodeId(nodeId);
    setContextMenuPosition({ x, y });
    setIsContextMenuOpen(true);
  };

  // 处理上下文菜单关闭
  const handleContextMenuClose = () => {
    setIsContextMenuOpen(false);
    setContextMenuNodeId(null);
  };

  // 处理复制节点
  const handleCopyNode = () => {
    if (contextMenuNodeId) {
      // 查找原始节点
      const originalNode = nodes.find(node => node.id === contextMenuNodeId);
      if (originalNode) {
        // 计算新节点位置（与原始节点偏移）
        const offsetX = 50; // 水平偏移
        const offsetY = 50; // 垂直偏移
        const newX = originalNode.x + offsetX;
        const newY = originalNode.y + offsetY;
        
        // 查找原始节点的父节点
        let parentId = undefined;
        for (const node of nodes) {
          if (node.children.includes(originalNode.id)) {
            parentId = node.id;
            break;
          }
        }
        
        // 创建具有复制属性的新节点
        const newNodes = NodeOperations.createNode(nodes, {
          x: newX,
          y: newY,
          title: originalNode.title,
          summary: originalNode.summary,
          content: originalNode.content,
          type: originalNode.type,
          shape: originalNode.shape,
          color: originalNode.color,
          fontSize: originalNode.fontSize,
          icon: originalNode.icon,
          parentId: parentId
        });
        
        // 计算节点层级
        const nodesWithLevels = calculateNodeLevels(newNodes);
        
        // 更新状态
        setNodes(nodesWithLevels);
        addHistoryState(nodesWithLevels, connections, '复制节点');
        setHasUnsavedChanges(true);
      }
    }
  };

  // 处理删除节点
  const handleDeleteNode = () => {
    if (contextMenuNodeId) {
      const newNodes = NodeOperations.deleteNode(nodes, contextMenuNodeId);
      setNodes(newNodes);
      addHistoryState(newNodes, connections, '删除节点');
      setHasUnsavedChanges(true);
    }
  };

  // 处理编辑节点
  const handleEditNode = () => {
    if (contextMenuNodeId) {
      const node = nodes.find(n => n.id === contextMenuNodeId);
      if (node) {
        // 打开样式面板（之前由双击触发）
        setSelectedNode(contextMenuNodeId);
        setSelectedNodes([contextMenuNodeId]);
        setIsStylePanelOpen(true);
      }
    }
  };

  // 处理添加子节点
  const handleAddChildNode = () => {
    try {
      if (contextMenuNodeId) {
        const parentNode = nodes.find(n => n.id === contextMenuNodeId);
        if (parentNode) {
          const newNode = NodeOperations.createNode(nodes, {
            x: parentNode.x + 200,
            y: parentNode.y,
            title: '新子节点',
            parentId: contextMenuNodeId,
          });
          
          // 计算节点层级
          const nodesWithLevels = calculateNodeLevels(newNode);
          
          setNodes(nodesWithLevels);
          
          // 将新节点添加到 expandedNodes 集合
          // 通过与原始节点比较找到新节点
          const originalNodeIds = new Set(nodes.map(n => n.id));
          const newNodeId = newNode.find(n => !originalNodeIds.has(n.id))?.id;
          if (newNodeId) {
            setExpandedNodes(prev => new Set([...prev, newNodeId]));
          }
          
          addHistoryState(newNode, connections, '添加子节点');
          setHasUnsavedChanges(true);
        }
      }
    } catch (error) {
      console.error('添加子节点过程中出错:', error);
    }
  };

  // 添加历史记录状态
  const addHistoryState = (newNodes: MindMapNode[], newConnections: Connection[], description: string) => {
    const state: HistoryState = {
      nodes: newNodes,
      connections: newConnections,
      timestamp: Date.now(),
      description,
    };
    historyManagerRef.current.addState(state);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* 顶部工具栏 */}
      <div className="border-b bg-toolbar-background flex flex-wrap items-center justify-between px-4 gap-4 py-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBackClick} className="rounded-lg">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <h2>{work?.title || workId}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 历史记录 */}
          <Button variant="outline" size="sm" onClick={handleUndo} className="rounded-lg">
            <Undo className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleRedo} className="rounded-lg">
            <Redo className="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* 刷新（居中） */}
          <Button variant="outline" size="sm" onClick={handleRefresh} className="rounded-lg">
            <RefreshCw className="w-4 h-4" />
          </Button>



          {/* 布局 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-lg">
                <Layout className="w-4 h-4 mr-2" />
                布局
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-lg">
              <DropdownMenuItem 
                onClick={() => handleLayoutChange('mindmap', 'horizontal')}
                className={currentLayout.mode === 'mindmap' && currentLayout.direction === 'horizontal' ? 'bg-primary/10 text-primary font-medium' : ''}
              >
                思维导图 - 水平
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleLayoutChange('mindmap', 'vertical')}
                className={currentLayout.mode === 'mindmap' && currentLayout.direction === 'vertical' ? 'bg-primary/10 text-primary font-medium' : ''}
              >
                思维导图 - 垂直
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleLayoutChange('tree', 'horizontal')}
                className={currentLayout.mode === 'tree' && currentLayout.direction === 'horizontal' ? 'bg-primary/10 text-primary font-medium' : ''}
              >
                树状 - 水平
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleLayoutChange('tree', 'vertical')}
                className={currentLayout.mode === 'tree' && currentLayout.direction === 'vertical' ? 'bg-primary/10 text-primary font-medium' : ''}
              >
                树状 - 垂直
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleLayoutChange('organization', 'vertical')}
                className={currentLayout.mode === 'organization' && currentLayout.direction === 'vertical' ? 'bg-primary/10 text-primary font-medium' : ''}
              >
                组织结构图
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleLayoutChange('fishbone', 'horizontal')}
                className={currentLayout.mode === 'fishbone' && currentLayout.direction === 'horizontal' ? 'bg-primary/10 text-primary font-medium' : ''}
              >
                鱼骨图
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* 层级管理 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-lg">
                <Layers className="w-4 h-4 mr-2" />
                层级
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-lg">
              {Array.from({ length: getMaxLevel() }, (_, i) => i + 1).map(level => {
                // 检查从该层级向下的所有层级是否都被隐藏
                const allLevelsHidden = Array.from({ length: getMaxLevel() - level + 1 }, (_, j) => level + j).every(l => hiddenLevels.has(l));
                // 检查是否有任何父层级被隐藏（应该禁用此菜单项）
                const isParentHidden = Array.from({ length: level - 1 }, (_, j) => j + 1).some(l => hiddenLevels.has(l));
                return (
                  <DropdownMenuItem 
                    key={level}
                    onClick={() => handleLevelToggle(level)}
                    className={allLevelsHidden ? 'bg-primary/10 text-primary font-medium' : ''}
                    disabled={isParentHidden}
                  >
                    {allLevelsHidden ? '显示' : '隐藏'} 第{level}层{level < getMaxLevel() ? '及以下' : ''}
                  </DropdownMenuItem>
                );
              })}
              {getMaxLevel() === 0 && (
                <DropdownMenuItem disabled>
                  暂无层级节点
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>



          <Separator orientation="vertical" className="h-6" />

          {/* 缩放控制 */}
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

          {/* 保存和分享 */}
          <Button variant="outline" size="sm" className="rounded-2xl">
            <Save className="w-4 h-4 mr-2" />
            保存
          </Button>
          <Button variant="outline" size="sm" className="rounded-2xl" onClick={handlePreviewClick}>
            <Eye className="w-4 h-4 mr-2" />
            预览
          </Button>
          <Button variant="outline" size="sm" className="rounded-2xl">
            <Share2 className="w-4 h-4 mr-2" />
            分享
          </Button>
          <Button variant="outline" size="sm" className="rounded-2xl">
            <Download className="w-4 h-4 mr-2" />
            导出
          </Button>
        </div>
      </div>

      {/* 画布区域 */}
      <div 
        ref={canvasContainerRef}
        className="flex-1 relative overflow-hidden bg-background"
      >
        <CanvasRenderer
          nodes={nodes}
          zoom={zoom}
          pan={pan}
          onPanChange={handlePanChange}
          selectedNode={selectedNode}
          onCanvasClick={handleCanvasClick}
          expandedNodes={expandedNodes}
          onNodeExpand={handleNodeExpand}
          onNodeMove={handleNodeMove}
          onNodeMenu={handleNodeMenu}
          hiddenLevels={hiddenLevels}
        />



        {/* 迷你地图 */}
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
      </div>

      {/* 样式面板 */}
      <StylePanel
        selectedNodes={selectedNodes}
        nodes={nodes}
        onStyleChange={handleStyleChange}
        onTextChange={handleTextChange}
        onContentChange={handleContentChange}
        isOpen={isStylePanelOpen}
        onClose={() => setIsStylePanelOpen(false)}
        zoom={zoom}
        pan={pan}
        canvasContainerRef={canvasContainerRef}
      />

      {/* 上下文菜单 */}
      <ContextMenu
        isOpen={isContextMenuOpen}
        position={contextMenuPosition}
        items={[
          {
            id: 'edit',
            label: '编辑节点',
            onClick: handleEditNode,
          },
          {
            id: 'add-child',
            label: '添加子节点',
            onClick: handleAddChildNode,
          },
          ...(contextMenuNodeId !== 'root' ? [
            {
              id: 'copy',
              label: '复制节点',
              onClick: handleCopyNode,
            },
            {
              id: 'delete',
              label: '删除节点',
              onClick: handleDeleteNode,
            },
          ] : []),
        ]}
        onClose={handleContextMenuClose}
      />

      {/* 保存确认对话框 */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="w-[300px] min-h-[150px]">
          <DialogHeader>
            <DialogTitle>保存更改</DialogTitle>
            <DialogDescription>
              您有未保存的更改，是否要保存后再返回？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={handleExitWithoutSaving}>
              不保存
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancelExit}>
                取消
              </Button>
              <Button onClick={handleSaveAndExit}>
                保存并返回
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
