import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { ResetPasswordForm } from './ResetPasswordForm';

interface LoginRegisterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'login' | 'register';
}

type ViewMode = 'login' | 'register' | 'reset-password';

export const LoginRegisterDialog: React.FC<LoginRegisterDialogProps> = ({
  open,
  onOpenChange,
  mode,
}) => {
  const [view, setView] = useState<ViewMode>(mode);

  const handleSwitchToResetPassword = () => {
    setView('reset-password');
  };

  const handleSwitchToLogin = () => {
    setView('login');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {view === 'login' && '登录'}
            {view === 'register' && '注册'}
            {view === 'reset-password' && '重置密码'}
          </DialogTitle>
          <DialogDescription>
            {view === 'login' && '登录您的 MindWeaver 账户'}
            {view === 'register' && '创建一个新的 MindWeaver 账户'}
            {view === 'reset-password' && '重置您的账户密码'}
          </DialogDescription>
        </DialogHeader>

        {view === 'login' && (
          <div className="mt-4">
            <LoginForm
              onSuccess={() => onOpenChange(false)}
              onSwitchToResetPassword={handleSwitchToResetPassword}
            />
          </div>
        )}

        {view === 'register' && (
          <div className="mt-4">
            <RegisterForm onSuccess={() => onOpenChange(false)} />
          </div>
        )}

        {view === 'reset-password' && (
          <div className="mt-4">
            <ResetPasswordForm
              onSuccess={handleSwitchToLogin}
              onSwitchToLogin={handleSwitchToLogin}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
