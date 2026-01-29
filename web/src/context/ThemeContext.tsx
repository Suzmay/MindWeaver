import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserPreferencesService } from '../services/storage/UserPreferencesService';

type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  applyTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('auto');
  const preferencesService = UserPreferencesService.getInstance();

  useEffect(() => {
    // 初始化用户偏好设置服务
    const initPreferences = async () => {
      await preferencesService.initialize();
      const savedTheme = preferencesService.getPreference('theme');
      setTheme(savedTheme);
      applyTheme(savedTheme);
      
      // 初始化侧边栏宽度
      const sidebarWidth = preferencesService.getPreference('sidebarWidth');
      document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
    };

    initPreferences();

    // 监听系统主题变化（当设置为自动模式时）
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (theme === 'auto') {
        applyTheme('auto');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [theme]);

  const applyTheme = (newTheme: Theme) => {
    if (newTheme === 'auto') {
      // 使用系统偏好
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleThemeChange = async (newTheme: Theme) => {
    setTheme(newTheme);
    await preferencesService.setPreference('theme', newTheme);
    applyTheme(newTheme);
  };

  const value = {
    theme,
    setTheme: handleThemeChange,
    applyTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// 自定义Hook
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export { ThemeContext };
