import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Turnstile } from '@marsidev/react-turnstile';
import { useUser } from '../../context/UserContext';
import { Loader2 } from 'lucide-react';

interface ResetPasswordFormProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
}

type Step = 'request' | 'reset';

interface RequestFormData {
  email: string;
}

interface ResetFormData {
  code: string;
  newPassword: string;
  confirmPassword: string;
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  onSuccess,
  onSwitchToLogin,
}) => {
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const { sendVerificationCode, resetPassword, isLoading, error, clearError } = useUser();

  const requestForm = useForm<RequestFormData>({
    mode: 'onChange'
  });
  const resetForm = useForm<ResetFormData>({
    mode: 'onChange'
  });

  const handleRequestSubmit = async (data: RequestFormData) => {
    try {
      clearError();
      setIsSendingCode(true);
      await sendVerificationCode(data.email, 'reset_password');
      setEmail(data.email);
      setStep('reset');
    } catch (err) {
      console.error('Send code failed:', err);
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleResetSubmit = async (data: ResetFormData) => {
    if (data.newPassword !== data.confirmPassword) {
      resetForm.setError('confirmPassword', { message: '两次输入的密码不一致' });
      return;
    }

    try {
      clearError();
      await resetPassword({
        email,
        code: data.code,
        newPassword: data.newPassword,
        turnstileToken: turnstileToken || '',
      });
      onSuccess();
    } catch (err) {
      console.error('Reset password failed:', err);
    }
  };

  return (
    <div className="space-y-4">
      {step === 'request' ? (
        <form onSubmit={requestForm.handleSubmit(handleRequestSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email">邮箱</Label>
            <Input
              id="reset-email"
              type="email"
              placeholder="your@email.com"
              {...requestForm.register('email', { required: '请输入邮箱' })}
            />
            {requestForm.formState.errors.email && (
              <p className="text-sm text-red-500">{requestForm.formState.errors.email.message}</p>
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

          <div className="space-y-2">
            <Button type="submit" className="w-full rounded-2xl bg-gradient-to-br from-primary to-secondary hover:opacity-90 shadow-ocean font-semibold" disabled={isLoading || isSendingCode}>
              {isSendingCode ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  发送中...
                </>
              ) : (
                '发送验证码'
              )}
            </Button>
            <Button variant="ghost" className="w-full" type="button" onClick={onSwitchToLogin}>
              返回登录
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={resetForm.handleSubmit(handleResetSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-code">验证码</Label>
            <Input
              id="reset-code"
              type="text"
              placeholder="6位验证码"
              maxLength={6}
              {...resetForm.register('code', { required: '请输入验证码', pattern: { value: /^\d{6}$/, message: '请输入6位数字' } })}
            />
            {resetForm.formState.errors.code && (
              <p className="text-sm text-red-500">{resetForm.formState.errors.code.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">新密码</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="至少8位，包含字母和数字"
              {...resetForm.register('newPassword', {
                required: '请输入新密码',
                minLength: { value: 8, message: '密码至少8位' },
                pattern: {
                  value: /^(?=.*[A-Za-z])(?=.*\d).+$/,
                  message: '密码必须包含字母和数字',
                },
              })}
            />
            {resetForm.formState.errors.newPassword && (
              <p className="text-sm text-red-500">{resetForm.formState.errors.newPassword.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-new-password">确认新密码</Label>
            <Input
              id="confirm-new-password"
              type="password"
              placeholder="再次输入新密码"
              {...resetForm.register('confirmPassword', { required: '请确认新密码' })}
            />
            {resetForm.formState.errors.confirmPassword && (
              <p className="text-sm text-red-500">{resetForm.formState.errors.confirmPassword.message}</p>
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

          <div className="space-y-2">
            <Button type="submit" className="w-full rounded-2xl bg-gradient-to-br from-primary to-secondary hover:opacity-90 shadow-ocean font-semibold" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  重置中...
                </>
              ) : (
                '重置密码'
              )}
            </Button>
            <Button variant="ghost" className="w-full" type="button" onClick={onSwitchToLogin}>
              返回登录
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
