import { useState, useEffect } from 'react';
import { Camera, Lock, AlertCircle, LogOut, Github } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { useUser } from '../context/UserContext';
import { LoginRegisterDialog } from './auth';

export function AccountPage() {
  const { user, isGuest, isAuthenticated, updateUser, switchToUser, logout } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [username, setUsername] = useState(user?.username || '张三');
  const [email, setEmail] = useState(user?.email || '张三@示例.中国');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [errors, setErrors] = useState<{ username?: string; email?: string }>({});
  const [isUploading, setIsUploading] = useState(false);

  // 监听用户信息变化，自动更新本地状态
  useEffect(() => {
    if (user) {
      setUsername(user.username || '张三');
      setEmail(user.email || '张三@示例.中国');
      setAvatar(user.avatar || '');
    }
  }, [user]);

  const validateForm = () => {
    const newErrors: { username?: string } = {};

    if (!username.trim()) {
      newErrors.username = '用户名不能为空';
    } else if (username.length < 2) {
      newErrors.username = '用户名至少需要2个字符';
    } else if (username.length > 20) {
      newErrors.username = '用户名最多20个字符';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setAvatar(result);
        setIsUploading(false);
      };
      reader.onerror = () => {
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRename = async () => {
    if (validateForm()) {
      if (isGuest) {
        // 从游客模式切换到用户模式
        switchToUser({
          id: Date.now().toString(),
          username: username.trim(),
          email: email.trim(),
          avatar
        });
      } else {
        // 更新用户信息（不包含邮箱，邮箱不可修改）
        updateUser({
          username: username.trim(),
          avatar
        });
      }
      setIsEditing(false);
    }
  };

  const handleLogin = () => {
    setLoginDialogOpen(true);
  };

  const handleRegister = () => {
    setRegisterDialogOpen(true);
  };

  const handleGitHubLogin = () => {
    // GitHub 登录逻辑
    // 这里需要实现 OAuth 2.0 流程
    // 1. 重定向到 GitHub 授权页面
    // 2. GitHub 回调后获取 token
    // 3. 调用后端 API 进行登录
    window.location.href = '/api/auth/github';
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('已成功登出');
    } catch (err) {
      toast.error('登出失败');
    }
  };

  return (
    <div className="max-w-[800px] mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1>账户设置</h1>
        {isGuest && (
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 gap-1">
            <Lock className="w-3 h-3" />
            游客模式
          </Badge>
        )}
      </div>

      {/* 游客模式警告 */}
      {isGuest && (
        <Card className="rounded-2xl border-2 border-warning/20 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-warning">游客模式</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  您当前处于游客模式，部分功能可能受限。请完善个人信息以获得完整功能体验。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 个人资料卡片 */}
      <Card className="rounded-2xl shadow-ocean border-2 border-primary/10">
        <CardHeader>
          <CardTitle>个人资料</CardTitle>
          <CardDescription>管理个人信息与头像</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 头像区域 */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <Avatar className="w-24 h-24 border-4 border-primary/20 shadow-ocean">
                <AvatarImage src={avatar} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-3xl">
                  {username.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <>
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    aria-hidden="true"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  >
                    <Camera className="w-6 h-6 text-white" />
                  </label>
                </>
              )}
            </div>
            {isEditing && (
              <Button variant="outline" className="rounded-lg" onClick={() => document.getElementById('avatar-upload')?.click()} disabled={isUploading}>
                {isUploading ? '上传中...' : '上传头像'}
              </Button>
            )}
          </div>

          {/* 用户信息 */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              {isEditing ? (
                <>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (errors.username) {
                        setErrors({ ...errors, username: undefined });
                      }
                    }}
                    className={`rounded-lg ${errors.username ? 'border-destructive' : ''}`}
                  />
                  {errors.username && (
                    <p className="text-sm text-destructive">{errors.username}</p>
                  )}
                </>
              ) : (
                <p className="text-lg">{username}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">邮箱地址</Label>
              {isEditing ? (
                <>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className="rounded-lg bg-muted cursor-not-allowed opacity-60"
                  />
                  <p className="text-xs text-muted-foreground">
                    {user?.loginType === 'github' ? 'GitHub 登录不支持修改邮箱' : '邮箱不可修改'}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{email}</p>
              )}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3">
            {isEditing ? (
              <>
                <Button onClick={handleRename} className="rounded-2xl bg-gradient-to-br from-primary to-secondary hover:opacity-90 shadow-ocean font-semibold">
                  保存更改
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setUsername(user?.username || '张三');
                    setEmail(user?.email || '张三@示例.中国');
                    setAvatar(user?.avatar || '');
                    setErrors({});
                  }}
                  className="rounded-2xl border-primary/30 hover:bg-primary/10"
                >
                  取消
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)} className="rounded-2xl bg-gradient-to-br from-primary to-secondary hover:opacity-90 shadow-ocean font-semibold">
                编辑资料
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 认证选项 */}
      <Card className="rounded-2xl shadow-ocean border-2 border-primary/10">
        <CardHeader>
          <CardTitle>认证选项</CardTitle>
          <CardDescription>
            {isAuthenticated ? '管理您的账户安全' : '注册或登录账号以获得完整功能体验'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isAuthenticated ? (
            <Button 
              onClick={handleLogout} 
              className="w-full sm:w-48 rounded-2xl bg-gradient-to-br from-destructive to-destructive/80 hover:opacity-90 shadow-ocean font-semibold"
            >
              <LogOut className="w-4 h-4 mr-2" />
              登出账号
            </Button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-6 w-full">
              <div className="flex-1">
                <Button onClick={handleRegister} className="w-full rounded-2xl bg-gradient-to-br from-primary to-secondary hover:opacity-90 shadow-ocean font-semibold">
                  注册账号
                </Button>
              </div>
              <div className="flex-1">
                <Button onClick={handleLogin} className="w-full rounded-2xl bg-gradient-to-br from-primary to-secondary hover:opacity-90 shadow-ocean font-semibold">
                  登录账号
                </Button>
              </div>
              <div className="flex-1">
                <Button 
                  onClick={handleGitHubLogin} 
                  className="w-full rounded-2xl bg-gradient-to-br from-primary to-secondary hover:opacity-90 shadow-ocean font-semibold"
                >
                  <Github className="w-4 h-4 mr-2" />
                  GitHub 登录
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 安全 */}
      <Card className="rounded-2xl shadow-ocean border-2 border-primary/10">
        <CardHeader>
          <CardTitle>安全</CardTitle>
          <CardDescription>管理密码与安全选项</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" className="rounded-2xl bg-gradient-to-br from-primary to-secondary hover:opacity-90 shadow-ocean font-semibold">
            修改密码
          </Button>
        </CardContent>
      </Card>

      {/* 登录对话框 */}
      <LoginRegisterDialog
        open={loginDialogOpen}
        onOpenChange={setLoginDialogOpen}
        mode="login"
      />

      {/* 注册对话框 */}
      <LoginRegisterDialog
        open={registerDialogOpen}
        onOpenChange={setRegisterDialogOpen}
        mode="register"
      />
    </div>
  );
}
