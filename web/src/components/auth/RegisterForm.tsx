import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Turnstile } from '@marsidev/react-turnstile';
import { useUser } from '../../context/UserContext';
import { Loader2 } from 'lucide-react';

interface RegisterFormProps {
  onSuccess: () => void;
}

interface RegisterFormData {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  code: string;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const { register: registerUser, sendVerificationCode, isLoading, error, clearError } = useUser();

  const form = useForm<RegisterFormData>();

  const handleSubmit = async (data: RegisterFormData) => {
    if (data.password !== data.confirmPassword) {
      form.setError('confirmPassword', { message: '两次输入的密码不一致' });
      return;
    }

    try {
      clearError();
      await registerUser({
        email: data.email,
        username: data.username,
        password: data.password,
        code: data.code,
        turnstileToken: turnstileToken || '',
      });
      onSuccess();
    } catch (err) {
      console.error('Register failed:', err);
    }
  };

  const handleSendCode = async () => {
    const email = form.getValues('email');
    if (!email) {
      form.setError('email', { message: '请输入邮箱' });
      return;
    }

    try {
      clearError();
      setIsSendingCode(true);
      await sendVerificationCode(email, 'register');
      setCodeSent(true);
    } catch (err) {
      console.error('Send code failed:', err);
    } finally {
      setIsSendingCode(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reg-email">邮箱</Label>
        <div className="flex gap-2">
          <Input
            id="reg-email"
            type="email"
            placeholder="your@email.com"
            {...form.register('email', { required: '请输入邮箱' })}
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
        {form.formState.errors.email && (
          <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-code">验证码</Label>
        <Input
          id="reg-code"
          type="text"
          placeholder="6位验证码"
          maxLength={6}
          {...form.register('code', { required: '请输入验证码', pattern: { value: /^\d{6}$/, message: '请输入6位数字' } })}
        />
        {form.formState.errors.code && (
          <p className="text-sm text-red-500">{form.formState.errors.code.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-username">用户名</Label>
        <Input
          id="reg-username"
          type="text"
          placeholder="您的用户名"
          {...form.register('username', { required: '请输入用户名', minLength: { value: 2, message: '用户名至少2个字符' } })}
        />
        {form.formState.errors.username && (
          <p className="text-sm text-red-500">{form.formState.errors.username.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-password">密码</Label>
        <Input
          id="reg-password"
          type="password"
          placeholder="至少8位，包含字母和数字"
          {...form.register('password', {
            required: '请输入密码',
            minLength: { value: 8, message: '密码至少8位' },
            pattern: {
              value: /^(?=.*[A-Za-z])(?=.*\d).+$/,
              message: '密码必须包含字母和数字',
            },
          })}
        />
        {form.formState.errors.password && (
          <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-confirm-password">确认密码</Label>
        <Input
          id="reg-confirm-password"
          type="password"
          placeholder="再次输入密码"
          {...form.register('confirmPassword', { required: '请确认密码' })}
        />
        {form.formState.errors.confirmPassword && (
          <p className="text-sm text-red-500">{form.formState.errors.confirmPassword.message}</p>
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
                  注册中...
                </>
              ) : (
                '注册'
              )}
            </Button>
    </form>
  );
};
