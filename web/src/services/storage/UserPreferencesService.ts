import { SimpleEventEmitter } from './EventEmitterImpl';
import { EventType } from './interfaces/EventEmitter';

interface UserPreferences {
  // 工作区设置
  autoSaveInterval: number; // 自动保存间隔（分钟）
  enableVersionHistory: boolean; // 开启版本历史
  
  // 外观设置
  theme: 'light' | 'dark' | 'auto'; // 主题
  sidebarWidth: number; // 侧边栏宽度（像素）
  defaultWindowSize: string; // 默认窗口大小
  
  // 其他设置
  enableAnalytics: boolean; // 匿名使用分析
  enableAutoBackup: boolean; // 自动备份
  enableAutoUpdate: boolean; // 自动更新
}

const DEFAULT_PREFERENCES: UserPreferences = {
  autoSaveInterval: 5,
  enableVersionHistory: true,
  theme: 'auto',
  sidebarWidth: 280,
  defaultWindowSize: 'fullscreen',
  enableAnalytics: false,
  enableAutoBackup: true,
  enableAutoUpdate: true
};

const STORAGE_KEY = 'mindweaver_user_preferences';

export class UserPreferencesService {
  private static instance: UserPreferencesService;
  private preferences: UserPreferences;
  private eventEmitter = new SimpleEventEmitter();
  private initialized = false;

  private constructor() {
    this.preferences = DEFAULT_PREFERENCES;
  }

  static getInstance(): UserPreferencesService {
    if (!UserPreferencesService.instance) {
      UserPreferencesService.instance = new UserPreferencesService();
    }
    return UserPreferencesService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // 从本地存储加载偏好设置
      const storedPreferences = localStorage.getItem(STORAGE_KEY);
      if (storedPreferences) {
        this.preferences = {
          ...DEFAULT_PREFERENCES,
          ...JSON.parse(storedPreferences)
        };
      }
      
      this.initialized = true;
      
      this.eventEmitter.emit(EventType.INITIALIZED, {
        data: {
          message: 'User preferences service initialized successfully'
        }
      });
    } catch (error) {
      console.error('Failed to initialize user preferences service:', error);
      // 使用默认偏好设置
      this.preferences = DEFAULT_PREFERENCES;
      this.initialized = true;
    }
  }

  getPreferences(): UserPreferences {
    if (!this.initialized) {
      throw new Error('User preferences service not initialized');
    }
    return { ...this.preferences };
  }

  getPreference<T extends keyof UserPreferences>(key: T): UserPreferences[T] {
    if (!this.initialized) {
      throw new Error('User preferences service not initialized');
    }
    return this.preferences[key];
  }

  async setPreference<T extends keyof UserPreferences>(key: T, value: UserPreferences[T]): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    this.preferences[key] = value;
    await this.savePreferences();
    
    this.eventEmitter.emit(EventType.PREFERENCE_CHANGED, {
      data: {
        key,
        value,
        message: `Preference ${key} changed to ${value}`
      }
    });
  }

  async setPreferences(preferences: Partial<UserPreferences>): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    this.preferences = {
      ...this.preferences,
      ...preferences
    };
    await this.savePreferences();
    
    this.eventEmitter.emit(EventType.PREFERENCE_CHANGED, {
      data: {
        preferences,
        message: 'Multiple preferences changed'
      }
    });
  }

  async resetPreferences(): Promise<void> {
    this.preferences = DEFAULT_PREFERENCES;
    await this.savePreferences();
    
    this.eventEmitter.emit(EventType.PREFERENCE_CHANGED, {
      data: {
        message: 'Preferences reset to default'
      }
    });
  }

  private async savePreferences(): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences));
    } catch (error) {
      console.error('Failed to save preferences:', error);
      throw error;
    }
  }

  subscribe(eventType: EventType, callback: (data: any) => void): () => void {
    return this.eventEmitter.subscribe(eventType, callback);
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}
