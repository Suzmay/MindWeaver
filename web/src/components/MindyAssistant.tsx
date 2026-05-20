import { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles, BookOpen, HelpCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { useStorage } from '../context/StorageContext';
import { useTheme } from '../context/ThemeContext';
import { assetService } from '../services/assets/AssetService';
import { UserPreferencesService } from '../services/storage/UserPreferencesService';
import { EventType } from '../services/storage/interfaces/EventEmitter';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  type?: 'tutorial' | 'suggestion' | 'action' | 'info';
}

interface TutorialStep {
  id: number;
  title: string;
  description: string;
  action: string;
}

interface MindyAssistantProps {
  // onAction?: (action: string, data?: any) => void;
}

export function MindyAssistant({}: MindyAssistantProps) {
  const { listWorks, listTemplates, getTemplate, createWork } = useStorage();
  const { setTheme } = useTheme();
  const preferencesService = UserPreferencesService.getInstance();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: '嗨，我是章鱼Mindy 🐙 让我陪你潜入灵感深海，一起绘制出色的思维导图吧！\n\n需要帮助吗？可以去「新手教程」标签页看看完整使用指南，或者随时问我问题！',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [messagesEndId, setMessagesEndId] = useState(0);
  const [activeTab, setActiveTab] = useState<'chat' | 'tutorial'>('chat');
  
  // 拖动相关状态
  const [position, setPosition] = useState({ 
    x: window.innerWidth - 500, 
    y: 100 
  });
  const [isDragging, setIsDragging] = useState(false);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const longPressTimerRef = useRef<number | null>(null);
  
  // 浮动按钮拖动状态
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 });
  const [isButtonDragging, setIsButtonDragging] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const buttonRafRef = useRef<number | null>(null);
  const buttonDragOffset = useRef({ x: 0, y: 0 });
  const buttonDraggingRef = useRef(false);
  
  // 长按检测状态
  const [isLongPress, setIsLongPress] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [isClickPrevented, setIsClickPrevented] = useState(false);

  // 教程数据
  const tutorialSteps: TutorialStep[] = [
    {
      id: 1,
      title: '开始使用',
      description: '左侧导航栏可以访问所有功能！你可以作为游客使用，也可以去「账户」页面登录。',
      action: '',
    },
    {
      id: 2,
      title: '素材管理',
      description: '去「素材」页面浏览和收藏素材，创建作品时可以使用喜欢的图标和图片！',
      action: '',
    },
    {
      id: 3,
      title: '创建作品',
      description: '两种方式开始：① 去「模板」页面选择模板使用 ② 去「作品」页面点击「新建」从头创作。',
      action: '',
    },
    {
      id: 4,
      title: '编辑作品',
      description: '在「作品」页面双击作品进入编辑器，在编辑器中你可以：拖动节点、拖动画布、右键打开菜单、使用样式面板调整外观！',
      action: '',
    },
    {
      id: 5,
      title: '预览作品',
      description: '在编辑器中可以预览作品，适合展示和复习使用。还可以调整动画、背景颜色等，双击节点可放大查看节点之间的关系和内容。',
      action: '',
    },
    {
      id: 6,
      title: '分享与导出',
      description: '在「作品」页面可以导出作品，或进入编辑器进行分享和导出！',
      action: '',
    },
    {
      id: 7,
      title: '市场导入',
      description: '在「市场」页面可以通过文件或链接导入作品、模板和素材，保存到自己的库里继续使用和编辑！',
      action: '',
    },
    {
      id: 8,
      title: '个性化设置',
      description: '去「设置」页面可以：切换主题（浅海晨光/深海夜色）、调整自动保存间隔、设置侧边栏宽度、重置数据等。',
      action: '',
    },
    {
      id: 9,
      title: '仪表盘概览',
      description: '「仪表盘」页面展示你的作品统计、图表和最近编辑，一目了然管理你的所有创意！',
      action: '',
    },
  ];

  const quickActions = ['新增分支', '调整配色', '分享作品', '导出作品', '浏览模板'];

  useEffect(() => {
    // 当消息变化时滚动到底部
    const element = document.getElementById('messages-end');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, messagesEndId]);

  // 读取Mindy可见性偏好设置
  useEffect(() => {
    const checkVisibility = async () => {
      await preferencesService.initialize();
      setIsVisible(preferencesService.getPreference('mindyVisible'));
    };
    checkVisibility();
    
    // 监听偏好设置变化
    const unsubscribe = preferencesService.subscribe(EventType.PREFERENCE_CHANGED, (data: any) => {
      if (data.data?.key === 'mindyVisible') {
        setIsVisible(data.data?.value);
      }
    });
    
    return unsubscribe;
  }, []);
  
  // 右键点击隐藏Mindy助手
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsVisible(false);
    preferencesService.setPreference('mindyVisible', false);
  };
  
  // 点击外部时关闭聊天窗口
  useEffect(() => {
    if (isOpen) {
      const handleClickOutside = (event: MouseEvent) => {
        // 检查点击是否在聊天窗口和按钮之外
        const target = event.target as HTMLElement;
        
        // 如果点击在聊天窗口上则不关闭
        if (chatWindowRef.current && chatWindowRef.current.contains(target)) {
          return;
        }
        
        // 如果点击在浮动按钮上则不关闭
        if (buttonRef.current && buttonRef.current.contains(target)) {
          return;
        }
        
        // 关闭聊天窗口
        setIsOpen(false);
      };
      
      // 添加事件监听器
      document.addEventListener('mousedown', handleClickOutside);
      
      // 清理事件监听器
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // 拖动事件处理
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // 只处理鼠标左键（0）
    if (e.button !== 0) return;
    
    // 防止拖动过程中选择文本
    e.preventDefault();
    
    // 设置长按定时器以开始拖动
    const timer = window.setTimeout(() => {
      setIsDragging(true);
      draggingRef.current = true;
      
      // 计算鼠标到面板原点的偏移量
      if (chatWindowRef.current) {
        const rect = chatWindowRef.current.getBoundingClientRect();
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
    
    // 将定时器存储在引用中
    longPressTimerRef.current = timer;
  };

  // 处理全局鼠标移动（拖动过程中）
  const handleGlobalMouseMove = (e: MouseEvent) => {
    if (!draggingRef.current || !chatWindowRef.current) return;
    
    // 防止拖动过程中选择文本
    e.preventDefault();
    
    // 取消之前的动画帧以避免累积
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    
    // 使用 requestAnimationFrame 实现更平滑的拖动
    rafRef.current = requestAnimationFrame(() => {
      if (!chatWindowRef.current) return;
      
      // 计算新位置
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;
      
      // 更新位置状态
      setPosition({ x: newX, y: newY });
    });
  };

  // 处理全局鼠标释放（结束拖动）
  const handleGlobalMouseUp = () => {
    // 清除长按定时器（如果存在）
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      // 防止拖动过程中选择文本
      e.preventDefault();
    }
  };

  const handleMouseUp = () => {
    // 清除长按定时器（如果存在）
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // 浮动按钮拖动事件处理
  const handleButtonMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // 只处理鼠标左键（0）
    if (e.button !== 0) return;
    
    // 防止拖动过程中选择文本
    e.preventDefault();
    
    // 开始长按检测
    setIsLongPress(false);
    setIsClickPrevented(false);
    
    // 300ms后触发长按
    const timer = setTimeout(() => {
      setIsLongPress(true);
      setIsClickPrevented(true);
      buttonDraggingRef.current = true;
      
      // 计算鼠标到按钮原点的偏移量
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        buttonDragOffset.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
        
        // 添加全局鼠标移动和释放监听器
        document.addEventListener('mousemove', handleGlobalButtonMouseMove);
        document.addEventListener('mouseup', handleGlobalButtonMouseUp);
      }
      
      // 在拖动过程中全局禁用文本选择
      document.body.style.userSelect = 'none';
    }, 300);
    
    setLongPressTimer(timer);
  };

  // 处理全局按钮鼠标移动（拖动过程中）
  const handleGlobalButtonMouseMove = (e: MouseEvent) => {
    if (!buttonDraggingRef.current || !buttonRef.current) return;
    
    // 防止拖动过程中选择文本
    e.preventDefault();
    
    // 取消之前的动画帧以避免累积
    if (buttonRafRef.current) {
      cancelAnimationFrame(buttonRafRef.current);
    }
    
    // 使用 requestAnimationFrame 实现更平滑的拖动
    buttonRafRef.current = requestAnimationFrame(() => {
      if (!buttonRef.current) return;
      
      // 计算相对于窗口的新位置
      const newX = e.clientX - buttonDragOffset.current.x - (window.innerWidth - 100);
      const newY = e.clientY - buttonDragOffset.current.y - (window.innerHeight - 100);
      
      // 更新位置状态
      setButtonPosition({ x: newX, y: newY });
    });
  };

  // 处理全局按钮鼠标释放（结束拖动）
  const handleGlobalButtonMouseUp = () => {
    // 取消任何待处理的动画帧
    if (buttonRafRef.current) {
      cancelAnimationFrame(buttonRafRef.current);
      buttonRafRef.current = null;
    }
    
    // 移除全局事件监听器
    document.removeEventListener('mousemove', handleGlobalButtonMouseMove);
    document.removeEventListener('mouseup', handleGlobalButtonMouseUp);
    
    // 重新启用文本选择
    document.body.style.userSelect = '';
    
    // 重置拖动状态
    buttonDraggingRef.current = false;
    setIsButtonDragging(false);
    setIsLongPress(false);
  };

  const handleButtonMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isLongPress) {
      // 防止拖动过程中选择文本
      e.preventDefault();
    }
  };

  const handleButtonMouseUp = (_: React.MouseEvent<HTMLDivElement>) => {
    // 清除长按定时器
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    if (!isLongPress) {
      setIsClickPrevented(false);
    }
  };

  const handleButtonMouseLeave = (_: React.MouseEvent<HTMLDivElement>) => {
    // 清除长按定时器
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    // 如果未拖动则重置状态
    if (!buttonDraggingRef.current) {
      setIsButtonDragging(false);
      setIsLongPress(false);
    }
  };

  // 处理按钮点击
  const handleButtonClick = () => {
    if (!isClickPrevented) {
      setIsOpen(!isOpen);
    }
  };

  // 添加浮动按钮的全局鼠标释放事件监听
  useEffect(() => {
    if (isButtonDragging) {
      const handleGlobalButtonMouseUp = () => setIsButtonDragging(false);
      document.addEventListener('mouseup', handleGlobalButtonMouseUp);
      return () => {
        document.removeEventListener('mouseup', handleGlobalButtonMouseUp);
      };
    }
  }, [isButtonDragging]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages([...messages, newMessage]);
    setInputValue('');
    setMessagesEndId((prev) => prev + 1);

    // 处理用户输入并生成响应
    const response = await processUserInput(inputValue);
    setMessages((prev) => [...prev, response]);
    setMessagesEndId((prev) => prev + 1);
  };

  const processUserInput = async (input: string): Promise<Message> => {
    const lowerInput = input.toLowerCase();
    
    // 处理问候语
    if (lowerInput.includes('你好') || lowerInput.includes('嗨') || lowerInput.includes('hello') || lowerInput.includes('hi')) {
      return {
        id: (Date.now() + 1).toString(),
        text: '你好呀！我是章鱼Mindy 🐙 很高兴为你服务！有什么我可以帮你的吗？',
        isUser: false,
        timestamp: new Date(),
        type: 'info',
      };
    }

    // 处理帮助请求
    if (lowerInput.includes('帮助') || lowerInput.includes('help') || lowerInput.includes('怎么')) {
      return {
        id: (Date.now() + 1).toString(),
        text: '当然可以帮你！\n\n你可以：\n• 去「作品」页面创建新思维导图\n• 去「模板」页面使用现成模板\n• 去「素材」页面浏览和收藏素材\n• 去「市场」页面导入/导出作品\n• 去「设置」页面调整个性化选项\n\n快去「新手教程」标签页看看详细指南吧！',
        isUser: false,
        timestamp: new Date(),
        type: 'info',
      };
    }

    // 处理创建请求
    if (lowerInput.includes('创建') || lowerInput.includes('新建') || lowerInput.includes('new') ||
        lowerInput.includes('使用') || lowerInput.includes('基于') || lowerInput.includes('根据')) {
      // 提取标题（支持多种格式）
      const titleMatch = input.match(/创建(?:一个)?(.+?)(?:的思维导图)/) || 
                         input.match(/新建(?:一个)?(.+?)(?:的思维导图)/) ||
                         input.match(/创建(?:一个)?(.+)/) ||
                         input.match(/新建(?:一个)?(.+)/);
      
      // 检查是否使用模板
      const templateMatch = input.match(/使用(.+?)模板/) || 
                           input.match(/基于(.+?)模板/) || 
                           input.match(/根据(.+?)模板/);
      
      if (titleMatch || templateMatch) {
        // 有具体名称或提到模板，直接创建
        return await handleCreateWork(input);
      } else {
        // 只是说"创建"或"新建"，给出引导
        return {
          id: (Date.now() + 1).toString(),
          text: '好的！我可以帮你创建思维导图！\n\n💡 试试这样说：\n• 创建读书计划\n• 创建一个读书计划的思维导图\n• 使用会议记录模板创建周会纪要\n• 使用会议记录模板\n\n需要我帮你创建什么主题的思维导图？',
          isUser: false,
          timestamp: new Date(),
          type: 'suggestion',
        };
      }
    }

    // 处理主题切换
    if (lowerInput.includes('主题') || lowerInput.includes('深色') || lowerInput.includes('浅色') || lowerInput.includes('theme')) {
      if (lowerInput.includes('深色') || lowerInput.includes('dark')) {
        setTheme('dark');
        return {
          id: (Date.now() + 1).toString(),
          text: '已切换到深色主题 🌙，现在界面更加护眼了！你也可以在「设置」页面调整主题。',
          isUser: false,
          timestamp: new Date(),
          type: 'action',
        };
      } else if (lowerInput.includes('浅色') || lowerInput.includes('light')) {
        setTheme('light');
        return {
          id: (Date.now() + 1).toString(),
          text: '已切换到浅色主题 ☀️，界面更加明亮了！你也可以在「设置」页面调整主题。',
          isUser: false,
          timestamp: new Date(),
          type: 'action',
        };
      } else {
        return {
          id: (Date.now() + 1).toString(),
          text: '你可以说「深色主题」或「浅色主题」来切换界面样式，也可以去「设置」页面选择主题！',
          isUser: false,
          timestamp: new Date(),
          type: 'suggestion',
        };
      }
    }

    // 处理教程请求
    if (lowerInput.includes('教程') || lowerInput.includes('学习') || lowerInput.includes('tutorial')) {
      return {
        id: (Date.now() + 1).toString(),
        text: '我准备了新手教程帮助你快速上手！点击上方「📖 新手教程」标签查看详细指南。',
        isUser: false,
        timestamp: new Date(),
        type: 'tutorial',
      };
    }

    // 处理仪表盘数据查询
    if (lowerInput.includes('统计') || lowerInput.includes('数据') || lowerInput.includes('创作') || 
        lowerInput.includes('我的作品') || lowerInput.includes('作品数') || lowerInput.includes('仪表盘') || lowerInput.includes('dashboard')) {
      return await handleDashboardStats();
    }

    // 处理智能搜索（优先于单关键词处理）
    if (lowerInput.includes('搜索') || lowerInput.includes('找') || 
        lowerInput.includes('查一下') || lowerInput.includes('有什么') || lowerInput.includes('search')) {
      // 提取原始搜索关键词（保留所有内容，用于判断是否有实际搜索词）
      const cleanedInput = input
        .replace(/搜索|找|查一下|有什么|的/g, '')
        .trim();
      
      // 判断搜索类别（只有当输入仅包含类别词时才视为类别选择）
      let searchType: 'works' | 'templates' | 'materials' | 'all' = 'all';
      const hasWorks = lowerInput.includes('作品');
      const hasTemplates = lowerInput.includes('模板');
      const hasMaterials = lowerInput.includes('素材');
      const categoryOnly = cleanedInput === '' || cleanedInput === '作品' || cleanedInput === '模板' || cleanedInput === '素材';
      
      if (categoryOnly) {
        // 只有类别词，没有具体搜索词
        if (hasWorks && !hasTemplates && !hasMaterials) {
          searchType = 'works';
        } else if (hasTemplates && !hasWorks && !hasMaterials) {
          searchType = 'templates';
        } else if (hasMaterials && !hasWorks && !hasTemplates) {
          searchType = 'materials';
        }
      } else {
        // 有具体搜索词，根据上下文确定搜索范围
        if (hasWorks && !hasTemplates && !hasMaterials) {
          searchType = 'works';
        } else if (hasTemplates && !hasWorks && !hasMaterials) {
          searchType = 'templates';
        } else if (hasMaterials && !hasWorks && !hasTemplates) {
          searchType = 'materials';
        }
        // 否则搜索全部
      }
      
      // 提取实际搜索关键词（移除动词，保留名词和类别词作为关键词）
      let searchQuery = cleanedInput;
      if (hasWorks) searchQuery = searchQuery.replace(/作品/g, '').trim();
      if (hasTemplates) searchQuery = searchQuery.replace(/模板/g, '').trim();
      if (hasMaterials) searchQuery = searchQuery.replace(/素材/g, '').trim();
      
      // 如果搜索词为空但指定了类别，显示该类别的列表
      if (!searchQuery || searchQuery === '') {
        if (searchType === 'works') {
          return {
            id: (Date.now() + 1).toString(),
            text: '你想找什么作品呢？比如：「搜索项目相关的作品」或「找最近的作品」',
            isUser: false,
            timestamp: new Date(),
            type: 'suggestion',
          };
        } else if (searchType === 'templates') {
          return {
            id: (Date.now() + 1).toString(),
            text: '你想找什么模板呢？比如：「搜索项目管理模板」或「搜索学习笔记模板」',
            isUser: false,
            timestamp: new Date(),
            type: 'suggestion',
          };
        } else if (searchType === 'materials') {
          return {
            id: (Date.now() + 1).toString(),
            text: '你想找什么素材呢？比如：「搜索图标素材」或「搜索配色方案」',
            isUser: false,
            timestamp: new Date(),
            type: 'suggestion',
          };
        } else {
          return {
            id: (Date.now() + 1).toString(),
            text: '你想搜索什么呢？\n\n💡 试试这样说：\n• 搜索作品：「搜索项目相关的作品」\n• 搜索模板：「搜索项目管理的模板」\n• 搜索素材：「搜索图标素材」\n• 或直接搜索：「搜索项目管理」',
            isUser: false,
            timestamp: new Date(),
            type: 'suggestion',
          };
        }
      }
      
      // 执行搜索（搜索词不为空）
      return await handleSearch(searchQuery, searchType);
    }

    // 处理"最近的作品"
    if (lowerInput.includes('最近') && lowerInput.includes('作品')) {
      return await handleSearch('最近');
    }

    // 处理作品请求（仅当无搜索意图时）
    if (lowerInput.includes('作品') || lowerInput.includes('works')) {
      const worksResult = await listWorks({ page: 1, pageSize: 100 });
      const activeWorks = worksResult.works.filter((w: any) => !w.isDeleted);
      if (activeWorks.length === 0) {
        return {
          id: (Date.now() + 1).toString(),
          text: '你还没有创建任何作品！\n\n💡 试试说「创建一个读书计划的思维导图」开始你的创作之旅！',
          isUser: false,
          timestamp: new Date(),
          type: 'suggestion',
        };
      }
      const workList = activeWorks.slice(0, 5).map((w: any) => `- ${w.title}`).join('\n');
      return {
        id: (Date.now() + 1).toString(),
        text: `找到 ${activeWorks.length} 个作品！热门作品有：\n${workList}\n\n去「作品」页面查看全部，或说「搜索XX作品」查找特定内容！`,
        isUser: false,
        timestamp: new Date(),
        type: 'info',
      };
    }

    // 处理模板请求（仅当无搜索意图时）
    if (lowerInput.includes('模板') || lowerInput.includes('template')) {
      try {
        const templates = await listTemplates({});
        const templateList = templates.slice(0, 5).map((t: any) => `- ${t.title}`).join('\n');
        return {
          id: (Date.now() + 1).toString(),
          text: `找到 ${templates.length} 个模板！热门模板有：\n${templateList}\n\n去「模板」页面查看全部吧！`,
          isUser: false,
          timestamp: new Date(),
          type: 'info',
        };
      } catch (error) {
        return {
          id: (Date.now() + 1).toString(),
          text: '获取模板列表失败，请稍后重试。',
          isUser: false,
          timestamp: new Date(),
        };
      }
    }

    // 处理素材请求（仅当无搜索意图时）
    if (lowerInput.includes('素材') || lowerInput.includes('materials')) {
      const assets = assetService.getAllAssets();
      const assetList = assets.slice(0, 5).map((a: any) => `- ${a.name}（${a.type}）`).join('\n');
      return {
        id: (Date.now() + 1).toString(),
        text: `找到 ${assets.length} 个素材！精选素材有：\n${assetList}\n\n去「素材中心」页面查看全部！`,
        isUser: false,
        timestamp: new Date(),
        type: 'info',
      };
    }

    // 默认响应
    return {
      id: (Date.now() + 1).toString(),
      text: '这个问题很有意思！让我想想……\n\n建议你先去「新手教程」标签页看看完整的使用指南，或者告诉我你具体想了解什么功能？',
      isUser: false,
      timestamp: new Date(),
    };
  };

  // 创建作品（支持使用模板或新建）
  const handleCreateWork = async (input: string): Promise<Message> => {
    try {
      // 检查是否提到使用模板
      const templateMatch = input.match(/使用(.+?)模板/) || input.match(/基于(.+?)模板/) || input.match(/根据(.+?)模板/);
      
      // 提取作品名称（支持多种格式，先移除模板相关内容）
      let inputWithoutTemplate = input;
      if (templateMatch) {
        inputWithoutTemplate = input.replace(templateMatch[0], '').trim();
      }
      
      const titleMatch = inputWithoutTemplate.match(/创建(?:一个)?(.+?)(?:的思维导图)/) || 
                         inputWithoutTemplate.match(/新建(?:一个)?(.+?)(?:的思维导图)/) ||
                         inputWithoutTemplate.match(/创建(?:一个)?(.+)/) ||
                         inputWithoutTemplate.match(/新建(?:一个)?(.+)/);
      let title = titleMatch ? titleMatch[1].trim() : '新建思维导图';
      if (!title || title.length < 1) title = '新建思维导图';
      
      // 获取所有作品用于检查标题重复
      const allWorksResult = await listWorks({ page: 1, pageSize: 1000 });
      const allWorks = allWorksResult.works;

      // 检查标题是否重复，如果重复则添加序号
      let finalTitle = title;
      let counter = 0;
      while (allWorks.some((work: any) => work.title === finalTitle)) {
        counter++;
        finalTitle = `${title}(${counter})`;
      }

      if (templateMatch) {
        // 使用模板创建
        const templateName = templateMatch[1].trim();
        const templates = await listTemplates({});
        const template = templates.find((t: any) => 
          t.title.toLowerCase().includes(templateName.toLowerCase())
        );

        if (template) {
          const templateData = await getTemplate(template.id);
          
          // 获取模板的布局配置
          const layoutMode = template.layoutConfig?.layoutType || 'mindmap';
          const layoutDirection = template.layoutConfig?.direction || 'horizontal';

          await createWork({
            title: finalTitle,
            category: template.category || '',
            tags: template.tags || [],
            nodes: templateData?.nodesData?.length || 0,
            nodesData: templateData?.nodesData || [],
            layout: {
              mode: layoutMode,
              direction: layoutDirection
            }
          });

          return {
            id: (Date.now() + 1).toString(),
            text: `✅ 已为你基于「${template.title}」模板创建作品「${finalTitle}」！快去编辑吧！`,
            isUser: false,
            timestamp: new Date(),
            type: 'action',
          };
        } else {
          return {
            id: (Date.now() + 1).toString(),
            text: `没有找到「${templateName}」模板！\n\n💡 可用模板：\n${templates.slice(0, 5).map((t: any) => `- ${t.title}`).join('\n')}\n\n试试用「创建一个读书计划」直接新建！`,
            isUser: false,
            timestamp: new Date(),
            type: 'suggestion',
          };
        }
      } else {
        // 直接新建作品（与新建按钮逻辑一致）
        await createWork({
          title: finalTitle,
          category: '',
          tags: [],
          nodes: 4,
          nodesData: [
            { id: 'root', title: finalTitle, children: ['node1', 'node2', 'node3'], isRoot: true },
            { id: 'node1', title: '主要分支', parentId: 'root' },
            { id: 'node2', title: '次要分支', parentId: 'root' },
            { id: 'node3', title: '辅助分支', parentId: 'root' },
          ],
          layout: {
            mode: 'mindmap',
            direction: 'right'
          }
        });

        return {
          id: (Date.now() + 1).toString(),
          text: `✅ 已为你创建作品「${finalTitle}」！快去编辑吧！\n\n💡 提示：输入「创建」或「新建」可以获取完整的创建引导！也可以说「使用XX模板创建一个XX」来基于模板创建！`,
          isUser: false,
          timestamp: new Date(),
          type: 'action',
        };
      }
    } catch (error) {
      console.error('创建作品失败:', error);
      return {
        id: (Date.now() + 1).toString(),
        text: '创建作品失败，请稍后重试。',
        isUser: false,
        timestamp: new Date(),
      };
    }
  };

  // 仪表盘数据查询
  const handleDashboardStats = async (): Promise<Message> => {
    try {
      const [worksResult, templates] = await Promise.all([
        listWorks({ page: 1, pageSize: 100 }),
        listTemplates({})
      ]);

      const works = worksResult.works;
      const activeWorks = works.filter((w: any) => !w.isDeleted);
      
      // 计算节点总数
      let totalNodes = 0;
      activeWorks.forEach((work: any) => {
        if (work.nodesData && Array.isArray(work.nodesData)) {
          totalNodes += work.nodesData.length;
        }
      });

      // 找出最近编辑的作品
      const recentWorks = [...activeWorks]
        .sort((a: any, b: any) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
        .slice(0, 3);

      const recentList = recentWorks.map((w: any, i: number) => 
        `${i + 1}. ${w.title}（${new Date(w.lastModified).toLocaleDateString()}）`
      ).join('\n');

      // 计算本周创作数
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const thisWeekCount = activeWorks.filter((w: any) => 
        new Date(w.createdAt) >= oneWeekAgo
      ).length;

      const stats = `
📊 你的创作数据：

📁 作品总数：${activeWorks.length} 个
📚 模板总数：${templates.length} 个
🔢 节点总数：${totalNodes} 个
📅 本周新建：${thisWeekCount} 个

🕐 最近编辑：
${recentList || '暂无作品'}

💡 去「仪表盘」页面查看详细统计！`;

      return {
        id: (Date.now() + 1).toString(),
        text: stats,
        isUser: false,
        timestamp: new Date(),
        type: 'info',
      };
    } catch (error) {
      console.error('获取仪表盘数据失败:', error);
      return {
        id: (Date.now() + 1).toString(),
        text: '获取数据失败，请稍后重试。',
        isUser: false,
        timestamp: new Date(),
      };
    }
  };

  // 智能搜索
  const handleSearch = async (query: string, searchType: 'works' | 'templates' | 'materials' | 'all' = 'all'): Promise<Message> => {
    try {
      const lowerQuery = query.toLowerCase();
      
      // 素材类型映射
      const materialTypeMap: Record<string, string> = {
        'icon': '图标',
        'shape': '形状',
        'connector': '连线',
        'iconSet': '图标组合',
        'fontStyle': '字体样式',
        'colorScheme': '配色方案',
        'background': '背景',
        'animation': '动画'
      };
      
      let matchingWorks: any[] = [];
      let matchingTemplates: any[] = [];
      let matchingMaterials: any[] = [];

      // 根据搜索类型执行搜索
      if (searchType === 'works' || searchType === 'all') {
        // 搜索作品
        const worksResult = await listWorks({ 
          page: 1, 
          pageSize: 100,
          searchText: lowerQuery 
        });
        matchingWorks = worksResult.works
          .filter((w: any) => !w.isDeleted && (
            w.title.toLowerCase().includes(lowerQuery) ||
            lowerQuery.includes(w.title.toLowerCase()) ||
            (w.description && w.description.toLowerCase().includes(lowerQuery)) ||
            (w.category && w.category.toLowerCase().includes(lowerQuery)) ||
            (w.category && lowerQuery.includes(w.category.toLowerCase()))
          ))
          .slice(0, 5);
      }

      if (searchType === 'templates' || searchType === 'all') {
        // 搜索模板（支持双向匹配：关键词包含标签，或标签包含关键词）
        const templates = await listTemplates({});
        matchingTemplates = templates
          .filter((t: any) => {
            const titleMatch = t.title.toLowerCase().includes(lowerQuery) || lowerQuery.includes(t.title.toLowerCase());
            const descMatch = t.description && (t.description.toLowerCase().includes(lowerQuery) || lowerQuery.includes(t.description.toLowerCase()));
            const tagMatch = t.tags && t.tags.some((tag: string) => {
              const lowerTag = tag.toLowerCase();
              return lowerTag.includes(lowerQuery) || lowerQuery.includes(lowerTag);
            });
            const categoryMatch = t.category && (t.category.toLowerCase().includes(lowerQuery) || lowerQuery.includes(t.category.toLowerCase()));
            return titleMatch || descMatch || tagMatch || categoryMatch;
          })
          // 去重
          .filter((t: any, index: number, self: any[]) => 
            index === self.findIndex((s: any) => s.title === t.title)
          )
          .slice(0, 5);
      }

      if (searchType === 'materials' || searchType === 'all') {
        // 搜索素材（使用真实的 assetService）
        matchingMaterials = assetService.searchAssets(lowerQuery).slice(0, 5);
      }

      let response = '';

      if (matchingWorks.length > 0) {
        const workList = matchingWorks.map((w: any) => 
          `📄 ${w.title}（${new Date(w.lastModified).toLocaleDateString()}）`
        ).join('\n');
        response += `📁 找到 ${matchingWorks.length} 个相关作品：\n${workList}\n\n`;
      } else if (searchType === 'works') {
        response += `📁 暂未找到相关作品，快去创建你的第一个思维导图吧！\n\n`;
      }

      if (matchingTemplates.length > 0) {
        const templateList = matchingTemplates.map((t: any) => 
          `📋 ${t.title}`
        ).join('\n');
        response += `📋 找到 ${matchingTemplates.length} 个相关模板：\n${templateList}\n\n`;
      }

      if (matchingMaterials.length > 0) {
        const materialList = matchingMaterials.map((a: any) => 
          `🎨 ${a.name}（${materialTypeMap[a.type] || a.type}）`
        ).join('\n');
        response += `🎨 找到 ${matchingMaterials.length} 个相关素材：\n${materialList}`;
      }

      if (!response) {
        const typeText = searchType === 'works' ? '作品' : 
                        searchType === 'templates' ? '模板' : 
                        searchType === 'materials' ? '素材' : '内容';
        
        let suggestionLinks = '';
        if (searchType === 'works' || searchType === 'all') {
          suggestionLinks += '• 去「作品」页面浏览所有作品\n';
        }
        if (searchType === 'templates' || searchType === 'all') {
          suggestionLinks += '• 去「模板」页面浏览所有模板\n';
        }
        if (searchType === 'materials' || searchType === 'all') {
          suggestionLinks += '• 去「素材中心」页面浏览所有素材';
        }
        
        response = `没有找到与「${query}」相关的${typeText}。\n\n💡 建议：\n• 尝试更通用的关键词（如「项目」「学习」「创意」）\n• 检查拼写是否正确\n${suggestionLinks}`;
      } else {
        let suggestionLink = '';
        if (searchType === 'works') {
          suggestionLink = '去「作品」页面查看更多搜索结果！';
        } else if (searchType === 'templates') {
          suggestionLink = '去「模板」页面查看更多搜索结果！';
        } else if (searchType === 'materials') {
          suggestionLink = '去「素材中心」页面查看更多搜索结果！';
        } else {
          suggestionLink = '去「作品」、「模板」或「素材」页面查看更多搜索结果！';
        }
        response += `\n\n💡 ${suggestionLink}`;
      }

      return {
        id: (Date.now() + 1).toString(),
        text: response,
        isUser: false,
        timestamp: new Date(),
        type: 'info',
      };
    } catch (error) {
      console.error('搜索失败:', error);
      return {
        id: (Date.now() + 1).toString(),
        text: '搜索失败，请稍后重试。',
        isUser: false,
        timestamp: new Date(),
      };
    }
  };

  const handleQuickAction = async (action: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text: action,
      isUser: true,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setMessagesEndId((prev) => prev + 1);
    
    let response: Message;
    
    switch (action) {
      case '分享作品':
        response = {
          id: (Date.now() + 1).toString(),
          text: '🔗 在作品详情页或编辑器中可以分享思维导图！支持生成分享链接或导出为图片/JSON等格式分享给好友。',
          isUser: false,
          timestamp: new Date(),
          type: 'info',
        };
        break;
      case '新增分支':
        response = {
          id: (Date.now() + 1).toString(),
          text: '💡 小贴士：在编辑器中选中节点后，右键可以添加子节点！',
          isUser: false,
          timestamp: new Date(),
          type: 'suggestion',
        };
        break;
      case '调整配色':
        response = {
          id: (Date.now() + 1).toString(),
          text: '🎨 在编辑器中点击右侧样式面板可以调整节点颜色和布局！还可以从素材中选择配色方案素材，一键应用到整个思维导图。',
          isUser: false,
          timestamp: new Date(),
          type: 'info',
        };
        break;
      case '导出作品':
        response = {
          id: (Date.now() + 1).toString(),
          text: '📤 在作品列表中可以导出作品，或者去「市场」页面导入/导出作品！',
          isUser: false,
          timestamp: new Date(),
          type: 'info',
        };
        break;
      case '浏览模板':
        try {
          const templates = await listTemplates({});
          const templateList = templates.slice(0, 5).map((t: any) => `- ${t.title}`).join('\n');
          response = {
            id: (Date.now() + 1).toString(),
            text: `找到 ${templates.length} 个模板！热门模板有：\n${templateList}\n\n去「模板」页面查看全部吧！`,
            isUser: false,
            timestamp: new Date(),
            type: 'info',
          };
        } catch (error) {
          response = {
            id: (Date.now() + 1).toString(),
            text: '获取模板列表失败，请稍后重试。',
            isUser: false,
            timestamp: new Date(),
          };
        }
        break;
      default:
        response = {
          id: (Date.now() + 1).toString(),
          text: `这个功能可以去相应的页面操作哦！快去「新手教程」标签页看看吧！`,
          isUser: false,
          timestamp: new Date(),
        };
    }
    
    setTimeout(() => {
      setMessages((prev) => [...prev, response]);
      setMessagesEndId((prev) => prev + 1);
    }, 600);
  };

  return (
    <>
      {/* 浮动助手按钮 */}
      {isVisible && (
        <motion.div
          className="fixed z-50"
          style={{
            left: `${buttonPosition.x + window.innerWidth - 100}px`, // 默认位置偏右
            top: `${buttonPosition.y + window.innerHeight - 100}px`,  // 默认位置偏下
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.5 }}
          ref={buttonRef}
          onMouseDown={handleButtonMouseDown}
          onMouseMove={handleButtonMouseMove}
          onMouseUp={handleButtonMouseUp}
          onMouseLeave={handleButtonMouseLeave}
          onContextMenu={handleContextMenu}
        >
          <button
            onClick={handleButtonClick}
            className="relative w-16 h-16 rounded-full shadow-2xl hover:scale-110 transition-transform duration-300 group cursor-move"
            aria-label="打开Mindy助理"
            title="右键点击隐藏Mindy"
          >
          {/* 动画脉冲环 */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary via-secondary to-accent opacity-75 animate-ping" />
          
          {/* 带渐变的主按钮 */}
          <div className="relative w-full h-full rounded-full bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center border-4 border-white shadow-ocean-lg">
            <motion.span 
              className="text-4xl"
              animate={{ 
                rotate: [0, 5, -5, 0],
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              🐙
            </motion.span>
          </div>
          
          {/* 通知点 */}
          {!isOpen && (
            <motion.div 
              className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full border-2 border-white"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1 }}
            >
              <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white">!</span>
            </motion.div>
          )}

          {/* 悬停提示 */}
          <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div className="bg-gray-900 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap shadow-lg">
              询问Mindy
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
            </div>
          </div>
        </button>
      </motion.div>
      )}

      {/* 聊天窗口 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed w-[400px] h-[600px] bg-card border-2 border-primary/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden z-40"
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
            }}
            ref={chatWindowRef}
          >

            {/* 头部 */}
            <div 
              className="bg-ocean-gradient text-white p-5 flex items-center justify-between relative overflow-hidden cursor-move"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* 装饰性气泡 */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-2 right-10 w-2 h-2 bg-white/20 rounded-full bubble-float" />
                <div className="absolute bottom-3 left-8 w-3 h-3 bg-white/15 rounded-full bubble-float" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 right-1/4 w-2 h-2 bg-white/10 rounded-full bubble-float" style={{ animationDelay: '0.5s' }} />
              </div>
              
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl shadow-lg border-2 border-white/30">
                  <motion.span
                    animate={{ 
                      rotate: [0, 10, -10, 0],
                    }}
                    transition={{ 
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    🐙
                  </motion.span>
                </div>
                <div>
                  <h3 className="font-bold text-lg">Mindy</h3>
                  <p className="text-xs opacity-90">你的 AI 伙伴</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20 rounded-xl relative z-10"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* 标签页切换 */}
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'chat'
                    ? 'text-primary border-b-2 border-primary bg-primary/5'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <HelpCircle className="w-4 h-4 inline-block mr-2" />
                聊天
              </button>
              <button
                onClick={() => setActiveTab('tutorial')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'tutorial'
                    ? 'text-primary border-b-2 border-primary bg-primary/5'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <BookOpen className="w-4 h-4 inline-block mr-2" />
                新手教程
              </button>
            </div>

            {/* 内容区域 */}
            <div className="flex-1 p-4 bg-muted/20 overflow-y-auto scrollbar-hide">
              {activeTab === 'chat' ? (
                /* 消息 */
                <div className="space-y-4">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                          message.isUser
                            ? 'bg-gradient-to-br from-primary to-secondary text-white'
                            : 'bg-card text-foreground border-2 border-primary/20'
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
                        <span className="text-xs opacity-70 mt-1 block">
                          {message.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                  {/* 不可见元素用于滚动定位 */}
                  <div id="messages-end" />
                </div>
              ) : (
                /* 教程 */
                <div className="space-y-4">
                  {tutorialSteps.map((step) => (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-card rounded-2xl p-4 border-2 border-primary/10 hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-primary">{step.id}</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                            {step.title}
                            {step.id === 1 && <Sparkles className="w-4 h-4 text-primary" />}
                          </h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {/* 完成提示 */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-4 border-2 border-primary/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xl">
                        🎉
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">恭喜！你已经准备好开始创作了！</h4>
                        <p className="text-sm text-muted-foreground">
                          有任何问题随时在聊天区问我，祝你创作愉快！✨
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </div>

            {activeTab === 'chat' && (
              <>
                {/* 快捷操作 */}
                <div className="px-4 py-3 border-t border-border bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-2">快捷操作</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent hover:scrollbar-thumb-primary/50">
                    {quickActions.map((action) => (
                      <Button
                        key={action}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAction(action)}
                        className="rounded-full text-xs border-primary/40 hover:bg-primary/10 hover:border-primary whitespace-nowrap flex-shrink-0"
                      >
                        <Sparkles className="w-3 h-3 mr-1 text-primary" />
                        {action}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* 输入区域 */}
                <div className="p-4 border-t border-border bg-card">
                  <div className="flex gap-2">
                    <Input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="向Mindy提问..."
                      className="rounded-2xl border-primary/30 focus:border-primary bg-input-background"
                    />
                    <Button
                      onClick={handleSendMessage}
                      size="sm"
                      className="rounded-2xl bg-gradient-to-br from-primary to-secondary hover:opacity-90 transition-opacity px-4"
                      disabled={!inputValue.trim()}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}