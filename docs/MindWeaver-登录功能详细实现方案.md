# MindWeaver 登录功能详细实现方案

## 一、最终确认的方案

### 1. 登录方式

**核心登录方式**：
- ✅ **邮箱注册**：需要邮箱验证码，确保邮箱真实性
- ✅ **邮箱登录**：支持两种方式
  - 邮箱 + 密码登录
  - 邮箱 + 验证码登录

**第三方登录**：
- ✅ **GitHub 登录**：实现难度适中，不需要域名备案
  - 优势：审核简单，开发者友好，不需要翻墙
  - 实现：OAuth 2.0 流程
- 可以保留接口，为后续添加其他第三方登录做准备

### 2. 验证码方案

**图形验证码**：
- ✅ **Cloudflare Turnstile**（免费版）
  - 优势：Cloudflare 原生集成，体验好，免费
  - 用途：注册、登录、找回密码时使用

**邮箱验证码**：
- ✅ **Cloudflare Email Routing**
  - 优势：Cloudflare 原生支持，免费
  - 用途：注册验证、登录验证、找回密码

### 3. 其他功能

- ✅ **密码找回**：需要，通过邮箱验证码重置密码
- ✅ **Token 有效期**：30 天
- ✅ **数据同步**：实时同步

---

## 二、技术实现方案

### 1. 技术栈

**后端**：
- Cloudflare Workers
- Cloudflare KV（用户数据、元数据）
- Cloudflare R2（文件存储）
- Cloudflare Turnstile（图形验证码）
- Cloudflare Email Routing（邮箱验证码）
- JWT（认证）
- bcryptjs（密码加密）

**前端**：
- React
- TypeScript
- Axios（API 调用）
- React Query（数据同步）
- @cloudflare/turnstile-react（Turnstile 组件）

### 2. 数据库设计（KV 结构）

#### 用户表
```
users/{user_id} = {
  id: string;
  email: string;
  username: string;
  passwordHash: string; // bcrypt 加密
  avatar?: string;
  createdAt: number;
  updatedAt: number;
}
```

#### 用户索引（通过邮箱查找）
```
user_emails/{email} = user_id
```

#### 验证码存储
```
verification_codes/{email}_{type} = {
  code: string;
  expiresAt: number;
  attempts: number;
}
```
- type: 'register' | 'login' | 'reset_password'

#### 会话 Token 黑名单
```
token_blacklist/{token} = true
```

---

## 三、API 端点设计

### 1. 验证码相关

#### 发送邮箱验证码
```
POST /api/auth/send-code
请求：{ email: string; type: 'register' | 'login' | 'reset_password' }
响应：{ success: boolean; message: string }
```

#### 验证验证码
```
POST /api/auth/verify-code
请求：{ email: string; code: string; type: 'register' | 'login' | 'reset_password' }
响应：{ success: boolean; valid: boolean; message: string }
```

### 2. 注册登录

#### 用户注册
```
POST /api/auth/register
请求：{
  email: string;
  username: string;
  password: string;
  code: string;
  turnstileToken: string;
}
响应：{
  success: boolean;
  token: string;
  user: { id: string; email: string; username: string; avatar?: string }
}
```

#### 用户登录（密码方式）
```
POST /api/auth/login-password
请求：{
  email: string;
  password: string;
  turnstileToken?: string;
}
响应：{
  success: boolean;
  token: string;
  user: { id: string; email: string; username: string; avatar?: string }
}
```

#### 用户登录（验证码方式）
```
POST /api/auth/login-code
请求：{
  email: string;
  code: string;
  turnstileToken?: string;
}
响应：{
  success: boolean;
  token: string;
  user: { id: string; email: string; username: string; avatar?: string }
}
```

### 3. 密码管理

#### 重置密码请求
```
POST /api/auth/reset-password-request
请求：{ email: string; turnstileToken: string }
响应：{ success: boolean; message: string }
```

#### 重置密码确认
```
POST /api/auth/reset-password-confirm
请求：{ email: string; code: string; newPassword: string; turnstileToken: string }
响应：{ success: boolean; message: string }
```

### 4. 用户信息

#### 获取当前用户信息
```
GET /api/auth/me
Headers: Authorization: Bearer {token}
响应：{
  success: boolean;
  user: { id: string; email: string; username: string; avatar?: string }
}
```

#### 更新用户信息
```
PUT /api/auth/me
Headers: Authorization: Bearer {token}
请求：{ username?: string; avatar?: string }
响应：{ success: boolean; user: { ... } }
```

#### 用户登出
```
POST /api/auth/logout
Headers: Authorization: Bearer {token}
响应：{ success: boolean }
```

### 5. 数据同步

#### 同步用户数据（拉取）
```
GET /api/sync
Headers: Authorization: Bearer {token}
请求参数：{ since?: number }
响应：{
  success: boolean;
  assets: Asset[];
  works: Work[];
  lastSyncTime: number;
}
```

#### 同步用户数据（推送）
```
POST /api/sync
Headers: Authorization: Bearer {token}
请求：{
  assets?: Asset[];
  works?: Work[];
  deletedAssetIds?: string[];
  deletedWorkIds?: string[];
}
响应：{
  success: boolean;
  syncedAt: number;
}
```

