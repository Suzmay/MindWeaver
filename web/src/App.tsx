import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { FirstLaunchGuide } from './components/FirstLaunchGuide';
import { StorageProvider } from './context/StorageContext';
import { UserProvider } from './context/UserContext';
import { ThemeProvider } from './context/ThemeContext';

export default function App() {
  const [activeTab, setActiveTab] = useState('works');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user just logged in via GitHub
    const justLoggedInViaGitHub = localStorage.getItem('mindweaver_github_login');
    if (justLoggedInViaGitHub) {
      console.log('检测到GitHub登录状态，切换到账号页面');
      setActiveTab('account');
      // 清除登录状态标记，避免每次刷新都切换
      localStorage.removeItem('mindweaver_github_login');
    }

    // Update active tab based on current path
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

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Navigate to the corresponding route
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