import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthService, User, RegisterData, LoginPasswordData, LoginCodeData, ResetPasswordData, VerificationCodeType } from '../services/api/AuthService';

interface UserContextType {
  user: User | null;
  isGuest: boolean;
  isLoading: boolean;
  error: string | null;
  token: string | null;
  isAuthenticated: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;

  register: (data: RegisterData) => Promise<void>;
  loginPassword: (data: LoginPasswordData) => Promise<void>;
  loginCode: (data: LoginCodeData) => Promise<void>;
  sendVerificationCode: (email: string, type: VerificationCodeType) => Promise<void>;
  resetPassword: (data: ResetPasswordData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  switchToGuest: () => void;
  switchToUser: (user: User) => void;
  syncData: () => Promise<void>;
  clearError: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  const isAuthenticated = !isGuest && user !== null && token !== null;

  useEffect(() => {
    const initializeUser = async () => {
      try {
        setIsLoading(true);
        
        const savedUser = localStorage.getItem('mindweaver_user');
        const savedIsGuest = localStorage.getItem('mindweaver_is_guest');
        const savedToken = localStorage.getItem('mindweaver_token');
        const savedLastSyncTime = localStorage.getItem('mindweaver_last_sync_time');
        
        if (savedUser && savedToken) {
          setUser(JSON.parse(savedUser));
          setToken(savedToken);
          setIsGuest(savedIsGuest === 'true');
          if (savedLastSyncTime) {
            setLastSyncTime(parseInt(savedLastSyncTime, 10));
          }
          
          try {
            const response = await AuthService.getCurrentUser();
            if (response.success && response.user) {
              setUser(response.user);
              localStorage.setItem('mindweaver_user', JSON.stringify(response.user));
            }
          } catch (err) {
            console.warn('Token validation failed, logging out:', err);
            await handleLogout(false);
          }
        } else {
          // 检查 URL 参数，处理 GitHub 登录回调
          const urlParams = new URLSearchParams(window.location.search);
          const token = urlParams.get('token');
          const userStr = urlParams.get('user');

          if (token && userStr) {
            try {
              const user = JSON.parse(userStr);
              setUser(user);
              setToken(token);
              setIsGuest(false);
              setError(null);
              
              localStorage.setItem('mindweaver_token', token);
              localStorage.setItem('mindweaver_user', JSON.stringify(user));
              localStorage.setItem('mindweaver_is_guest', 'false');
              
              // 清除 URL 参数
              window.history.replaceState({}, document.title, window.location.pathname);
            } catch (error) {
              console.error('Failed to parse GitHub login data:', error);
              setIsGuest(true);
              localStorage.setItem('mindweaver_is_guest', 'true');
            }
          } else {
            setIsGuest(true);
            localStorage.setItem('mindweaver_is_guest', 'true');
          }
        }
        
        setError(null);
      } catch (err) {
        setError((err as Error).message);
        console.error('用户初始化错误:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeUser();
  }, []);

  const handleLoginSuccess = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    setIsGuest(false);
    setError(null);
    
    localStorage.setItem('mindweaver_token', newToken);
    localStorage.setItem('mindweaver_user', JSON.stringify(newUser));
    localStorage.setItem('mindweaver_is_guest', 'false');
  };

  const handleLogout = async (callApi: boolean = true) => {
    if (callApi && token) {
      try {
        await AuthService.logout();
      } catch (err) {
        console.error('Logout API error:', err);
      }
    }
    
    setUser(null);
    setToken(null);
    setIsGuest(true);
    setError(null);
    setLastSyncTime(null);
    
    localStorage.removeItem('mindweaver_token');
    localStorage.removeItem('mindweaver_user');
    localStorage.removeItem('mindweaver_last_sync_time');
    localStorage.setItem('mindweaver_is_guest', 'true');
  };

  const register = async (data: RegisterData) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await AuthService.register(data);
      if (response.success && response.token && response.user) {
        handleLoginSuccess(response.token, response.user);
      } else {
        throw new Error(response.message || '注册失败');
      }
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginPassword = async (data: LoginPasswordData) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await AuthService.loginPassword(data);
      if (response.success && response.token && response.user) {
        handleLoginSuccess(response.token, response.user);
      } else {
        throw new Error(response.message || '登录失败');
      }
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginCode = async (data: LoginCodeData) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await AuthService.loginCode(data);
      if (response.success && response.token && response.user) {
        handleLoginSuccess(response.token, response.user);
      } else {
        throw new Error(response.message || '登录失败');
      }
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const sendVerificationCode = async (email: string, type: VerificationCodeType) => {
    try {
      setError(null);
      const response = await AuthService.sendVerificationCode(email, type);
      if (!response.success) {
        throw new Error(response.message || '发送验证码失败');
      }
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  const resetPassword = async (data: ResetPasswordData) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await AuthService.resetPasswordConfirm(data);
      if (!response.success) {
        throw new Error(response.message || '重置密码失败');
      }
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await handleLogout(true);
  };

  const updateUser = async (userData: Partial<User>) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await AuthService.updateUser(userData);
      if (response.success && response.user) {
        setUser(response.user);
        localStorage.setItem('mindweaver_user', JSON.stringify(response.user));
      } else {
        throw new Error('更新用户信息失败');
      }
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const switchToGuest = () => {
    setUser(null);
    setToken(null);
    setIsGuest(true);
    setError(null);
    
    localStorage.removeItem('mindweaver_token');
    localStorage.removeItem('mindweaver_user');
    localStorage.setItem('mindweaver_is_guest', 'true');
  };

  const switchToUser = (userData: User) => {
    setUser(userData);
    setIsGuest(false);
    setError(null);
    
    localStorage.setItem('mindweaver_user', JSON.stringify(userData));
    localStorage.setItem('mindweaver_is_guest', 'false');
  };

  const syncData = async () => {
    try {
      setIsSyncing(true);
      setError(null);
      setLastSyncTime(Date.now());
      localStorage.setItem('mindweaver_last_sync_time', Date.now().toString());
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    isGuest,
    isLoading,
    error,
    token,
    isAuthenticated,
    isSyncing,
    lastSyncTime,
    register,
    loginPassword,
    loginCode,
    sendVerificationCode,
    resetPassword,
    logout,
    updateUser,
    switchToGuest,
    switchToUser,
    syncData,
    clearError,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser 必须在 UserProvider 内部使用');
  }
  return context;
};

export { UserContext };
