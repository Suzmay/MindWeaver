import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
}

interface UserContextType {
  // 状态
  user: User | null;
  isGuest: boolean;
  isLoading: boolean;
  error: string | null;
  
  // 方法
  login: (user: User) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  switchToGuest: () => void;
  switchToUser: (user: User) => void;
  isAuthenticated: () => boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初始化用户状态
  useEffect(() => {
    const initializeUser = async () => {
      try {
        setIsLoading(true);
        
        // 从localStorage加载用户状态
        const savedUser = localStorage.getItem('mindweaver_user');
        const savedIsGuest = localStorage.getItem('mindweaver_is_guest');
        
        if (savedUser) {
          setUser(JSON.parse(savedUser));
          setIsGuest(savedIsGuest === 'true' ? true : false);
        } else {
          // 默认进入游客模式
          setIsGuest(true);
          localStorage.setItem('mindweaver_is_guest', 'true');
        }
        
        setError(null);
      } catch (err) {
        setError((err as Error).message);
        console.error('User initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeUser();
  }, []);

  // 登录
  const login = (userData: User) => {
    setUser(userData);
    setIsGuest(false);
    setError(null);
    
    // 持久化存储
    localStorage.setItem('mindweaver_user', JSON.stringify(userData));
    localStorage.setItem('mindweaver_is_guest', 'false');
  };

  // 登出
  const logout = () => {
    setUser(null);
    setIsGuest(true);
    setError(null);
    
    // 清除存储
    localStorage.removeItem('mindweaver_user');
    localStorage.setItem('mindweaver_is_guest', 'true');
  };

  // 更新用户信息
  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      setError(null);
      
      // 持久化存储
      localStorage.setItem('mindweaver_user', JSON.stringify(updatedUser));
    }
  };

  // 切换到游客模式
  const switchToGuest = () => {
    setUser(null);
    setIsGuest(true);
    setError(null);
    
    // 持久化存储
    localStorage.removeItem('mindweaver_user');
    localStorage.setItem('mindweaver_is_guest', 'true');
  };

  // 切换到用户模式
  const switchToUser = (userData: User) => {
    setUser(userData);
    setIsGuest(false);
    setError(null);
    
    // 持久化存储
    localStorage.setItem('mindweaver_user', JSON.stringify(userData));
    localStorage.setItem('mindweaver_is_guest', 'false');
  };

  // 检查是否已认证
  const isAuthenticated = () => {
    return !isGuest && user !== null;
  };

  const value = {
    user,
    isGuest,
    isLoading,
    error,
    login,
    logout,
    updateUser,
    switchToGuest,
    switchToUser,
    isAuthenticated
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

// 自定义Hook
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export { UserContext };
