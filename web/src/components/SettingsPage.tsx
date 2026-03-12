import { useState, useEffect } from 'react';
import { Moon, Sun, Monitor, Trash2, AlertTriangle, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { useTheme } from '../context/ThemeContext';
import { useStorage } from '../context/StorageContext';
import { UserPreferencesService } from '../services/storage/UserPreferencesService';

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { resetDatabase } = useStorage();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [restoreDefaultsDialogOpen, setRestoreDefaultsDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  // 设置状态
  const [autoSaveInterval, setAutoSaveInterval] = useState<number>(5);
  const [enableVersionHistory, setEnableVersionHistory] = useState<boolean>(true);
  const [sidebarWidth, setSidebarWidth] = useState<number>(280);
  const [defaultWindowSize, setDefaultWindowSize] = useState<string>('fullscreen');
  const [enableAnalytics, setEnableAnalytics] = useState<boolean>(false);
  const [enableAutoBackup, setEnableAutoBackup] = useState<boolean>(true);
  const [enableAutoUpdate, setEnableAutoUpdate] = useState<boolean>(true);
  
  const preferencesService = UserPreferencesService.getInstance();
  
  // 初始化设置
  useEffect(() => {
    const initSettings = async () => {
      await preferencesService.initialize();
      const preferences = preferencesService.getPreferences();
      setAutoSaveInterval(preferences.autoSaveInterval);
      setEnableVersionHistory(preferences.enableVersionHistory);
      setSidebarWidth(preferences.sidebarWidth);
      setDefaultWindowSize(preferences.defaultWindowSize);
      setEnableAnalytics(preferences.enableAnalytics);
      setEnableAutoBackup(preferences.enableAutoBackup);
      setEnableAutoUpdate(preferences.enableAutoUpdate);
    };
    
    initSettings();
  }, []);
  
  // 处理设置更改
  const handleSettingChange = async (key: string, value: any) => {
    await preferencesService.setPreference(key as any, value);
    
    // 触发设置生效
    if (key === 'sidebarWidth') {
      // 可以在这里触发侧边栏宽度的实时更新
      document.documentElement.style.setProperty('--sidebar-width', `${value}px`);
    }
  };
  
  // 处理自动保存间隔更改
  const handleAutoSaveChange = async (value: string) => {
    const interval = parseInt(value);
    setAutoSaveInterval(interval);
    await handleSettingChange('autoSaveInterval', interval);
  };
  
  // 处理版本历史开关更改
  const handleVersionHistoryChange = async (checked: boolean) => {
    setEnableVersionHistory(checked);
    await handleSettingChange('enableVersionHistory', checked);
  };
  
  // 处理默认窗口大小更改
  const handleWindowSizeChange = async (value: string) => {
    setDefaultWindowSize(value);
    await handleSettingChange('defaultWindowSize', value);
  };
  
  // 处理分析开关更改
  const handleAnalyticsChange = async (checked: boolean) => {
    setEnableAnalytics(checked);
    await handleSettingChange('enableAnalytics', checked);
  };
  
  // 处理自动备份开关更改
  const handleAutoBackupChange = async (checked: boolean) => {
    setEnableAutoBackup(checked);
    await handleSettingChange('enableAutoBackup', checked);
  };
  
  // 处理自动更新开关更改
  const handleAutoUpdateChange = async (checked: boolean) => {
    setEnableAutoUpdate(checked);
    await handleSettingChange('enableAutoUpdate', checked);
  };
  
  // 恢复默认设置
  const handleRestoreDefaults = async () => {
    await preferencesService.resetPreferences();
    alert('已恢复默认设置！');
    window.location.reload();
  };
  
  // 重置数据库
  const handleResetDatabase = async () => {
    setIsResetting(true);
    try {
      await resetDatabase();
      // 重置后也重置用户偏好设置
      await preferencesService.resetPreferences();
      alert('数据库重置成功！所有数据已清空，页面将刷新。');
      window.location.reload();
    } catch (error) {
      alert('数据库重置失败：' + (error as Error).message);
    } finally {
      setIsResetting(false);
      setResetDialogOpen(false);
    }
  };
  
  return (
    <div className="max-w-[800px] mx-auto p-8 space-y-6">
      <h1>系统设置</h1>

      {/* 通用设置 */}
      <Card className="rounded-2xl shadow-ocean border-2 border-primary/10">
        <CardHeader>
          <CardTitle>通用</CardTitle>
          <CardDescription>查看应用信息与基础偏好</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>应用版本</Label>
              <p className="text-sm text-muted-foreground">MindWeaver v1.0.0</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 工作区设置 */}
      <Card className="rounded-2xl shadow-ocean border-2 border-primary/10">
        <CardHeader>
          <CardTitle>工作区</CardTitle>
          <CardDescription>调整工作区偏好设置</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="autosave">自动保存间隔</Label>
            <Select 
              value={autoSaveInterval.toString()} 
              onValueChange={handleAutoSaveChange}
            >
              <SelectTrigger id="autosave" className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="1">1 分钟</SelectItem>
                <SelectItem value="5">5 分钟</SelectItem>
                <SelectItem value="10">10 分钟</SelectItem>
                <SelectItem value="30">30 分钟</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="version-history">开启版本历史</Label>
              <p className="text-sm text-muted-foreground">
                保存历史版本，随时回溯
              </p>
            </div>
            <Switch 
              id="version-history" 
              checked={enableVersionHistory}
              onCheckedChange={handleVersionHistoryChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* 外观设置 */}
      <Card className="rounded-2xl shadow-ocean border-2 border-primary/10">
        <CardHeader>
          <CardTitle>外观</CardTitle>
          <CardDescription>定制属于你的深海体验</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>主题</Label>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="outline"
                onClick={() => setTheme('light')}
                className={`rounded-2xl flex-col h-auto py-4 gap-2 border-2 transition-all ${theme === 'light' ? 'border-primary bg-primary/10 hover:text-primary' : 'border-primary/30 bg-white hover:bg-primary/5 hover:border-primary/50 hover:text-muted-foreground'}`}
              >
                <Sun className={`w-6 h-6 ${theme === 'light' ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-xs ${theme === 'light' ? 'font-bold text-primary' : 'font-semibold'}`}>浅海晨光</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setTheme('dark')}
                className={`rounded-2xl flex-col h-auto py-4 gap-2 border-2 transition-all ${theme === 'dark' ? 'border-secondary bg-secondary/10 hover:text-secondary' : 'border-primary/30 bg-white hover:bg-primary/5 hover:border-primary/50 hover:text-muted-foreground'}`}
              >
                <Moon className={`w-6 h-6 ${theme === 'dark' ? 'text-secondary' : 'text-muted-foreground'}`} />
                <span className={`text-xs ${theme === 'dark' ? 'font-bold text-secondary' : 'font-semibold'}`}>深海夜色</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setTheme('auto')}
                className={`rounded-2xl flex-col h-auto py-4 gap-2 border-2 transition-all ${theme === 'auto' ? 'border-accent bg-accent/10 hover:text-accent' : 'border-primary/30 bg-white hover:bg-primary/5 hover:border-primary/50 hover:text-muted-foreground'}`}
              >
                <Monitor className={`w-6 h-6 ${theme === 'auto' ? 'text-accent' : 'text-muted-foreground'}`} />
                <span className={`text-xs ${theme === 'auto' ? 'font-bold text-accent' : 'font-semibold'}`}>自动跟随</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {theme === 'light' && '☀️ 浅海模式：明亮而充满活力'}
              {theme === 'dark' && '🌙 深海模式：沉静而充满神秘'}
              {theme === 'auto' && '🔄 自动模式：智能跟随系统偏好'}
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="sidebar-width">侧边栏宽度</Label>
              <span className="text-sm text-muted-foreground">{sidebarWidth}px</span>
            </div>
            <div className="flex gap-3">
              <input
                type="number"
                id="sidebar-width-input"
                value={sidebarWidth}
                min={240}
                max={320}
                step={10}
                onChange={(e) => setSidebarWidth(parseInt(e.target.value) || 240)}
                className="flex-1 rounded-xl border border-primary/30 bg-input-background px-4 py-2 text-sm hover:border-primary/30 hover:bg-input-background"
                placeholder="输入宽度"
              />
              <Button
                type="button"
                variant="outline"
                className="rounded-2xl border-primary/30 bg-white hover:opacity-90 hover:text-foreground"
                onClick={() => handleSettingChange('sidebarWidth', sidebarWidth)}
              >
                确认
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="window-size">默认窗口大小</Label>
            <Select 
              value={defaultWindowSize} 
              onValueChange={handleWindowSizeChange}
            >
              <SelectTrigger id="window-size" className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="small">小屏（1024×768）</SelectItem>
                <SelectItem value="medium">中屏（1280×720）</SelectItem>
                <SelectItem value="large">大屏（1920×1080）</SelectItem>
                <SelectItem value="xlarge">超大屏（2560×1440）</SelectItem>
                <SelectItem value="fullscreen">全屏</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 其他设置 */}
      <Card className="rounded-2xl shadow-ocean border-2 border-primary/10">
        <CardHeader>
          <CardTitle>其他</CardTitle>
          <CardDescription>更多偏好选项</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="analytics">匿名使用分析</Label>
              <p className="text-sm text-muted-foreground">
                通过匿名数据帮助我们持续改进 MindWeaver
              </p>
            </div>
            <Switch 
              id="analytics" 
              checked={enableAnalytics}
              onCheckedChange={handleAnalyticsChange}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auto-backup">自动备份</Label>
              <p className="text-sm text-muted-foreground">
                定期将作品备份到本地存储
              </p>
            </div>
            <Switch 
              id="auto-backup" 
              checked={enableAutoBackup}
              onCheckedChange={handleAutoBackupChange}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auto-update">自动更新</Label>
              <p className="text-sm text-muted-foreground">
                自动下载并安装新版
              </p>
            </div>
            <Switch 
              id="auto-update" 
              checked={enableAutoUpdate}
              onCheckedChange={handleAutoUpdateChange}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>重置数据库</Label>
              <p className="text-sm text-muted-foreground text-destructive">
                清空所有数据，包括作品、模板和设置
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setResetDialogOpen(true)}
              className="rounded-xl"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              重置
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 操作 */}
      <div className="flex gap-3">
        <Button type="button" variant="outline" className="rounded-2xl border-primary/30 bg-white hover:opacity-90 hover:text-foreground">
          发送反馈
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          className="rounded-2xl border-primary/30 bg-white hover:opacity-90 hover:text-foreground"
          onClick={() => setRestoreDefaultsDialogOpen(true)}
        >
          恢复默认
        </Button>
      </div>

      {/* 重置数据库对话框 */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="w-[400px] max-w-[90vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              确认重置数据库
            </DialogTitle>
            <DialogDescription>
              此操作将清空所有数据，包括作品、模板和设置。此操作不可撤销，确定要继续吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setResetDialogOpen(false)}
              className="rounded-xl hover:text-foreground bg-white dark:bg-transparent"
            >
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleResetDatabase}
              disabled={isResetting}
              className="rounded-xl"
            >
              {isResetting ? (
                <>
                  <Clock className="w-4 h-4 mr-1 animate-spin" />
                  重置中...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-1" />
                  确认重置
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 恢复默认设置对话框 */}
      <Dialog open={restoreDefaultsDialogOpen} onOpenChange={setRestoreDefaultsDialogOpen}>
        <DialogContent className="w-[400px] max-w-[90vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              确认恢复默认设置
            </DialogTitle>
            <DialogDescription>
              此操作将恢复所有偏好设置为默认值，包括主题、自动保存间隔等。确定要继续吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRestoreDefaultsDialogOpen(false)}
              className="rounded-xl hover:text-foreground bg-white dark:bg-transparent"
            >
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleRestoreDefaults}
              className="rounded-xl"
            >
              确认恢复
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
