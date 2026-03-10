import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { MindyAssistant } from './MindyAssistant';
import { Toaster } from './ui/sonner';

interface AppLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function AppLayout({ children, activeTab, onTabChange }: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* 左侧边栏 */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
      />

      {/* 主要内容区域 */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>

      {/* Mindy 助手 - 始终以浮动按钮形式显示 */}
      <MindyAssistant />

      {/* 消息通知 */}
      <Toaster />
    </div>
  );
}
