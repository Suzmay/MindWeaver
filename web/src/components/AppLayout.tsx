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
      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>

      {/* Mindy Assistant - Always visible as floating button */}
      <MindyAssistant />

      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
}
