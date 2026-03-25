import { createBrowserRouter, useParams } from 'react-router-dom';
import App from './App';
import { AccountPage } from './components/AccountPage';
import { AssetsPage } from './components/AssetsPage';
import { WorksPage } from './components/WorksPage';
import { TemplatesPage } from './components/TemplatesPage';
import { MarketPage } from './components/MarketPage';
import { DashboardPage } from './components/DashboardPage';
import { SettingsPage } from './components/SettingsPage';
import { MindMapEditor } from './components/MindMapEditor';
import { MindMapPreview } from './components/MindMapPreview';
import { useStorage } from './context/StorageContext';

// 包装 MindMapEditor 以获取 URL 参数
function MindMapEditorWrapper() {
  const params = useParams<{ workId: string }>();
  const workId = params.workId || '';
  const { initialized } = useStorage();
  
  const handleBack = () => {
    window.location.href = '/works';
  };
  
  const handlePreview = () => {
    window.location.href = `/preview/${workId}`;
  };
  
  // 显示加载状态，直到存储服务初始化完成
  if (!initialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }
  
  return <MindMapEditor workId={workId} onBack={handleBack} onPreview={handlePreview} />;
}

// 包装 MindMapPreview 以获取 URL 参数
function MindMapPreviewWrapper() {
  const params = useParams<{ workId: string }>();
  const workId = params.workId || '';
  const { initialized } = useStorage();
  
  const handleBack = () => {
    window.location.href = '/works';
  };
  
  const handleEdit = () => {
    window.location.href = `/editor/${workId}`;
  };
  
  // 显示加载状态，直到存储服务初始化完成
  if (!initialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }
  
  return <MindMapPreview workId={workId} onBack={handleBack} onEdit={handleEdit} />;
}

// 路由配置
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: 'account',
        element: <AccountPage />,
      },
      {
        path: 'assets',
        element: <AssetsPage />,
      },
      {
        path: 'works',
        element: <WorksPage onEditWork={(id) => window.location.href = `/editor/${id}`} />,
      },
      {
        path: 'templates',
        element: <TemplatesPage />,
      },
      {
        path: 'market',
        element: <MarketPage />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: 'editor/:workId',
        element: <MindMapEditorWrapper />,
      },
      {
        path: 'preview/:workId',
        element: <MindMapPreviewWrapper />,
      },
    ],
  },
]);

export default router;
