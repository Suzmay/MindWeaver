interface User {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  avatar?: string;
  createdAt: number;
  updatedAt: number;
  loginType?: 'email' | 'github';
}

interface VerificationCode {
  code: string;
  expiresAt: number;
  attempts: number;
}

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: any): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; limit?: number }): Promise<{ keys: { name: string }[] }>;
}

interface R2Bucket {
  put(key: string, value: any, options?: any): Promise<any>;
  get(key: string): Promise<any>;
  delete(key: string): Promise<void>;
  list(options?: any): Promise<any>;
}

interface Env {
  USERS_KV: KVNamespace;
  WORKS_KV: KVNamespace;
  ASSETS_KV: KVNamespace;
  VERSIONS_KV: KVNamespace;
  PREFERENCES_KV: KVNamespace;
  VERIFICATION_CODES_KV: KVNamespace;
  TOKEN_BLACKLIST_KV: KVNamespace;
  ASSETS_R2: R2Bucket;
  TURNSTILE_SITE_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  EMAIL_FROM: string;
  EMAIL_FROM_NAME: string;
  JWT_SECRET: string;
  GH_CLIENT_ID: string;
  GH_CLIENT_SECRET: string;
  RESEND_API_KEY?: string;
}

function generateRandomCode(length: number = 6): string {
  const chars = '0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateUserId(): string {
  return 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

async function verifyTurnstile(token: string, secretKey: string): Promise<boolean> {
  if (!secretKey || secretKey.startsWith('REPLACE_WITH_')) {
    console.warn('Turnstile not configured, skipping verification');
    return true;
  }

  try {
    const formData = new FormData();
    formData.append('secret', secretKey);
    formData.append('response', token);

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return false;
  }
}

async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string,
  env: Env
): Promise<boolean> {
  const from = env.EMAIL_FROM || 'noreply@mindweaver.com';
  const fromName = env.EMAIL_FROM_NAME || 'MindWeaver';

  try {
    if (!env.RESEND_API_KEY) {
      console.warn(`No Resend API key configured, logging code instead. To: ${to}, Subject: ${subject}`);
      return false;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName} <${from}>`,
        to: [to],
        subject,
        html: htmlContent,
      }),
    });

    if (response.ok) {
      console.log(`Email sent to ${to} via Resend`);
      return true;
    }

    console.error('Resend error:', await response.text());
    return false;
  } catch (error) {
    console.error('Send email error:', error);
    return false;
  }
}

function getEmailTemplate(type: string, code: string): { subject: string; html: string } {
  const subjects: Record<string, string> = {
    register: '欢迎注册 MindWeaver - 您的验证码',
    login: 'MindWeaver 登录验证码',
    reset_password: 'MindWeaver 密码重置验证码',
  };

  const subject = subjects[type] || 'MindWeaver 验证码';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .code { 
      font-size: 32px; 
      font-weight: bold; 
      letter-spacing: 8px; 
      color: #2563eb; 
      text-align: center; 
      padding: 20px; 
      background: #f0f9ff; 
      border-radius: 8px; 
      margin: 20px 0;
    }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h2>您好！</h2>
    <p>这是您的 MindWeaver 验证码：</p>
    <div class="code">${code}</div>
    <p>验证码有效期为 10 分钟，请尽快使用。</p>
    <p>如果这不是您本人的操作，请忽略此邮件。</p>
    <div class="footer">
      <p>此邮件由 MindWeaver 自动发送，请勿回复。</p>
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}

export async function handleSendVerificationCode(request: Request, env: Env): Promise<Response> {
  try {
    const { email, type } = await request.json();

    if (!email || !type) {
      return new Response(JSON.stringify({ success: false, message: '缺少必要参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const validTypes = ['register', 'login', 'reset_password'];
    if (!validTypes.includes(type)) {
      return new Response(JSON.stringify({ success: false, message: '无效的验证码类型' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const codeKey = `${email}_${type}`;
    const existingCode = await env.VERIFICATION_CODES_KV.get(codeKey);
    
    if (existingCode) {
      const codeData: VerificationCode = JSON.parse(existingCode);
      if (codeData.attempts >= 5) {
        return new Response(JSON.stringify({ success: false, message: '尝试次数过多，请稍后再试' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const code = generateRandomCode();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    const codeData: VerificationCode = {
      code,
      expiresAt,
      attempts: 0,
    };

    await env.VERIFICATION_CODES_KV.put(codeKey, JSON.stringify(codeData), {
      expirationTtl: 10 * 60,
    });

    const { subject, html } = getEmailTemplate(type, code);
    const emailSent = await sendEmail(email, subject, html, env);
    
    console.log(`Verification code for ${email} (${type}): ${code}`);
    if (!emailSent) {
      console.warn('Email not sent, but verification code stored in KV');
    }

    return new Response(JSON.stringify({ success: true, message: '验证码已发送' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Send verification code error:', error);
    return new Response(JSON.stringify({ success: false, message: '发送验证码失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function handleVerifyCode(request: Request, env: Env): Promise<Response> {
  try {
    const { email, code, type } = await request.json();

    if (!email || !code || !type) {
      return new Response(JSON.stringify({ success: false, valid: false, message: '缺少必要参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const codeKey = `${email}_${type}`;
    const existingCode = await env.VERIFICATION_CODES_KV.get(codeKey);

    if (!existingCode) {
      return new Response(JSON.stringify({ success: false, valid: false, message: '验证码已过期或不存在' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const codeData: VerificationCode = JSON.parse(existingCode);

    if (Date.now() > codeData.expiresAt) {
      await env.VERIFICATION_CODES_KV.delete(codeKey);
      return new Response(JSON.stringify({ success: false, valid: false, message: '验证码已过期' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    codeData.attempts += 1;
    await env.VERIFICATION_CODES_KV.put(codeKey, JSON.stringify(codeData), {
      expirationTtl: Math.ceil((codeData.expiresAt - Date.now()) / 1000),
    });

    if (codeData.code !== code) {
      return new Response(JSON.stringify({ success: false, valid: false, message: '验证码错误' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await env.VERIFICATION_CODES_KV.delete(codeKey);

    return new Response(JSON.stringify({ success: true, valid: true, message: '验证成功' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Verify code error:', error);
    return new Response(JSON.stringify({ success: false, valid: false, message: '验证失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function hashPassword(password: string, secret: string = 'fallback-secret'): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hash: string, secret: string = 'fallback-secret'): Promise<boolean> {
  const inputHash = await hashPassword(password, secret);
  return inputHash === hash;
}

function generateToken(userId: string, secret: string): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: userId,
    iat: Date.now(),
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
  }));
  const signature = btoa(secret + header + payload);
  return `${header}.${payload}.${signature}`;
}

function verifyToken(token: string, _secret: string): { userId: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    if (Date.now() > payload.exp) return null;

    return { userId: payload.sub };
  } catch {
    return null;
  }
}

export async function handleRegister(request: Request, env: Env): Promise<Response> {
  try {
    const { email, username, password, code, turnstileToken } = await request.json();

    if (!email || !username || !password || !code) {
      return new Response(JSON.stringify({ success: false, message: '缺少必要参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (turnstileToken) {
      const isTurnstileValid = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET_KEY);
      if (!isTurnstileValid) {
        return new Response(JSON.stringify({ success: false, message: '人机验证失败' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const codeKey = `${email}_register`;
    const existingCode = await env.VERIFICATION_CODES_KV.get(codeKey);
    if (!existingCode) {
      return new Response(JSON.stringify({ success: false, message: '验证码已过期或不存在' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const codeData: VerificationCode = JSON.parse(existingCode);
    if (codeData.code !== code) {
      return new Response(JSON.stringify({ success: false, message: '验证码错误' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await env.VERIFICATION_CODES_KV.delete(codeKey);

    const existingEmail = await env.USERS_KV.get(`email_${email}`);
    if (existingEmail) {
      return new Response(JSON.stringify({ success: false, message: '该邮箱已被注册' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userId = generateUserId();
    const passwordHash = await hashPassword(password, env.JWT_SECRET);

    const user: User = {
      id: userId,
      email,
      username,
      passwordHash,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      loginType: 'email',
    };

    await env.USERS_KV.put(`user_${userId}`, JSON.stringify(user));
    await env.USERS_KV.put(`email_${email}`, userId);

    const token = generateToken(userId, env.JWT_SECRET || 'fallback-secret');

    const userResponse = {
      id: user.id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      loginType: user.loginType,
    };

    return new Response(JSON.stringify({ success: true, token, user: userResponse }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Register error:', error);
    return new Response(JSON.stringify({ success: false, message: '注册失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function handleLoginPassword(request: Request, env: Env): Promise<Response> {
  try {
    const { email, password, turnstileToken } = await request.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ success: false, message: '缺少必要参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (turnstileToken) {
      const isTurnstileValid = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET_KEY);
      if (!isTurnstileValid) {
        return new Response(JSON.stringify({ success: false, message: '人机验证失败' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const userId = await env.USERS_KV.get(`email_${email}`);
    if (!userId) {
      return new Response(JSON.stringify({ success: false, message: '用户不存在' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userData = await env.USERS_KV.get(`user_${userId}`);
    if (!userData) {
      return new Response(JSON.stringify({ success: false, message: '用户不存在' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user: User = JSON.parse(userData);
    const isPasswordValid = await verifyPassword(password, user.passwordHash, env.JWT_SECRET);

    if (!isPasswordValid) {
      return new Response(JSON.stringify({ success: false, message: '密码错误' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = generateToken(userId, env.JWT_SECRET || 'fallback-secret');

    const userResponse = {
      id: user.id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      loginType: user.loginType,
    };

    return new Response(JSON.stringify({ success: true, token, user: userResponse }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Login password error:', error);
    return new Response(JSON.stringify({ success: false, message: '登录失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function handleLoginCode(request: Request, env: Env): Promise<Response> {
  try {
    const { email, code, turnstileToken } = await request.json();

    if (!email || !code) {
      return new Response(JSON.stringify({ success: false, message: '缺少必要参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (turnstileToken) {
      const isTurnstileValid = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET_KEY);
      if (!isTurnstileValid) {
        return new Response(JSON.stringify({ success: false, message: '人机验证失败' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const codeKey = `${email}_login`;
    const existingCode = await env.VERIFICATION_CODES_KV.get(codeKey);
    if (!existingCode) {
      return new Response(JSON.stringify({ success: false, message: '验证码已过期或不存在' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const codeData: VerificationCode = JSON.parse(existingCode);
    if (codeData.code !== code) {
      return new Response(JSON.stringify({ success: false, message: '验证码错误' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await env.VERIFICATION_CODES_KV.delete(codeKey);

    const userId = await env.USERS_KV.get(`email_${email}`);
    if (!userId) {
      return new Response(JSON.stringify({ success: false, message: '用户不存在' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userData = await env.USERS_KV.get(`user_${userId}`);
    if (!userData) {
      return new Response(JSON.stringify({ success: false, message: '用户不存在' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user: User = JSON.parse(userData);
    const token = generateToken(userId, env.JWT_SECRET || 'fallback-secret');

    const userResponse = {
      id: user.id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      loginType: user.loginType,
    };

    return new Response(JSON.stringify({ success: true, token, user: userResponse }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Login code error:', error);
    return new Response(JSON.stringify({ success: false, message: '登录失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function handleResetPasswordRequest(request: Request, env: Env): Promise<Response> {
  try {
    const { email, turnstileToken } = await request.json();

    if (!email) {
      return new Response(JSON.stringify({ success: false, message: '缺少必要参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (turnstileToken) {
      const isTurnstileValid = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET_KEY);
      if (!isTurnstileValid) {
        return new Response(JSON.stringify({ success: false, message: '人机验证失败' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const userId = await env.USERS_KV.get(`email_${email}`);
    if (!userId) {
      return new Response(JSON.stringify({ success: true, message: '如果该邮箱已注册，您将收到验证码' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const code = generateRandomCode();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    const codeData: VerificationCode = {
      code,
      expiresAt,
      attempts: 0,
    };

    await env.VERIFICATION_CODES_KV.put(`${email}_reset_password`, JSON.stringify(codeData), {
      expirationTtl: 10 * 60,
    });

    const { subject, html } = getEmailTemplate('reset_password', code);
    const emailSent = await sendEmail(email, subject, html, env);
    
    console.log(`Reset password code for ${email}: ${code}`);
    if (!emailSent) {
      console.warn('Email not sent, but verification code stored in KV');
    }

    return new Response(JSON.stringify({ success: true, message: '如果该邮箱已注册，您将收到验证码' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Reset password request error:', error);
    return new Response(JSON.stringify({ success: false, message: '请求失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function handleResetPasswordConfirm(request: Request, env: Env): Promise<Response> {
  try {
    const { email, code, newPassword, turnstileToken } = await request.json();

    if (!email || !code || !newPassword) {
      return new Response(JSON.stringify({ success: false, message: '缺少必要参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (turnstileToken) {
      const isTurnstileValid = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET_KEY);
      if (!isTurnstileValid) {
        return new Response(JSON.stringify({ success: false, message: '人机验证失败' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const codeKey = `${email}_reset_password`;
    const existingCode = await env.VERIFICATION_CODES_KV.get(codeKey);
    if (!existingCode) {
      return new Response(JSON.stringify({ success: false, message: '验证码已过期或不存在' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const codeData: VerificationCode = JSON.parse(existingCode);
    if (codeData.code !== code) {
      return new Response(JSON.stringify({ success: false, message: '验证码错误' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await env.VERIFICATION_CODES_KV.delete(codeKey);

    const userId = await env.USERS_KV.get(`email_${email}`);
    if (!userId) {
      return new Response(JSON.stringify({ success: false, message: '用户不存在' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userData = await env.USERS_KV.get(`user_${userId}`);
    if (!userData) {
      return new Response(JSON.stringify({ success: false, message: '用户不存在' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user: User = JSON.parse(userData);
    user.passwordHash = await hashPassword(newPassword, env.JWT_SECRET);
    user.updatedAt = Date.now();

    await env.USERS_KV.put(`user_${userId}`, JSON.stringify(user));

    return new Response(JSON.stringify({ success: true, message: '密码重置成功' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Reset password confirm error:', error);
    return new Response(JSON.stringify({ success: false, message: '重置密码失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function getUserIdFromToken(request: Request, env: Env): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  
  const isBlacklisted = await env.TOKEN_BLACKLIST_KV.get(token);
  if (isBlacklisted) {
    return null;
  }

  const result = verifyToken(token, env.JWT_SECRET || 'fallback-secret');
  return result ? result.userId : null;
}

export async function handleGetMe(request: Request, env: Env): Promise<Response> {
  try {
    const userId = await getUserIdFromToken(request, env);
    if (!userId) {
      return new Response(JSON.stringify({ success: false, message: '未授权' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userData = await env.USERS_KV.get(`user_${userId}`);
    if (!userData) {
      return new Response(JSON.stringify({ success: false, message: '用户不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user: User = JSON.parse(userData);
    const userResponse = {
      id: user.id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      loginType: user.loginType,
    };

    return new Response(JSON.stringify({ success: true, user: userResponse }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Get me error:', error);
    return new Response(JSON.stringify({ success: false, message: '获取用户信息失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function handleUpdateMe(request: Request, env: Env): Promise<Response> {
  try {
    const userId = await getUserIdFromToken(request, env);
    if (!userId) {
      return new Response(JSON.stringify({ success: false, message: '未授权' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { username, avatar } = await request.json();

    const userData = await env.USERS_KV.get(`user_${userId}`);
    if (!userData) {
      return new Response(JSON.stringify({ success: false, message: '用户不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user: User = JSON.parse(userData);
    
    if (username) user.username = username;
    if (avatar !== undefined) user.avatar = avatar;
    user.updatedAt = Date.now();

    await env.USERS_KV.put(`user_${userId}`, JSON.stringify(user));

    const userResponse = {
      id: user.id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      loginType: user.loginType,
    };

    return new Response(JSON.stringify({ success: true, user: userResponse }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Update me error:', error);
    return new Response(JSON.stringify({ success: false, message: '更新用户信息失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function handleLogout(request: Request, env: Env): Promise<Response> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      await env.TOKEN_BLACKLIST_KV.put(token, 'true', {
        expirationTtl: 30 * 24 * 60 * 60,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Logout error:', error);
    return new Response(JSON.stringify({ success: false, message: '登出失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// GitHub 登录
export async function handleGitHubLogin(request: Request, env: Env): Promise<Response> {
  try {
    // 这里需要设置 GitHub OAuth 应用的 client_id
    // 您需要在 GitHub 开发者设置中创建一个 OAuth 应用
    const clientId = env.GH_CLIENT_ID || 'your-github-client-id';
    const redirectUri = `${new URL(request.url).origin}/api/auth/github/callback`;
    const scope = 'user:email';
    
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`;
    
    return new Response(null, {
      status: 302,
      headers: {
        Location: githubAuthUrl,
      },
    });
  } catch (error) {
    console.error('GitHub login error:', error);
    return new Response(JSON.stringify({ success: false, message: 'GitHub 登录失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// GitHub 回调
export async function handleGitHubCallback(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    
    if (!code) {
      return new Response(JSON.stringify({ success: false, message: '缺少授权码' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 这里需要设置 GitHub OAuth 应用的 client_id 和 client_secret
    const clientId = env.GH_CLIENT_ID || 'your-github-client-id';
    const clientSecret = env.GH_CLIENT_SECRET || 'your-github-client-secret';
    
    // 交换授权码获取 access_token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });
    
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    if (!accessToken) {
      return new Response(JSON.stringify({ success: false, message: '获取 access_token 失败' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 获取用户信息
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    const githubUser = await userResponse.json();
    
    // 获取用户邮箱
    const emailsResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    const emails = await emailsResponse.json();
    const primaryEmail = emails.find((email: any) => email.primary)?.email;
    
    if (!primaryEmail) {
      return new Response(JSON.stringify({ success: false, message: '无法获取 GitHub 邮箱' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 检查用户是否已存在
    let userId = await env.USERS_KV.get(`email_${primaryEmail}`);
    
    if (!userId) {
      // 创建新用户
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newUser: User = {
        id: userId,
        email: primaryEmail,
        username: githubUser.login,
        passwordHash: '', // GitHub 登录不需要密码
        avatar: githubUser.avatar_url,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        loginType: 'github',
      };
      
      await env.USERS_KV.put(`user_${userId}`, JSON.stringify(newUser));
      await env.USERS_KV.put(`email_${primaryEmail}`, userId);
    } else {
      // 更新用户信息
      const userData = await env.USERS_KV.get(`user_${userId}`);
      if (userData) {
        const user: User = JSON.parse(userData);
        user.username = githubUser.login;
        user.avatar = githubUser.avatar_url;
        user.loginType = 'github';
        user.updatedAt = Date.now();
        await env.USERS_KV.put(`user_${userId}`, JSON.stringify(user));
      }
    }
    
    // 生成 JWT token
    const token = generateToken(userId, env.JWT_SECRET || 'fallback-secret');
    
    // 获取用户信息
    const userData = await env.USERS_KV.get(`user_${userId}`);
    const user: User = JSON.parse(userData!);
    const userResponseData = {
      id: user.id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      loginType: user.loginType,
    };
    
    // 重定向回前端，携带 token 和用户信息
    const frontendUrl = `${new URL(request.url).origin}`;
    const redirectUrl = `${frontendUrl}?token=${token}&user=${encodeURIComponent(JSON.stringify(userResponseData))}`;
    
    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl,
      },
    });
  } catch (error) {
    console.error('GitHub callback error:', error);
    return new Response(JSON.stringify({ success: false, message: 'GitHub 登录失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

interface HistoryVersion {
  id: string;
  workId: string;
  versionNumber: number;
  snapshotData: string;
  diffData?: any;
  createdAt: string;
  operationType: 'auto_save' | 'manual_save' | 'undo' | 'redo';
  description?: string;
}

interface UserPreferences {
  autoSaveInterval: number;
  enableVersionHistory: boolean;
  theme: 'light' | 'dark' | 'auto';
  sidebarWidth: number;
  [key: string]: any;
}

export async function handleGetVersions(request: Request, env: Env): Promise<Response> {
  try {
    const userId = await getUserIdFromToken(request, env);
    if (!userId) {
      return new Response(JSON.stringify({ success: false, message: '未授权' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);
    const workId = url.searchParams.get('workId');
    
    if (!workId) {
      return new Response(JSON.stringify({ success: false, message: '缺少 workId 参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const prefix = `${userId}_${workId}_`;
    const listResult = await env.VERSIONS_KV.list({ prefix });
    const versions: HistoryVersion[] = [];

    for (const key of listResult.keys) {
      const versionData = await env.VERSIONS_KV.get(key.name);
      if (versionData) {
        versions.push(JSON.parse(versionData));
      }
    }

    versions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return new Response(JSON.stringify({ success: true, versions }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Get versions error:', error);
    return new Response(JSON.stringify({ success: false, message: '获取版本列表失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function handleCreateVersion(request: Request, env: Env): Promise<Response> {
  try {
    const userId = await getUserIdFromToken(request, env);
    if (!userId) {
      return new Response(JSON.stringify({ success: false, message: '未授权' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { workId, snapshotData, diffData, operationType, description } = await request.json();

    if (!workId || !snapshotData) {
      return new Response(JSON.stringify({ success: false, message: '缺少必要参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const prefix = `${userId}_${workId}_`;
    const listResult = await env.VERSIONS_KV.list({ prefix });
    const versionNumber = listResult.keys.length + 1;

    const version: HistoryVersion = {
      id: `version_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workId,
      versionNumber,
      snapshotData,
      diffData,
      createdAt: new Date().toISOString(),
      operationType: operationType || 'manual_save',
      description,
    };

    const key = `${prefix}${version.id}`;
    await env.VERSIONS_KV.put(key, JSON.stringify(version));

    return new Response(JSON.stringify({ success: true, version }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Create version error:', error);
    return new Response(JSON.stringify({ success: false, message: '创建版本失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function handleGetVersion(request: Request, env: Env): Promise<Response> {
  try {
    const userId = await getUserIdFromToken(request, env);
    if (!userId) {
      return new Response(JSON.stringify({ success: false, message: '未授权' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);
    const workId = url.searchParams.get('workId');
    const versionId = url.searchParams.get('versionId');

    if (!workId || !versionId) {
      return new Response(JSON.stringify({ success: false, message: '缺少必要参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const key = `${userId}_${workId}_${versionId}`;
    const versionData = await env.VERSIONS_KV.get(key);

    if (!versionData) {
      return new Response(JSON.stringify({ success: false, message: '版本不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, version: JSON.parse(versionData) }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Get version error:', error);
    return new Response(JSON.stringify({ success: false, message: '获取版本失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function handleDeleteVersion(request: Request, env: Env): Promise<Response> {
  try {
    const userId = await getUserIdFromToken(request, env);
    if (!userId) {
      return new Response(JSON.stringify({ success: false, message: '未授权' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);
    const workId = url.searchParams.get('workId');
    const versionId = url.searchParams.get('versionId');

    if (!workId || !versionId) {
      return new Response(JSON.stringify({ success: false, message: '缺少必要参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const key = `${userId}_${workId}_${versionId}`;
    await env.VERSIONS_KV.delete(key);

    return new Response(JSON.stringify({ success: true, message: '删除成功' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Delete version error:', error);
    return new Response(JSON.stringify({ success: false, message: '删除版本失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function handleGetPreferences(request: Request, env: Env): Promise<Response> {
  try {
    const userId = await getUserIdFromToken(request, env);
    if (!userId) {
      return new Response(JSON.stringify({ success: false, message: '未授权' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const key = `user_${userId}_preferences`;
    const preferencesData = await env.PREFERENCES_KV.get(key);

    const defaultPreferences: UserPreferences = {
      autoSaveInterval: 10,
      enableVersionHistory: true,
      theme: 'auto',
      sidebarWidth: 280,
    };

    const preferences = preferencesData ? { ...defaultPreferences, ...JSON.parse(preferencesData) } : defaultPreferences;

    return new Response(JSON.stringify({ success: true, preferences }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    return new Response(JSON.stringify({ success: false, message: '获取偏好设置失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function handleUpdatePreferences(request: Request, env: Env): Promise<Response> {
  try {
    const userId = await getUserIdFromToken(request, env);
    if (!userId) {
      return new Response(JSON.stringify({ success: false, message: '未授权' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const updates = await request.json();

    const key = `user_${userId}_preferences`;
    const existingData = await env.PREFERENCES_KV.get(key);

    const defaultPreferences: UserPreferences = {
      autoSaveInterval: 10,
      enableVersionHistory: true,
      theme: 'auto',
      sidebarWidth: 280,
    };

    const existingPreferences = existingData ? JSON.parse(existingData) : {};
    const updatedPreferences = { ...defaultPreferences, ...existingPreferences, ...updates };

    await env.PREFERENCES_KV.put(key, JSON.stringify(updatedPreferences));

    return new Response(JSON.stringify({ success: true, preferences: updatedPreferences }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    return new Response(JSON.stringify({ success: false, message: '更新偏好设置失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function handleDeletePreferences(request: Request, env: Env): Promise<Response> {
  try {
    const userId = await getUserIdFromToken(request, env);
    if (!userId) {
      return new Response(JSON.stringify({ success: false, message: '未授权' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const key = `user_${userId}_preferences`;
    await env.PREFERENCES_KV.delete(key);

    return new Response(JSON.stringify({ success: true, message: '偏好设置已重置' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Delete preferences error:', error);
    return new Response(JSON.stringify({ success: false, message: '重置偏好设置失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ==================== WORKS_KV 作品云端同步 ====================

export async function handleUploadWork(request: Request, env: Env): Promise<Response> {
  try {
    const userId = await getUserIdFromToken(request, env);
    if (!userId) {
      return new Response(JSON.stringify({ success: false, message: '未授权' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { workId, workData } = await request.json();
    
    if (!workId || !workData) {
      return new Response(JSON.stringify({ success: false, message: '缺少必要参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const key = `user_${userId}_work_${workId}`;
    await env.WORKS_KV.put(key, JSON.stringify(workData), {
      expirationTtl: 30 * 24 * 60 * 60, // 30天过期
    });

    return new Response(JSON.stringify({ success: true, message: '作品上传成功' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Upload work error:', error);
    return new Response(JSON.stringify({ success: false, message: '作品上传失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function handleDownloadWork(request: Request, env: Env): Promise<Response> {
  try {
    const userId = await getUserIdFromToken(request, env);
    if (!userId) {
      return new Response(JSON.stringify({ success: false, message: '未授权' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);
    const workId = url.searchParams.get('workId');
    
    if (!workId) {
      return new Response(JSON.stringify({ success: false, message: '缺少作品ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const key = `user_${userId}_work_${workId}`;
    const workData = await env.WORKS_KV.get(key);

    if (!workData) {
      return new Response(JSON.stringify({ success: false, message: '作品不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, workData: JSON.parse(workData) }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Download work error:', error);
    return new Response(JSON.stringify({ success: false, message: '作品下载失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function handleListWorks(request: Request, env: Env): Promise<Response> {
  try {
    const userId = await getUserIdFromToken(request, env);
    if (!userId) {
      return new Response(JSON.stringify({ success: false, message: '未授权' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const prefix = `user_${userId}_work_`;
    const listResult = await env.WORKS_KV.list({ prefix });
    
    const workIds = listResult.keys.map(key => key.name.replace(prefix, ''));

    return new Response(JSON.stringify({ success: true, workIds }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('List works error:', error);
    return new Response(JSON.stringify({ success: false, message: '获取作品列表失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function handleDeleteWork(request: Request, env: Env): Promise<Response> {
  try {
    const userId = await getUserIdFromToken(request, env);
    if (!userId) {
      return new Response(JSON.stringify({ success: false, message: '未授权' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { workId } = await request.json();
    
    if (!workId) {
      return new Response(JSON.stringify({ success: false, message: '缺少作品ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const key = `user_${userId}_work_${workId}`;
    await env.WORKS_KV.delete(key);

    return new Response(JSON.stringify({ success: true, message: '作品删除成功' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Delete work error:', error);
    return new Response(JSON.stringify({ success: false, message: '作品删除失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ==================== ASSETS_KV 素材元数据存储 ====================

export async function handleUploadAssetMetadata(request: Request, env: Env): Promise<Response> {
  try {
    const userId = await getUserIdFromToken(request, env);
    if (!userId) {
      return new Response(JSON.stringify({ success: false, message: '未授权' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { assetId, metadata } = await request.json();
    
    if (!assetId || !metadata) {
      return new Response(JSON.stringify({ success: false, message: '缺少必要参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const key = `user_${userId}_asset_${assetId}`;
    await env.ASSETS_KV.put(key, JSON.stringify(metadata));

    return new Response(JSON.stringify({ success: true, message: '素材元数据上传成功' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Upload asset metadata error:', error);
    return new Response(JSON.stringify({ success: false, message: '素材元数据上传失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function handleGetAssetMetadata(request: Request, env: Env): Promise<Response> {
  try {
    const userId = await getUserIdFromToken(request, env);
    if (!userId) {
      return new Response(JSON.stringify({ success: false, message: '未授权' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);
    const assetId = url.searchParams.get('assetId');
    
    if (!assetId) {
      return new Response(JSON.stringify({ success: false, message: '缺少素材ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const key = `user_${userId}_asset_${assetId}`;
    const metadata = await env.ASSETS_KV.get(key);

    if (!metadata) {
      return new Response(JSON.stringify({ success: false, message: '素材不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, metadata: JSON.parse(metadata) }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Get asset metadata error:', error);
    return new Response(JSON.stringify({ success: false, message: '获取素材元数据失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function handleListAssets(request: Request, env: Env): Promise<Response> {
  try {
    const userId = await getUserIdFromToken(request, env);
    if (!userId) {
      return new Response(JSON.stringify({ success: false, message: '未授权' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const prefix = `user_${userId}_asset_`;
    const listResult = await env.ASSETS_KV.list({ prefix });
    
    const assetIds = listResult.keys.map(key => key.name.replace(prefix, ''));

    return new Response(JSON.stringify({ success: true, assetIds }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('List assets error:', error);
    return new Response(JSON.stringify({ success: false, message: '获取素材列表失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function handleDeleteAssetMetadata(request: Request, env: Env): Promise<Response> {
  try {
    const userId = await getUserIdFromToken(request, env);
    if (!userId) {
      return new Response(JSON.stringify({ success: false, message: '未授权' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { assetId } = await request.json();
    
    if (!assetId) {
      return new Response(JSON.stringify({ success: false, message: '缺少素材ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const key = `user_${userId}_asset_${assetId}`;
    await env.ASSETS_KV.delete(key);

    return new Response(JSON.stringify({ success: true, message: '素材元数据删除成功' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Delete asset metadata error:', error);
    return new Response(JSON.stringify({ success: false, message: '素材元数据删除失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ==================== ASSETS_R2 素材文件存储 ====================

export async function handleUploadAssetFile(request: Request, env: Env): Promise<Response> {
  try {
    const userId = await getUserIdFromToken(request, env);
    if (!userId) {
      return new Response(JSON.stringify({ success: false, message: '未授权' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const assetId = formData.get('assetId') as string;
    
    if (!file || !assetId) {
      return new Response(JSON.stringify({ success: false, message: '缺少必要参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const key = `user_${userId}_asset_file_${assetId}`;
    
    await env.ASSETS_R2.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    return new Response(JSON.stringify({ success: true, message: '素材文件上传成功' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Upload asset file error:', error);
    return new Response(JSON.stringify({ success: false, message: '素材文件上传失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function handleDownloadAssetFile(request: Request, env: Env): Promise<Response> {
  try {
    const userId = await getUserIdFromToken(request, env);
    if (!userId) {
      return new Response(JSON.stringify({ success: false, message: '未授权' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);
    const assetId = url.searchParams.get('assetId');
    
    if (!assetId) {
      return new Response(JSON.stringify({ success: false, message: '缺少素材ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const key = `user_${userId}_asset_file_${assetId}`;
    const object = await env.ASSETS_R2.get(key);

    if (!object) {
      return new Response(JSON.stringify({ success: false, message: '素材文件不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const content = await object.arrayBuffer();
    const contentType = object.httpMetadata?.contentType || 'application/octet-stream';

    return new Response(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': content.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('Download asset file error:', error);
    return new Response(JSON.stringify({ success: false, message: '素材文件下载失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function handleDeleteAssetFile(request: Request, env: Env): Promise<Response> {
  try {
    const userId = await getUserIdFromToken(request, env);
    if (!userId) {
      return new Response(JSON.stringify({ success: false, message: '未授权' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { assetId } = await request.json();
    
    if (!assetId) {
      return new Response(JSON.stringify({ success: false, message: '缺少素材ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const key = `user_${userId}_asset_file_${assetId}`;
    await env.ASSETS_R2.delete(key);

    return new Response(JSON.stringify({ success: true, message: '素材文件删除成功' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Delete asset file error:', error);
    return new Response(JSON.stringify({ success: false, message: '素材文件删除失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
