import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { StorageProvider } from './context/StorageContext';
import { UserProvider } from './context/UserContext';
import { ThemeProvider } from './context/ThemeContext';

export default function App() {
  const [activeTab, setActiveTab] = useState('works');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // 根据当前路径更新活动标签
    const path = location.pathname;
    if (path.includes('/account')) {
      setActiveTab('account');
    } else if (path.includes('/assets')) {
      setActiveTab('assets');
    } else if (path.includes('/works')) {
      setActiveTab('works');
    } else if (path.includes('/templates')) {
      setActiveTab('templates');
    } else if (path.includes('/market')) {
      setActiveTab('market');
    } else if (path.includes('/dashboard')) {
      setActiveTab('dashboard');
    } else if (path.includes('/settings')) {
      setActiveTab('settings');
    }
  }, [location.pathname]);

  // 处理 GitHub OAuth 回调
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const userStr = params.get('user');
    
    if (token && userStr) {
      try {
        const userData = JSON.parse(decodeURIComponent(userStr));
        // 存储 token 和用户信息（使用与 UserContext 一致的键名）
        localStorage.setItem('mindweaver_token', token);
        localStorage.setItem('mindweaver_user', JSON.stringify(userData));
        localStorage.setItem('mindweaver_is_guest', 'false');
        // 清除 URL 参数
        window.history.replaceState({}, document.title, location.pathname);
        // 刷新页面以应用登录状态
        window.location.reload();
      } catch (error) {
        console.error('处理 OAuth 回调失败:', error);
      }
    }
  }, [location.search, location.pathname]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // 导航到对应的路由
    navigate(`/${tab}`);
  };

  return (
    <ThemeProvider>
      <UserProvider>
        <StorageProvider>
          <AppLayout 
            activeTab={activeTab} 
            onTabChange={handleTabChange}
          >
            <Outlet />
          </AppLayout>
        </StorageProvider>
      </UserProvider>
    </ThemeProvider>
  );
}