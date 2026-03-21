import { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface MindyAssistantProps {
  // onClose参数暂时未使用
}

export function MindyAssistant({}: MindyAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: '嗨，我是章鱼Mindy 🐙 让我陪你潜入灵感深海，一起绘制出色的思维导图吧！',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [messagesEndId, setMessagesEndId] = useState(0);
  
  // 拖动相关状态
  const [position, setPosition] = useState({ 
    x: window.innerWidth - 500, // 默认位置偏右
    y: 100 // 默认位置偏上
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

  const quickActions = ['创建导图', '新增分支', '调整配色', '导出作品'];

  useEffect(() => {
    // 当消息变化时滚动到底部
    const element = document.getElementById('messages-end');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, messagesEndId]);

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

  const handleSendMessage = () => {
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

    // 模拟AI响应
    setTimeout(() => {
      const responses = [
        '明白啦！让我来帮你实现。🐙',
        '好主意！给你一点小建议……🌊',
        '这个问题很有意思，我来想想……💭',
        '没问题，这就帮你搞定！✨',
      ];
      const response: Message = {
        id: (Date.now() + 1).toString(),
        text: responses[Math.floor(Math.random() * responses.length)],
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, response]);
      setMessagesEndId((prev) => prev + 1);
    }, 800);
  };

  const handleQuickAction = (action: string) => {
    const message: Message = {
      id: Date.now().toString(),
      text: action,
      isUser: true,
      timestamp: new Date(),
    };
    setMessages([...messages, message]);
    setMessagesEndId((prev) => prev + 1);
    
    // 模拟响应
    setTimeout(() => {
      const response: Message = {
        id: (Date.now() + 1).toString(),
        text: `让我来帮你完成「${action}」吧！🐙`,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, response]);
      setMessagesEndId((prev) => prev + 1);
    }, 600);
  };

  return (
    <>
      {/* 浮动助手按钮 */}
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
      >
        <button
          onClick={handleButtonClick}
          className="relative w-16 h-16 rounded-full shadow-2xl hover:scale-110 transition-transform duration-300 group cursor-move"
          aria-label="打开Mindy助理"
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

            {/* 消息 */}
            <div className="flex-1 p-4 bg-muted/20 overflow-y-auto scrollbar-hide">
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
                      <p className="text-sm leading-relaxed">{message.text}</p>
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
            </div>

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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}