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