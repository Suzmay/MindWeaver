import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.VITE_WORKER_URL ? `${import.meta.env.VITE_WORKER_URL}/api` : '/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mindweaver_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  loginType?: 'email' | 'github';
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  code: string;
  turnstileToken: string;
}

export interface LoginPasswordData {
  email: string;
  password: string;
  turnstileToken?: string;
}

export interface LoginCodeData {
  email: string;
  code: string;
  turnstileToken?: string;
}

export interface ResetPasswordData {
  email: string;
  code: string;
  newPassword: string;
  turnstileToken: string;
}

export type VerificationCodeType = 'register' | 'login' | 'reset_password';

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
}

export class AuthService {
  static async sendVerificationCode(email: string, type: VerificationCodeType): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/auth/send-code', { email, type });
    return response.data;
  }

  static async verifyCode(email: string, code: string, type: VerificationCodeType): Promise<{ success: boolean; valid: boolean; message: string }> {
    const response = await api.post('/auth/verify-code', { email, code, type });
    return response.data;
  }

  static async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post('/auth/register', data);
    return response.data;
  }

  static async loginPassword(data: LoginPasswordData): Promise<AuthResponse> {
    const response = await api.post('/auth/login-password', data);
    return response.data;
  }

  static async loginCode(data: LoginCodeData): Promise<AuthResponse> {
    const response = await api.post('/auth/login-code', data);
    return response.data;
  }

  static async resetPasswordRequest(email: string, turnstileToken: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/auth/reset-password-request', { email, turnstileToken });
    return response.data;
  }

  static async resetPasswordConfirm(data: ResetPasswordData): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/auth/reset-password-confirm', data);
    return response.data;
  }

  static async getCurrentUser(): Promise<{ success: boolean; user?: User }> {
    const response = await api.get('/auth/me');
    return response.data;
  }

  static async updateUser(userData: Partial<User>): Promise<{ success: boolean; user?: User }> {
    const response = await api.put('/auth/me', userData);
    return response.data;
  }

  static async logout(): Promise<{ success: boolean }> {
    const response = await api.post('/auth/logout');
    return response.data;
  }
}
