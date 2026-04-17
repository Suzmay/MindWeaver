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
}

interface Env {
  USERS_KV: KVNamespace;
  VERIFICATION_CODES_KV: KVNamespace;
  TOKEN_BLACKLIST_KV: KVNamespace;
  TURNSTILE_SITE_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  EMAIL_FROM: string;
  EMAIL_FROM_NAME: string;
  JWT_SECRET: string;
  GH_CLIENT_ID: string;
  GH_CLIENT_SECRET: string;
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

    console.log(`Verification code for ${email} (${type}): ${code}`);

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

    console.log(`Reset password code for ${email}: ${code}`);

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
