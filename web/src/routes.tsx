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

// 包装 MindMapEditor 以获取 URL 参数
function MindMapEditorWrapper() {
  const params = useParams<{ workId: string }>();
  const workId = params.workId || '';
  
  const handleBack = () => {
    window.location.href = '/works';
  };
  
  return <MindMapEditor workId={workId} onBack={handleBack} />;
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
    ],
  },
]);

export default router;
