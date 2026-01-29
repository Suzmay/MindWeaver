import { useState, useEffect } from 'react';
import { Camera, Github, User, Lock, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { useUser } from '../context/UserContext';

export function AccountPage() {
  const { user, isGuest, updateUser, switchToUser } = useUser();
  const [isEditing, setIsEditing] = useState(false);
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
    const newErrors: { username?: string; email?: string } = {};

    if (!username.trim()) {
      newErrors.username = '用户名不能为空';
    } else if (username.length < 2) {
      newErrors.username = '用户名至少需要2个字符';
    } else if (username.length > 20) {
      newErrors.username = '用户名最多20个字符';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = '邮箱不能为空';
    } else if (!emailRegex.test(email)) {
      newErrors.email = '请输入有效的邮箱地址';
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
        // 更新用户信息
        updateUser({
          username: username.trim(),
          email: email.trim(),
          avatar
        });
      }
      setIsEditing(false);
    }
  };

  // 与后端API交换code获取用户信息
  const exchangeCodeForToken = async (code: string) => {
    console.log('开始与后端API交换code获取用户信息');
    try {
      const response = await fetch('/api/auth/github/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });
      
      console.log('API响应状态:', response.status);
      
      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('API响应数据:', data);
      
      return data;
    } catch (error) {
      console.error('Exchange code error:', error);
      throw error;
    }
  };

  const handleGitHubLogin = () => {
    console.log('开始GitHub登录流程');
    // GitHub OAuth应用配置
    const clientId = (import.meta as any).env.VITE_GITHUB_CLIENT_ID || 'YOUR_GITHUB_CLIENT_ID'; // 使用类型断言避免类型错误
    console.log('GitHub Client ID:', clientId);
    
    const redirectUri = encodeURIComponent(`${window.location.origin}`); // 回调到根路径，因为使用的是条件渲染而非React Router
    console.log('Redirect URI:', redirectUri);
    
    const scope = 'user:email user'; // 扩展权限范围以获取完整用户信息
    
    // 生成随机状态值，防止CSRF攻击
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('github_oauth_state', state);
    console.log('Generated state:', state);
    
    // 重定向到GitHub授权页面
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
    console.log('GitHub Auth URL:', authUrl);
    window.location.href = authUrl;
  };

  // 处理GitHub登录回调
  useEffect(() => {
    const handleGitHubCallback = async () => {
      console.log('开始处理GitHub回调');
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const storedState = localStorage.getItem('github_oauth_state');
      
      console.log('Callback parameters:', {
        code: code ? '***' : null, // 隐藏code值
        state,
        storedState,
        hasCode: !!code,
        hasState: !!state,
        stateMatches: state === storedState
      });
      
      if (code && state && state === storedState) {
        try {
          // 清除存储的状态
          localStorage.removeItem('github_oauth_state');
          console.log('已清除存储的state');
          
          // 调用后端API交换code获取用户信息
          console.log('调用后端API交换code获取用户信息');
          const apiResponse = await exchangeCodeForToken(code);
          
          console.log('API响应处理中...');
          
          if (apiResponse.success && apiResponse.user) {
            console.log('API返回用户信息:', apiResponse.user);
            
            // 转换为应用用户格式
            const appUser = {
              id: apiResponse.user.id.toString(),
              username: apiResponse.user.username,
              email: apiResponse.user.email,
              avatar: apiResponse.user.avatar
            };
            
            console.log('应用用户数据:', appUser);
            
            // 登录用户
            console.log('开始登录用户');
            switchToUser(appUser);
            console.log('用户登录成功');
            
            // 存储登录状态，用于App组件识别
            localStorage.setItem('mindweaver_github_login', 'true');
            
            // 清除URL参数
            console.log('清除URL参数');
            window.history.replaceState({}, document.title, '/');
            
            // 提示用户登录成功
            console.log('GitHub登录成功，用户信息已更新');
            toast.success('GitHub登录成功', {
              description: '已成功获取您的GitHub账号信息',
              duration: 3000,
            });
          } else {
            throw new Error('API返回数据格式错误');
          }
        } catch (error) {
          console.error('GitHub login error:', error);
          // 清除存储的状态
          localStorage.removeItem('github_oauth_state');
          // 清除URL参数
          window.history.replaceState({}, document.title, '/');
          // 显示错误通知
          toast.error('GitHub登录失败，请重试', {
            description: '无法获取用户信息，请检查网络连接后重试',
            duration: 5000,
          });
        }
      } else if (urlParams.has('error')) {
        // 处理GitHub返回的错误
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        console.error('GitHub OAuth error:', error, errorDescription);
        // 清除URL参数
        window.history.replaceState({}, document.title, '/');
        // 显示错误通知
        toast.error('GitHub授权失败', {
          description: errorDescription || '请检查您的授权设置',
          duration: 5000,
        });
      }
    };
    
    handleGitHubCallback();
  }, []);

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

      {/* Guest Mode Warning */}
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

      {/* Profile Card */}
      <Card className="rounded-2xl shadow-ocean border-2 border-primary/10">
        <CardHeader>
          <CardTitle>个人资料</CardTitle>
          <CardDescription>管理个人信息与头像</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
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

          {/* User Info */}
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
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) {
                        setErrors({ ...errors, email: undefined });
                      }
                    }}
                    className={`rounded-lg ${errors.email ? 'border-destructive' : ''}`}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{email}</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
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

      {/* Login Options */}
      <Card className="rounded-2xl shadow-ocean border-2 border-primary/10">
        <CardHeader>
          <CardTitle>登录选项</CardTitle>
          <CardDescription>使用第三方账号登录</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <Github className="w-5 h-5" />
              <span>GitHub</span>
            </div>
            <Button type="button" onClick={() => handleGitHubLogin()} className="rounded-2xl bg-gradient-to-br from-primary to-secondary hover:opacity-90 shadow-ocean font-semibold">
              登录
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
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
    </div>
  );
}
