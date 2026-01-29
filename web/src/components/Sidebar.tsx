import { useState, useEffect } from 'react';
import { User, Package, FolderOpen, Layout, Store, BarChart3, Settings } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  // onMindyClick参数暂时未使用
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const navItems = [
    { id: 'account', label: '账户', icon: User },
    { id: 'assets', label: '素材', icon: Package },
    { id: 'works', label: '作品', icon: FolderOpen },
    { id: 'templates', label: '模板', icon: Layout },
    { id: 'market', label: '市场', icon: Store },
    { id: 'dashboard', label: '仪表盘', icon: BarChart3 },
    { id: 'settings', label: '设置', icon: Settings },
  ];

  const [sidebarWidth, setSidebarWidth] = useState<string>('280px');

  // 获取CSS变量中的侧边栏宽度，如果不存在则使用默认值280px
  const getSidebarWidth = () => {
    const cssVar = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width');
    return cssVar || '280px';
  };

  // 初始化侧边栏宽度
  useEffect(() => {
    setSidebarWidth(getSidebarWidth());

    // 创建一个MutationObserver来监听CSS变量的变化
    const observer = new MutationObserver(() => {
      setSidebarWidth(getSidebarWidth());
    });

    // 监听document.documentElement的style属性变化
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style']
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="h-screen bg-ocean-wave flex flex-col relative overflow-hidden" style={{ width: sidebarWidth }}>
      {/* Decorative ocean elements - All circles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Large circles */}
        <div className="absolute top-10 left-8 w-8 h-8 bg-white/20 rounded-full bubble-float" style={{ animationDelay: '0s' }} />
        <div className="absolute top-32 right-12 w-6 h-6 bg-white/15 rounded-full bubble-float" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-40 left-16 w-10 h-10 bg-white/10 rounded-full bubble-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 right-8 w-5 h-5 bg-white/20 rounded-full bubble-float" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-[60%] left-6 w-7 h-7 bg-white/12 rounded-full bubble-float" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-[70%] left-10 w-4 h-4 bg-white/18 rounded-full bubble-float" style={{ animationDelay: '0.8s' }} />
        
        {/* Medium circles */}
        <div className="absolute top-[15%] right-6 w-9 h-9 bg-white/22 rounded-full pulse-soft swim-animate" style={{ animationDelay: '0.3s' }} />
        <div className="absolute top-[38%] left-4 w-6 h-6 bg-white/18 rounded-full pulse-soft bubble-float" style={{ animationDelay: '1.2s' }} />
        <div className="absolute bottom-[45%] right-5 w-5 h-5 bg-white/16 rounded-full pulse-soft" style={{ animationDelay: '1.8s' }} />
        <div className="absolute top-[62%] left-8 w-8 h-8 bg-white/25 rounded-full pulse-soft swim-animate" style={{ animationDelay: '2.8s' }} />
        <div className="absolute bottom-[22%] right-10 w-7 h-7 bg-white/14 rounded-full pulse-soft bubble-float" style={{ animationDelay: '2.5s' }} />
        <div className="absolute top-[52%] right-4 w-6 h-6 bg-white/20 rounded-full pulse-soft swim-animate" style={{ animationDelay: '2s' }} />
        
        {/* Small circles */}
        <div className="absolute bottom-[12%] left-8 w-4 h-4 bg-white/12 rounded-full pulse-soft" style={{ animationDelay: '3s' }} />
        <div className="absolute top-[25%] left-6 w-5 h-5 bg-white/16 rounded-full pulse-soft" style={{ animationDelay: '0.7s' }} />
        <div className="absolute bottom-[35%] left-5 w-6 h-6 bg-white/14 rounded-full pulse-soft bubble-float" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-[80%] right-6 w-5 h-5 bg-white/18 rounded-full bubble-float" style={{ animationDelay: '3.2s' }} />
        <div className="absolute top-[45%] right-12 w-4 h-4 bg-white/15 rounded-full pulse-soft" style={{ animationDelay: '2.2s' }} />
        <div className="absolute bottom-[55%] left-12 w-7 h-7 bg-white/17 rounded-full swim-animate" style={{ animationDelay: '1.7s' }} />
      </div>

      {/* Logo Section - Larger */}
      <div className="py-8 px-6 flex items-center justify-center border-b border-sidebar-border relative">
        <div className="text-center">
          <h1 className="text-4xl text-white drop-shadow-lg mb-2">
            MindWeaver
          </h1>
          <p className="text-sm text-white/80">深海灵感工坊</p>
        </div>
      </div>

      {/* Navigation Items - Vertically centered */}
      <nav className="flex-1 px-4 flex flex-col justify-center relative py-8">
        <div className="space-y-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-4 rounded-2xl
                  transition-all duration-200 ease-out
                  min-h-[56px] relative group
                  ${isActive 
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-ocean scale-105' 
                    : 'text-sidebar-foreground/90 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                  }
                `}
              >
                  <Icon className={`w-6 h-6 transition-transform group-hover:scale-110 ${isActive ? 'animate-pulse' : ''}`} />
                <span className={`text-base ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-sidebar-border space-y-3 relative">
        {/* User Info */}
        <div className="flex items-center gap-3 px-3 py-3 bg-white/10 rounded-xl backdrop-blur-sm">
          <Avatar className="w-10 h-10 border-2 border-white/30">
            <AvatarImage src="" />
            <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white">
              织
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate font-medium">张三</p>
            <p className="text-xs text-white/70 truncate">张三@示例.中国</p>
          </div>
        </div>
      </div>
    </div>
  );
}