---

## 四、前端实现

### 1. UserContext 增强

**新增状态和方法**：
```typescript
interface UserContextType {
  // 现有状态
  user: User | null;
  isGuest: boolean;
  isLoading: boolean;
  error: string | null;
  
  // 新增：认证相关
  token: string | null;
  isAuthenticated: boolean;
  
  // 新增：认证方法
  register: (data: RegisterData) => Promise<void>;
  loginPassword: (data: LoginPasswordData) => Promise<void>;
  loginCode: (data: LoginCodeData) => Promise<void>;
  sendVerificationCode: (email: string, type: VerificationCodeType) => Promise<void>;
  resetPassword: (data: ResetPasswordData) => Promise<void>;
  
  // 新增：数据同步
  syncData: () => Promise<void>;
  lastSyncTime: number | null;
  isSyncing: boolean;
  
  // 现有方法
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}
```

### 2. 登录/注册界面

**组件结构**：
```
components/
  auth/
    LoginRegisterDialog.tsx      # 登录注册对话框
    LoginForm.tsx                # 登录表单
    RegisterForm.tsx             # 注册表单
    ResetPasswordForm.tsx        # 重置密码表单
    EmailVerificationInput.tsx   # 邮箱验证码输入
    TurnstileWidget.tsx          # Turnstile 组件
```

### 3. 数据同步服务

**新增服务**：
```typescript
// services/SyncService.ts
class SyncService {
  async pull(since?: number): Promise<SyncResult>;
  async push(data: SyncData): Promise<SyncResult>;
  async sync(): Promise<void>;
}
```

---

## 五、Cloudflare 配置

### 1. Turnstile 配置

**步骤**：
1. 登录 Cloudflare 仪表板
2. 进入 Turnstile → 添加站点
3. 获取 Site Key 和 Secret Key
4. 配置到 wrangler.jsonc

**wrangler.jsonc 配置**：
```json
{
  "vars": {
    "TURNSTILE_SITE_KEY": "your-site-key",
    "TURNSTILE_SECRET_KEY": "your-secret-key"
  }
}
```

### 2. Email Routing 配置

**步骤**：
1. 进入 Cloudflare 仪表板 → Email → Email Routing
2. 配置发送邮箱（如 no-reply@yourdomain.com）
3. 配置到 wrangler.jsonc

**wrangler.jsonc 配置**：
```json
{
  "vars": {
    "EMAIL_FROM": "no-reply@yourdomain.com",
    "EMAIL_FROM_NAME": "MindWeaver"
  }
}
```

### 3. KV 命名空间

**创建 KV 命名空间**：
- `USERS_KV`：存储用户数据
- `VERIFICATION_CODES_KV`：存储验证码
- `TOKEN_BLACKLIST_KV`：存储黑名单 Token

**wrangler.jsonc 配置**：
```json
{
  "kv_namespaces": [
    { "binding": "USERS_KV", "id": "..." },
    { "binding": "VERIFICATION_CODES_KV", "id": "..." },
    { "binding": "TOKEN_BLACKLIST_KV", "id": "..." }
  ]
}
```

---

## 六、安全考虑

### 1. 密码安全
- 使用 bcryptjs 加密，salt rounds = 12
- 密码强度要求：至少 8 位，包含字母和数字

### 2. Token 安全
- JWT 使用 HS256 算法
- 过期时间：30 天
- 登出时加入黑名单
- 刷新机制（可选）

### 3. 验证码安全
- 验证码有效期：10 分钟
- 尝试次数限制：5 次
- Turnstile 验证防止机器人

### 4. 数据安全
- 用户数据按 ID 隔离
- 所有 API （除登录注册外）需要认证
- CORS 配置仅允许白名单域名

---

## 七、实现步骤

### 阶段一：基础认证（1-2 周）
1. 配置 Cloudflare Turnstile 和 Email Routing
2. 实现后端 API：发送验证码、注册、登录
3. 实现前端登录/注册界面
4. 实现 UserContext 增强
5. 测试认证流程

### 阶段二：密码管理和用户信息（1 周）
1. 实现密码找回功能
2. 实现用户信息更新
3. 实现登出功能
4. 测试完整流程

### 阶段三：数据同步（1-2 周）
1. 实现数据同步 API
2. 实现前端数据同步服务
3. 实现离线支持
4. 测试同步功能

### 阶段四：优化和完善（1 周）
1. 错误处理优化
2. 性能优化
3. 用户体验优化
4. 安全审计

---

## 八、总结

这个方案包含了：
- ✅ 邮箱注册（带验证码）
- ✅ 邮箱登录（密码和验证码两种方式）
- ✅ GitHub 登录（OAuth 2.0 流程，不需要域名备案）
- ✅ 密码找回
- ✅ Cloudflare Turnstile 图形验证码
- ✅ Cloudflare Email Routing 邮箱服务
- ✅ JWT 认证（30 天有效期）
- ✅ 实时数据同步
- ✅ 用户数据隔离
- ✅ 完整的安全措施

这个方案完全基于您现有的 Cloudflare 架构，不需要额外的服务，实现难度适中，用户体验良好。GitHub 登录作为核心功能之一，无需域名备案即可实现，非常适合国内用户使用。
