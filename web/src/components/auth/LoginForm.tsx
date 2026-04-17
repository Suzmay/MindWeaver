import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Turnstile } from '@marsidev/react-turnstile';
import { useUser } from '../../context/UserContext';
import { Loader2 } from 'lucide-react';

interface LoginFormProps {
  onSuccess: () => void;
  onSwitchToResetPassword: () => void;
}

type LoginMethod = 'password' | 'code';

interface PasswordFormData {
  email: string;
  password: string;
}

interface CodeFormData {
  email: string;
  code: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onSwitchToResetPassword,
}) => {
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('password');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const { loginPassword, loginCode, sendVerificationCode, isLoading, error, clearError } = useUser();

  const passwordForm = useForm<PasswordFormData>();
  const codeForm = useForm<CodeFormData>();

  const handlePasswordSubmit = async (data: PasswordFormData) => {
    try {
      clearError();
      await loginPassword({
        ...data,
        turnstileToken: turnstileToken || undefined,
      });
      onSuccess();
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  const handleCodeSubmit = async (data: CodeFormData) => {
    try {
      clearError();
      await loginCode({
        ...data,
        turnstileToken: turnstileToken || undefined,
      });
      onSuccess();
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  const handleSendCode = async () => {
    const email = codeForm.getValues('email');
    if (!email) {
      codeForm.setError('email', { message: '请输入邮箱' });
      return;
    }

    try {
      clearError();
      setIsSendingCode(true);
      await sendVerificationCode(email, 'login');
      setCodeSent(true);
    } catch (err) {
      console.error('Send code failed:', err);
    } finally {
      setIsSendingCode(false);
    }
  };

  return (
    <div className="space-y-4">
      <Tabs value={loginMethod} onValueChange={(v) => setLoginMethod(v as LoginMethod)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="password">密码登录</TabsTrigger>
          <TabsTrigger value="code">验证码登录</TabsTrigger>
        </TabsList>

        <TabsContent value="password" className="space-y-4 mt-4">
          <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                {...passwordForm.register('email', { required: '请输入邮箱' })}
              />
              {passwordForm.formState.errors.email && (
                <p className="text-sm text-red-500">{passwordForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">密码</Label>
                <Button
                  variant="link"
                  className="px-0 h-auto text-sm"
                  type="button"
                  onClick={onSwitchToResetPassword}
                >
                  忘记密码？
                </Button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...passwordForm.register('password', { required: '请输入密码' })}
              />
              {passwordForm.formState.errors.password && (
                <p className="text-sm text-red-500">{passwordForm.formState.errors.password.message}</p>
              )}
            </div>

            <div className="flex justify-center">
              <Turnstile
                siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
                onSuccess={setTurnstileToken}
                onExpire={() => setTurnstileToken(null)}
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" className="w-full rounded-2xl bg-gradient-to-br from-primary to-secondary hover:opacity-90 shadow-ocean font-semibold" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  登录中...
                </>
              ) : (
                '登录'
              )}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="code" className="space-y-4 mt-4">
          <form onSubmit={codeForm.handleSubmit(handleCodeSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code-email">邮箱</Label>
              <div className="flex gap-2">
                <Input
                  id="code-email"
                  type="email"
                  placeholder="your@email.com"
                  {...codeForm.register('email', { required: '请输入邮箱' })}
                />
                <Button
                  type="button"
                  className="rounded-2xl bg-gradient-to-br from-primary to-secondary hover:opacity-90 shadow-ocean font-semibold"
                  onClick={handleSendCode}
                  disabled={isSendingCode || codeSent}
                >
                  {isSendingCode ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : codeSent ? (
                    '已发送'
                  ) : (
                    '发送验证码'
                  )}
                </Button>
              </div>
              {codeForm.formState.errors.email && (
                <p className="text-sm text-red-500">{codeForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">验证码</Label>
              <Input
                id="code"
                type="text"
                placeholder="6位验证码"
                maxLength={6}
                {...codeForm.register('code', { required: '请输入验证码', pattern: { value: /^\d{6}$/, message: '请输入6位数字' } })}
              />
              {codeForm.formState.errors.code && (
                <p className="text-sm text-red-500">{codeForm.formState.errors.code.message}</p>
              )}
            </div>

            <div className="flex justify-center">
              <Turnstile
                siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
                onSuccess={setTurnstileToken}
                onExpire={() => setTurnstileToken(null)}
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" className="w-full rounded-2xl bg-gradient-to-br from-primary to-secondary hover:opacity-90 shadow-ocean font-semibold" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  登录中...
                </>
              ) : (
                '登录'
              )}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
};
