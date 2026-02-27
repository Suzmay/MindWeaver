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
  Type,
  Image,
  MoreHorizontal,
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
  // Services
  const storage = useStorage();
  const preferencesService = UserPreferencesService.getInstance();
  const encryptionService = EncryptionService.getInstance();
  const keyManager = KeyManager.getInstance();

  // State
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
  
  // State for hidden levels
  const [hiddenLevels, setHiddenLevels] = useState<Set<number>>(new Set());
  
  // State for canvas size (used by mini map)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  
  // Refs
  const autoSaveTimerRef = useRef<number | null>(null);

  // Monitor nodes changes and ensure new nodes are in expandedNodes set
  useEffect(() => {
    // Find new nodes that are not in expandedNodes
    const nodesNotInExpanded = nodes.filter(node => !expandedNodes.has(node.id));
    if (nodesNotInExpanded.length > 0) {
      console.log('=== 检测到新节点，将其添加到expandedNodes集合 ===');
      const newExpandedNodes = new Set(expandedNodes);
      nodesNotInExpanded.forEach(node => {
        if (node.id !== 'root') { // Root is already in the set
          console.log('添加新节点到expandedNodes:', node.id);
          newExpandedNodes.add(node.id);
        }
      });
      setExpandedNodes(newExpandedNodes);
    }
  }, [nodes, expandedNodes]);

  // Initialize user preferences and setup auto-save
  useEffect(() => {
    const initializePreferences = async () => {
      try {
        await preferencesService.initialize();
        setupAutoSave();
      } catch (error) {
        console.error('Error initializing preferences:', error);
      }
    };
    
    initializePreferences();
    
    // Cleanup on unmount
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, []);

  // Load work data
  useEffect(() => {
    const loadWorkData = async () => {
      console.log('=== 开始加载作品数据流程 ===');
      try {
        console.log('1. 开始获取作品详情:', workId);
        const workDetails = await storage.getWork(workId);
        console.log('2. 获取作品详情结果:', workDetails ? '成功' : '失败');
        
        if (workDetails) {
          console.log('3. 作品详情:', {
            id: workDetails.id,
            title: workDetails.title,
            hasEncryptedData: workDetails.encryptedData ? '有' : '无',
            encryptedDataLength: workDetails.encryptedData ? workDetails.encryptedData.length : 0,
            hasLayout: workDetails.layout ? '有' : '无',
            nodes: workDetails.nodes
          });
          
          console.log('4. 设置作品状态');
          setWork(workDetails);
          
          // Check if encrypted data exists and try to decrypt
          let finalNodes = nodes; // 默认使用当前节点
          let hasSavedNodePositions = false;
          if (workDetails.encryptedData) {
            console.log('5. 发现加密数据，尝试解密');
            try {
              const key = keyManager.getKey();
              if (key) {
                console.log('6. 使用密钥解密数据');
                const decryptedData = await encryptionService.decrypt(workDetails.encryptedData, key);
                console.log('7. 解密成功，数据结构:', {
                  hasNodes: decryptedData.nodes ? '有' : '无',
                  nodeCount: decryptedData.nodes ? decryptedData.nodes.length : 0,
                  hasLayout: decryptedData.layout ? '有' : '无'
                });
                
                if (decryptedData.nodes) {
                  console.log('8. 解密数据包含节点信息，更新节点状态');
                  console.log('8.1 节点数据:', decryptedData.nodes);
                  finalNodes = decryptedData.nodes; // 使用解密后的节点
                  hasSavedNodePositions = true;
                } else {
                  console.log('8. 解密数据不包含节点信息，使用默认节点');
                }
              } else {
                console.log('6. 无可用的加密密钥');
              }
            } catch (decryptError) {
              console.error('7. 解密数据失败:', decryptError);
              console.log('7.1 解密失败，使用默认节点');
            }
          } else {
            console.log('5. 无加密数据，使用默认节点');
          }
          
          // Calculate node levels
          let nodesWithLevels = calculateNodeLevels(finalNodes);
          console.log('9. 计算节点层级完成');
          
          // Apply layout if specified and no node positions are saved
          if (workDetails.layout && !hasSavedNodePositions) {
            console.log('10. 应用布局设置:', workDetails.layout);
            setCurrentLayout({ 
              mode: workDetails.layout.mode as LayoutMode, 
              direction: workDetails.layout.direction as LayoutDirection 
            });
            // Directly apply layout without triggering unsaved changes
            const layoutOptions = {
              mode: workDetails.layout.mode as LayoutMode,
              direction: workDetails.layout.direction as LayoutDirection,
              levelSpacing: 150,
              nodeSpacing: 80,
              centerX: 0,
              centerY: 0,
            };
            const newNodes = LayoutManager.applyLayout(nodesWithLevels, layoutOptions);
            // Recalculate levels after layout application
            nodesWithLevels = calculateNodeLevels(newNodes);
            console.log('11. 布局应用完成，节点数量:', nodesWithLevels.length);
            console.log('11.1 布局后节点数据:', nodesWithLevels);
            setNodes(nodesWithLevels);
            addHistoryState(nodesWithLevels, connections, `应用${getLayoutName(workDetails.layout.mode as LayoutMode)}布局`);
            // Don't set hasUnsavedChanges here - it's just initial load
          } else {
            // 如果有保存的节点位置或没有布局设置，直接使用解密后的节点
            console.log('10. 直接使用解密后的节点（包含保存的位置）');
            console.log('10.1 节点数量:', nodesWithLevels.length);
            setNodes(nodesWithLevels);
          }
        } else {
          console.log('3. 未找到作品，使用默认数据');
        }
        
        // Ensure no unsaved changes after initial load
        console.log('11. 初始化完成，重置未保存状态');
        setHasUnsavedChanges(false);
        console.log('=== 加载作品数据流程完成 ===');
      } catch (error) {
        console.error('=== 加载作品数据时出错 ===:', error);
      }
    };

    loadWorkData();
  }, [workId]);

  // Get all descendant node IDs recursively
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

  // Handle node expand/collapse
  const handleNodeExpand = (nodeId: string, expanded: boolean) => {
    const newExpandedNodes = new Set(expandedNodes);
    if (expanded) {
      newExpandedNodes.add(nodeId);
    } else {
      // When collapsing a node, also collapse all its descendants
      newExpandedNodes.delete(nodeId);
      const descendantIds = getAllDescendantNodeIds(nodeId);
      descendantIds.forEach(id => {
        newExpandedNodes.delete(id);
      });
    }
    setExpandedNodes(newExpandedNodes);
  };

  // Handle canvas click (deselect nodes)
  const handleCanvasClick = () => {
    setSelectedNode(null);
    setSelectedNodes([]);
    setIsStylePanelOpen(false);
  };

  // Setup auto-save based on user preferences
  const setupAutoSave = () => {
    // Clear existing timer if any
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
    }
    
    // Get auto-save interval from preferences (in minutes)
    const autoSaveInterval = preferencesService.getPreference('autoSaveInterval');
    const intervalMs = autoSaveInterval * 60 * 1000; // Convert to milliseconds
    
    // Set up new interval
    autoSaveTimerRef.current = setInterval(() => {
      if (hasUnsavedChanges) {
        autoSave();
      }
    }, intervalMs);
  };

  // Auto-save function
  const autoSave = async () => {
    console.log('=== 开始保存数据流程 ===');
    try {
      console.log('1. 检查保存条件:', { workId: work?.id, hasUnsavedChanges });
      
      if (work && hasUnsavedChanges) {
        console.log('2. 准备保存数据:', { nodeCount: nodes.length, layout: currentLayout });
        
        // Prepare work data for saving
        const workData = {
          nodes,
          layout: currentLayout
        };
        console.log('3. 保存数据结构:', {
          hasNodes: workData.nodes ? '有' : '无',
          nodeCount: workData.nodes ? workData.nodes.length : 0,
          hasLayout: workData.layout ? '有' : '无'
        });
        console.log('3.1 节点数据:', workData.nodes);
        
        // Get encryption key
        let key = keyManager.getKey();
        console.log('4. 检查加密密钥:', key ? '已存在' : '不存在');
        
        if (!key) {
          // If no key exists, generate one
          console.log('5. 生成新的加密密钥');
          key = await keyManager.generateKey();
          console.log('6. 加密密钥生成成功');
        }
        
        // Encrypt work data
        console.log('7. 开始加密数据');
        const encryptedData = await encryptionService.encrypt(workData, key);
        console.log('8. 加密成功，加密数据长度:', encryptedData.length);
        
        // Save work data
        console.log('9. 开始更新作品数据:', work.id);
        await storage.updateWork(work.id, {
          encryptedData,
          layout: currentLayout
        });
        console.log('10. 作品数据更新成功');
        
        // 移除获取更新后作品信息的逻辑，避免触发不必要的界面刷新
        
        // Reset unsaved changes flag
        console.log('11. 重置未保存状态');
        setHasUnsavedChanges(false);
        
        console.log('=== 保存数据流程完成 ===');
      } else {
        console.log('2. 跳过保存:', { work: work ? '存在' : '不存在', hasUnsavedChanges });
        console.log('=== 保存数据流程完成 (跳过) ===');
      }
    } catch (error) {
      console.error('=== 保存数据过程中出错 ===:', error);
    }
  };

  // Handle pan change
  const handlePanChange = (newPan: { x: number; y: number }) => {
    setPan(newPan);
  };

  // Handle refresh (reset view to center)
  const handleRefresh = () => {
    if (canvasContainerRef.current) {
      const { width, height } = canvasContainerRef.current.getBoundingClientRect();
      // Reset pan to center
      setPan({ x: width / 2, y: height / 2 });
      // Reset zoom to 1.0
      setZoom(1);
    }
  };

  // Handle zoom change (used by mini map)
  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
  };

  // Managers
  const historyManagerRef = useRef<HistoryManager>(new HistoryManager());

  // Initialize history
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

  // Handle canvas container resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasContainerRef.current) {
        const { width, height } = canvasContainerRef.current.getBoundingClientRect();
        // Update pan to center the mind map
        const centerX = width / 2;
        const centerY = height / 2;
        setPan({ x: centerX, y: centerY });
        // Update canvas size for mini map
        setCanvasSize({ width, height });
      }
    };

    // Initial resize with retry logic
    const setupCanvasPosition = () => {
      if (canvasContainerRef.current) {
        handleResize();
      } else {
        // Retry if container not yet available
        setTimeout(setupCanvasPosition, 100);
      }
    };

    // Start setup after component mount
    setTimeout(setupCanvasPosition, 100);
    
    // Add event listener for window resize
    window.addEventListener('resize', handleResize);
    
    // Use ResizeObserver to listen for container size changes
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    
    // Setup observer with retry
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

  // Handle node click
  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(nodeId);
    setSelectedNodes([nodeId]);
    setIsStylePanelOpen(true);
  };





  // Handle back button with save confirmation
  const handleBackClick = () => {
    if (hasUnsavedChanges) {
      setShowSaveDialog(true);
    } else {
      onBack();
    }
  };

  // Handle preview button with save confirmation
  const handlePreviewClick = () => {
    if (hasUnsavedChanges) {
      setShowSaveDialog(true);
    } else {
      // 这里可以添加预览逻辑
      console.log('预览思维导图');
    }
  };

  // Handle save and exit
  const handleSaveAndExit = async () => {
    try {
      console.log('开始保存并退出:', { workId: work?.id });
      
      // Save work data with layout information
      if (work) {
        console.log('准备保存作品数据:', { workId: work.id, layout: currentLayout, hasUnsavedChanges });
        
        // 检查是否有未保存的更改
        if (hasUnsavedChanges) {
          console.log('有未保存的更改，执行完整保存');
          
          // Prepare work data for saving
          const workData = {
            nodes,
            layout: currentLayout
          };
          console.log('保存数据内容:', workData);
          
          // Get encryption key
          let key = keyManager.getKey();
          console.log('检查加密密钥:', key ? '已存在' : '不存在');
          
          if (!key) {
            // If no key exists, generate one
            console.log('生成新的加密密钥');
            key = await keyManager.generateKey();
            console.log('加密密钥生成成功');
          }
          
          // Encrypt work data
          console.log('开始加密数据');
          const encryptedData = await encryptionService.encrypt(workData, key);
          console.log('加密成功，加密数据长度:', encryptedData.length);
          
          // Save work data
          console.log('更新作品数据:', work.id);
          await storage.updateWork(work.id, {
            encryptedData,
            layout: currentLayout
          });
          console.log('作品数据更新成功');
        } else {
          console.log('无未保存的更改，只保存布局');
          await storage.updateWork(work.id, {
            layout: currentLayout
          });
          console.log('布局保存成功');
        }
      } else {
        console.log('无作品数据，跳过保存');
      }
      
      // Reset unsaved changes flag
      console.log('重置未保存状态');
      setHasUnsavedChanges(false);
      setShowSaveDialog(false);
      console.log('执行返回操作');
      onBack();
    } catch (error) {
      console.error('保存作品时出错:', error);
      // Even if save fails, still exit to maintain user flow
      console.log('保存失败，仍然执行返回操作');
      setHasUnsavedChanges(false);
      setShowSaveDialog(false);
      onBack();
    }
  };

  // Handle exit without saving
  const handleExitWithoutSaving = () => {
    setShowSaveDialog(false);
    onBack();
  };

  // Handle cancel exit
  const handleCancelExit = () => {
    setShowSaveDialog(false);
  };



  // Handle style change
  const handleStyleChange = (nodeIds: string[], style: any) => {
    console.log('MindMapEditor.handleStyleChange: 开始修改样式', { nodeIds, style });
    console.log('MindMapEditor.handleStyleChange: 更新节点数量:', nodeIds.length);
    const newNodes = NodeOperations.batchUpdateNodes(nodes, nodeIds, style);
    console.log('MindMapEditor.handleStyleChange: 样式更新成功，新节点数量:', newNodes.length);
    setNodes(newNodes);
    console.log('MindMapEditor.handleStyleChange: 节点状态更新成功');
    addHistoryState(newNodes, connections, '修改样式');
    console.log('MindMapEditor.handleStyleChange: 历史记录添加成功');
    setHasUnsavedChanges(true);
    console.log('MindMapEditor.handleStyleChange: 未保存状态设置为true');
  };

  // Handle text change
  const handleTextChange = (nodeId: string, text: string) => {
    console.log('=== 开始修改节点文本流程 ===');
    try {
      console.log('1. 开始修改节点文本:', { nodeId, text });
      
      const newNodes = nodes.map(node => {
        if (node.id === nodeId) {
          console.log('2. 找到目标节点:', { id: node.id, oldTitle: node.title, newTitle: text });
          return { ...node, title: text };
        }
        return node;
      });
      
      console.log('3. 文本更新成功，新节点数量:', newNodes.length);
      console.log('3.1 更新后的节点列表:', newNodes);
      
      console.log('4. 更新节点状态');
      setNodes(newNodes);
      
      console.log('5. 添加历史记录');
      addHistoryState(newNodes, connections, '修改节点文本');
      
      console.log('6. 设置未保存状态为true');
      setHasUnsavedChanges(true);
      
      console.log('=== 修改节点文本流程完成 ===');
    } catch (error) {
      console.error('=== 修改节点文本过程中出错 ===:', error);
    }
  };

  // Handle content change
  const handleContentChange = (nodeId: string, content: string) => {
    console.log('=== 开始修改节点内容流程 ===');
    try {
      console.log('1. 开始修改节点内容:', { nodeId, content });
      
      const newNodes = nodes.map(node => {
        if (node.id === nodeId) {
          console.log('2. 找到目标节点:', { id: node.id, oldContent: node.content, newContent: content });
          return { ...node, content: content };
        }
        return node;
      });
      
      console.log('3. 内容更新成功，新节点数量:', newNodes.length);
      console.log('3.1 更新后的节点列表:', newNodes);
      
      console.log('4. 更新节点状态');
      setNodes(newNodes);
      
      console.log('5. 添加历史记录');
      addHistoryState(newNodes, connections, '修改节点内容');
      
      console.log('6. 设置未保存状态为true');
      setHasUnsavedChanges(true);
      
      console.log('=== 修改节点内容流程完成 ===');
    } catch (error) {
      console.error('=== 修改节点内容过程中出错 ===:', error);
    }
  };

  // Handle layout change
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
    // Calculate node levels after layout application
    newNodes = calculateNodeLevels(newNodes);
    setNodes(newNodes);
    setCurrentLayout({ mode, direction });
    addHistoryState(newNodes, connections, `应用${getLayoutName(mode)}布局`);
    setHasUnsavedChanges(true);
  };
  
  // Calculate levels for all nodes
  const calculateNodeLevels = (nodes: MindMapNode[]): MindMapNode[] => {
    // Create a map for quick node lookup
    const nodeMap = new Map<string, MindMapNode>();
    nodes.forEach(node => nodeMap.set(node.id, node));
    
    // Recursive function to calculate level
    const calculateLevel = (nodeId: string, parentLevel: number): number => {
      const node = nodeMap.get(nodeId);
      if (!node) return 0;
      
      const level = parentLevel + 1;
      
      // Update node level
      node.level = level;
      
      // Calculate levels for children
      node.children.forEach(childId => {
        calculateLevel(childId, level);
      });
      
      return level;
    };
    
    // Start from root node (level 0)
    const rootNode = nodes.find(node => node.id === 'root');
    if (rootNode) {
      rootNode.level = 0;
      rootNode.children.forEach(childId => {
        calculateLevel(childId, 0);
      });
    }
    
    return nodes;
  };
  
  // Get maximum level in the mind map
  const getMaxLevel = (): number => {
    let maxLevel = 0;
    nodes.forEach(node => {
      if (node.level && node.level > maxLevel) {
        maxLevel = node.level;
      }
    });
    return maxLevel;
  };
  
  // Handle level visibility toggle (toggle level and all levels below)
  const handleLevelToggle = (level: number) => {
    const newHiddenLevels = new Set(hiddenLevels);
    const maxLevel = getMaxLevel();
    
    // Check if the level is currently hidden
    const isHidden = newHiddenLevels.has(level);
    
    // Toggle the level and all levels below
    for (let i = level; i <= maxLevel; i++) {
      if (isHidden) {
        newHiddenLevels.delete(i);
      } else {
        newHiddenLevels.add(i);
      }
    }
    
    setHiddenLevels(newHiddenLevels);
  };

  // Get layout name
  const getLayoutName = (mode: LayoutMode): string => {
    const names = {
      mindmap: '思维导图',
      tree: '树状',
      organization: '组织结构',
      fishbone: '鱼骨图',
    };
    return names[mode];
  };

  // Handle undo
  const handleUndo = () => {
    const previousState = historyManagerRef.current.undo();
    if (previousState) {
      setNodes(previousState.nodes);
      setConnections(previousState.connections);
    }
  };

  // Handle redo
  const handleRedo = () => {
    const nextState = historyManagerRef.current.redo();
    if (nextState) {
      setNodes(nextState.nodes);
      setConnections(nextState.connections);
    }
  };

  // Handle node move
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

  // Handle node menu (right click)
  const handleNodeMenu = (nodeId: string, x: number, y: number) => {
    // Set selected node state (same as click)
    setSelectedNode(nodeId);
    setSelectedNodes([nodeId]);
    
    // Set context menu state
    setContextMenuNodeId(nodeId);
    setContextMenuPosition({ x, y });
    setIsContextMenuOpen(true);
  };

  // Handle context menu close
  const handleContextMenuClose = () => {
    setIsContextMenuOpen(false);
    setContextMenuNodeId(null);
  };

  // Handle copy node
  const handleCopyNode = () => {
    if (contextMenuNodeId) {
      // Find original node
      const originalNode = nodes.find(node => node.id === contextMenuNodeId);
      if (originalNode) {
        // Calculate new node position (offset from original)
        const offsetX = 50; // Horizontal offset
        const offsetY = 50; // Vertical offset
        const newX = originalNode.x + offsetX;
        const newY = originalNode.y + offsetY;
        
        // Find parent node of original node
        let parentId = undefined;
        for (const node of nodes) {
          if (node.children.includes(originalNode.id)) {
            parentId = node.id;
            break;
          }
        }
        
        // Create new node with copied properties
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
        
        // Calculate node levels
        const nodesWithLevels = calculateNodeLevels(newNodes);
        
        // Update state
        setNodes(nodesWithLevels);
        addHistoryState(nodesWithLevels, connections, '复制节点');
        setHasUnsavedChanges(true);
      }
    }
  };

  // Handle delete node
  const handleDeleteNode = () => {
    if (contextMenuNodeId) {
      const newNodes = NodeOperations.deleteNode(nodes, contextMenuNodeId);
      setNodes(newNodes);
      addHistoryState(newNodes, connections, '删除节点');
      setHasUnsavedChanges(true);
    }
  };

  // Handle edit node
  const handleEditNode = () => {
    if (contextMenuNodeId) {
      const node = nodes.find(n => n.id === contextMenuNodeId);
      if (node) {
        // Open style panel (previously triggered by double click)
        setSelectedNode(contextMenuNodeId);
        setSelectedNodes([contextMenuNodeId]);
        setIsStylePanelOpen(true);
      }
    }
  };

  // Handle add child node
  const handleAddChildNode = () => {
    console.log('=== 开始添加子节点流程 ===');
    try {
      console.log('1. 检查上下文菜单节点ID:', contextMenuNodeId);
      if (contextMenuNodeId) {
        console.log('2. 查找父节点:', contextMenuNodeId);
        const parentNode = nodes.find(n => n.id === contextMenuNodeId);
        if (parentNode) {
          console.log('3. 找到父节点:', { id: parentNode.id, title: parentNode.title });
          console.log('4. 准备创建新节点:', {
            parentId: contextMenuNodeId,
            position: { x: parentNode.x + 200, y: parentNode.y },
            title: '新子节点'
          });
          
          const newNode = NodeOperations.createNode(nodes, {
            x: parentNode.x + 200,
            y: parentNode.y,
            title: '新子节点',
            parentId: contextMenuNodeId,
          });
          
          console.log('5. 节点创建成功，新节点数量:', newNode.length);
          console.log('5.1 新节点列表:', newNode);
          
          // Calculate node levels
          const nodesWithLevels = calculateNodeLevels(newNode);
          console.log('5.2 计算节点层级后:', nodesWithLevels);
          
          console.log('6. 更新节点状态');
          setNodes(nodesWithLevels);
          
          // Add new node to expandedNodes set
          // Find the new node by comparing with original nodes
          const originalNodeIds = new Set(nodes.map(n => n.id));
          const newNodeId = newNode.find(n => !originalNodeIds.has(n.id))?.id;
          if (newNodeId) {
            console.log('6.1 将新节点添加到expandedNodes集合:', newNodeId);
            setExpandedNodes(prev => new Set([...prev, newNodeId]));
          }
          
          console.log('7. 添加历史记录');
          addHistoryState(newNode, connections, '添加子节点');
          
          console.log('8. 设置未保存状态为true');
          setHasUnsavedChanges(true);
          
          console.log('=== 添加子节点流程完成 ===');
        } else {
          console.log('3. 未找到父节点');
          console.log('=== 添加子节点流程完成 (失败) ===');
        }
      } else {
        console.log('2. 无上下文菜单节点ID');
        console.log('=== 添加子节点流程完成 (失败) ===');
      }
    } catch (error) {
      console.error('=== 添加子节点过程中出错 ===:', error);
    }
  };

  // Add history state
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
      {/* Top Toolbar */}
      <div className="border-b bg-background flex flex-wrap items-center justify-between px-4 gap-4 py-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBackClick} className="rounded-lg">
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <h2>{work?.title || workId}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* History */}
          <Button variant="outline" size="sm" onClick={handleUndo} className="rounded-lg">
            <Undo className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleRedo} className="rounded-lg">
            <Redo className="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Refresh (Center) */}
          <Button variant="outline" size="sm" onClick={handleRefresh} className="rounded-lg">
            <RefreshCw className="w-4 h-4" />
          </Button>



          {/* Layout */}
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
          
          {/* Level Management */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-lg">
                <Layers className="w-4 h-4 mr-2" />
                层级
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-lg">
              {Array.from({ length: getMaxLevel() }, (_, i) => i + 1).map(level => {
                // Check if all levels from this level down are hidden
                const allLevelsHidden = Array.from({ length: getMaxLevel() - level + 1 }, (_, j) => level + j).every(l => hiddenLevels.has(l));
                // Check if any parent level is hidden (should disable this menu item)
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

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 border rounded-lg p-1">
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

          {/* Save & Share */}
          <Button variant="outline" size="sm" className="rounded-2xl border-primary/30 hover:bg-primary/10" onClick={async () => {
            console.log('=== 手动保存按钮点击 ===');
            try {
              console.log('1. 检查保存条件:', { work: work ? '存在' : '不存在', hasUnsavedChanges });
              if (work && hasUnsavedChanges) {
                console.log('2. 执行手动保存:', { workId: work.id });
                await autoSave();
                console.log('3. 手动保存完成');
              } else {
                console.log('2. 无需保存:', { work: work ? '存在' : '不存在', hasUnsavedChanges });
              }
            } catch (error) {
              console.error('3. 手动保存失败:', error);
            }
          }}>
            <Save className="w-4 h-4 mr-2" />
            保存
          </Button>
          <Button variant="outline" size="sm" className="rounded-2xl border-primary/30 hover:bg-primary/10" onClick={handlePreviewClick}>
            <Eye className="w-4 h-4 mr-2" />
            预览
          </Button>
          <Button variant="outline" size="sm" className="rounded-2xl border-primary/30 hover:bg-primary/10">
            <Share2 className="w-4 h-4 mr-2" />
            分享
          </Button>
          <Button variant="outline" size="sm" className="rounded-2xl border-primary/30 hover:bg-primary/10">
            <Download className="w-4 h-4 mr-2" />
            导出
          </Button>
        </div>
      </div>

      {/* Canvas Area */}
      <div 
        ref={canvasContainerRef}
        className="flex-1 relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5"
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



        {/* Mini Map */}
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

      {/* Style Panel */}
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

      {/* Context Menu */}
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

      {/* Save Confirmation Dialog */}
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
