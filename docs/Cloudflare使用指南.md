# Cloudflare 使用指南

本文档详细说明了 MindWeaver 项目使用 Cloudflare 服务的步骤和所需信息，包括账户设置、服务配置和部署流程。

## 1. 所需信息

### 1.1 账户信息
- **Cloudflare 账户**：需要一个 Cloudflare 账户（免费账户即可）
- **邮箱地址**：用于注册和验证 Cloudflare 账户
- **密码**：Cloudflare 账户密码

### 1.2 项目信息
- **项目仓库**：GitHub 仓库地址（用于 CI/CD 集成）
- **构建配置**：
  - 构建命令：`npm run build`
  - 输出目录：`dist`
  - 框架预设：`React`

### 1.3 域名信息（可选）
- **自定义域名**：如果需要使用自定义域名
- **DNS 控制**：能够修改域名的 DNS 记录

## 2. 步骤指南

### 2.1 Cloudflare 账户设置

1. **创建 Cloudflare 账户**
   - 访问 [Cloudflare 官网](https://www.cloudflare.com/)
   - 点击 "Sign Up" 按钮
   - 输入邮箱地址和密码
   - 完成邮箱验证

2. **登录 Cloudflare 控制台**
   - 访问 [Cloudflare 控制台](https://dash.cloudflare.com/)
   - 使用注册的邮箱和密码登录

### 2.2 Cloudflare Pages 配置

1. **创建 Pages 项目**
   - 在左侧导航栏中点击 "Pages"
   - 点击 "Create a Project"
   - 选择 "Connect to Git"
   - 选择 GitHub 作为代码源
   - 授权 Cloudflare 访问 GitHub 仓库
   - 选择 MindWeaver 项目仓库
   - 点击 "Begin setup"

2. **配置构建设置**
   - **项目名称**：mindweaver
   - **生产分支**：main
   - **构建命令**：`npm run build`
   - **构建输出目录**：`dist`
   - **框架预设**：`React`
   - 点击 "Save and Deploy"

3. **配置环境变量**
   - 在 Pages 项目设置中点击 "Environment variables"
   - 点击 "Add variable"
   - 添加必要的环境变量（如 API 密钥等）
   - 选择变量作用域（生产/预览/所有环境）

### 2.3 Cloudflare Workers 配置

1. **创建 Workers 服务**
   - 在左侧导航栏中点击 "Workers & Pages"
   - 点击 "Create Worker"
   - 输入 Worker 名称（如 `mindweaver-auth`）
   - 点击 "Deploy"

2. **编写 Worker 代码**
   - 点击创建的 Worker
   - 在代码编辑器中编写认证和 API 代理逻辑
   - 点击 "Save and Deploy"

3. **配置路由**
   - 在 Workers 服务设置中点击 "Triggers"
   - 点击 "Add Route"
   - 输入路由模式（如 `*.mindweaver.example.com/api/*`）
   - 选择要使用的 Worker
   - 点击 "Save"

### 2.4 Cloudflare R2 配置

1. **启用 R2 服务**
   - 在左侧导航栏中点击 "R2"
   - 点击 "Create Bucket"
   - 输入存储桶名称（如 `mindweaver-assets`）
   - 选择存储区域（默认即可）
   - 点击 "Create Bucket"

2. **配置存储桶权限**
   - 点击创建的存储桶
   - 点击 "Settings"
   - 配置 CORS 规则
   - 设置访问控制

3. **获取访问密钥**
   - 在 R2 设置中点击 "Manage R2 API Tokens"
   - 点击 "Create API Token"
   - 选择权限范围
   - 保存生成的访问密钥和密钥 ID

### 2.5 Cloudflare KV 配置

1. **创建 KV 命名空间**
   - 在左侧导航栏中点击 "KV"
   - 点击 "Create namespace"
   - 输入命名空间名称（如 `mindweaver-users`）
   - 点击 "Add"

2. **配置 KV 访问**
   - 在 Workers 服务设置中点击 "Settings"
   - 点击 "Variables"
   - 在 "KV Namespaces" 部分点击 "Add binding"
   - 输入绑定名称
   - 选择创建的 KV 命名空间
   - 点击 "Save"

### 2.6 部署流程

1. **配置 GitHub Actions**
   - 在项目仓库中创建 `.github/workflows/cloudflare-pages.yml` 文件
   - 配置 CI/CD 流水线

2. **自动部署**
   - 推送到 main 分支会自动触发 Cloudflare Pages 部署
   - 部署状态可在 Cloudflare 控制台中查看

3. **预览部署**
   - 每个 Pull Request 会自动创建预览部署
   - 预览 URL 会在 GitHub PR 中显示

## 3. 详细配置步骤

### 3.1 Cloudflare Pages 详细配置

**配置文件示例** (`cloudflare.yml`)：

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Install dependencies
        run: npm install
      - name: Build project
        run: npm run build
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: mindweaver
          directory: dist
```

### 3.2 Cloudflare Workers 认证服务示例

**Worker 代码示例** (`auth-worker.js`)：

```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // 登录端点
  if (path === '/api/auth/login') {
    if (request.method === 'POST') {
      try {
        const body = await request.json();
        const { username, password } = body;

        // 验证用户（实际项目中应从 KV 或数据库获取）
        // 这里只是示例
        if (username && password) {
          // 生成 JWT 令牌
          const token = generateToken(username);
          
          return new Response(JSON.stringify({
            success: true,
            token,
            user: {
              username,
              email: `${username}@example.com`
            }
          }), {
            headers: {
              'Content-Type': 'application/json'
            }
          });
        } else {
          return new Response(JSON.stringify({
            success: false,
            error: 'Invalid credentials'
          }), {
            status: 401,
            headers: {
              'Content-Type': 'application/json'
            }
          });
        }
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid request'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
    }
  }

  // 注册端点
  if (path === '/api/auth/register') {
    if (request.method === 'POST') {
      try {
        const body = await request.json();
        const { username, password, email } = body;

        // 验证输入
        if (username && password && email) {
          // 存储用户信息（实际项目中应存储到 KV 或数据库）
          // 这里只是示例
          
          // 生成 JWT 令牌
          const token = generateToken(username);
          
          return new Response(JSON.stringify({
            success: true,
            token,
            user: {
              username,
              email
            }
          }), {
            headers: {
              'Content-Type': 'application/json'
            }
          });
        } else {
          return new Response(JSON.stringify({
            success: false,
            error: 'Invalid input'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json'
            }
          });
        }
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid request'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
    }
  }

  // 404 响应
  return new Response('Not Found', {
    status: 404
  });
}

// 生成 JWT 令牌（实际项目中应使用更安全的方法）
function generateToken(username) {
  const payload = {
    sub: username,
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 小时过期
    iat: Math.floor(Date.now() / 1000)
  };
  
  // 实际项目中应使用密钥签名
  return btoa(JSON.stringify(payload));
}
```

### 3.3 Cloudflare R2 存储示例

**前端上传代码示例**：

```javascript
// 上传文件到 Cloudflare R2
async function uploadFileToR2(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    throw new Error('Upload failed');
  }
  
  return await response.json();
}

// Worker 端处理上传
// 在 Workers 中添加以下代码
async function handleUpload(request) {
  const formData = await request.formData();
  const file = formData.get('file');
  
  if (!file) {
    return new Response('No file uploaded', {
      status: 400
    });
  }
  
  // 生成唯一文件名
  const fileName = `${Date.now()}-${file.name}`;
  
  // 上传到 R2
  await MY_BUCKET.put(fileName, file.stream(), {
    httpMetadata: {
      contentType: file.type
    }
  });
  
  // 返回文件 URL
  return new Response(JSON.stringify({
    success: true,
    url: `https://${MY_DOMAIN}/r2/${fileName}`
  }), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
```

### 3.4 Cloudflare KV 存储示例

**KV 操作示例**：

```javascript
// 在 Workers 中使用 KV

// 存储用户信息
async function storeUser(user) {
  await USERS_KV.put(`user:${user.id}`, JSON.stringify(user));
}

// 获取用户信息
async function getUser(userId) {
  const userJson = await USERS_KV.get(`user:${userId}`);
  return userJson ? JSON.parse(userJson) : null;
}

// 删除用户信息
async function deleteUser(userId) {
  await USERS_KV.delete(`user:${userId}`);
}

// 列出所有用户
async function listUsers() {
  const users = [];
  const iterator = USERS_KV.list({
    prefix: 'user:'
  });
  
  for await (const key of iterator) {
    const userJson = await USERS_KV.get(key.name);
    if (userJson) {
      users.push(JSON.parse(userJson));
    }
  }
  
  return users;
}
```

## 4. 环境变量配置

### 4.1 必需的环境变量

| 变量名 | 描述 | 示例值 |
|-------|------|-------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API 令牌 | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `CLOUDFLARE_PROJECT_NAME` | Cloudflare Pages 项目名称 | `mindweaver` |
| `R2_ACCOUNT_ID` | Cloudflare R2 账户 ID | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 访问密钥 ID | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 秘密访问密钥 | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `R2_BUCKET_NAME` | Cloudflare R2 存储桶名称 | `mindweaver-assets` |
| `R2_PUBLIC_URL` | Cloudflare R2 公共 URL | `https://pub-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.r2.dev` |

### 4.2 如何获取环境变量

1. **Cloudflare API Token**
   - 登录 Cloudflare 控制台
   - 点击右上角头像 → "My Profile"
   - 点击 "API Tokens"
   - 点击 "Create Token"
   - 选择 "Edit Cloudflare Workers"
   - 选择账户和区域
   - 点击 "Continue to Summary"
   - 点击 "Create Token"
   - 复制生成的 API Token

2. **Cloudflare Account ID**
   - 登录 Cloudflare 控制台
   - 点击左侧导航栏中的 " Workers & Pages"
   - 查看 URL 中的账户 ID（格式：`https://dash.cloudflare.com/[ACCOUNT_ID]/workers`）

3. **R2 凭证**
   - 登录 Cloudflare 控制台
   - 点击左侧导航栏中的 "R2"
   - 点击 "Manage R2 API Tokens"
   - 点击 "Create API Token"
   - 选择权限范围
   - 保存生成的访问密钥和密钥 ID

4. **R2 Public URL**
   - 登录 Cloudflare 控制台
   - 点击左侧导航栏中的 "R2"
   - 点击存储桶名称
   - 点击 "Settings"
   - 找到 "Public Access" 部分
   - 配置公共访问并获取公共 URL

## 5. 部署流程

### 5.1 首次部署

1. **准备代码**
   - 确保项目已在 GitHub 上
   - 确保 `package.json` 中有正确的构建脚本
   - 确保代码能正常构建

2. **配置 Cloudflare Pages**
   - 按照 2.2 节的步骤创建 Pages 项目
   - 配置构建设置
   - 配置环境变量

3. **触发部署**
   - 推送到 main 分支
   - 在 Cloudflare 控制台中查看部署状态
   - 部署完成后获取部署 URL

### 5.2 持续部署

1. **配置 GitHub Actions**
   - 在项目仓库中创建 `.github/workflows/cloudflare-pages.yml` 文件
   - 配置 CI/CD 流水线
   - 添加必要的 secrets

2. **自动部署**
   - 推送到 main 分支会自动触发部署
   - 每个 Pull Request 会创建预览部署
   - 部署状态会在 GitHub PR 中显示

### 5.3 部署验证

1. **检查部署状态**
   - 在 Cloudflare 控制台中查看部署历史
   - 检查部署日志
   - 验证部署 URL 是否可访问

2. **功能验证**
   - 测试登录注册功能
   - 测试文件上传功能
   - 测试数据同步功能
   - 测试其他核心功能

## 6. 常见问题与解决方案

### 6.1 部署失败

**问题**：部署失败，显示构建错误

**解决方案**：
- 检查构建命令是否正确
- 检查依赖是否安装成功
- 检查代码是否有语法错误
- 查看部署日志获取详细错误信息

### 6.2 R2 上传失败

**问题**：无法上传文件到 R2

**解决方案**：
- 检查 R2 存储桶权限
- 检查 Workers 绑定是否正确
- 检查文件大小是否超过限制
- 查看 Workers 日志获取详细错误信息

### 6.3 KV 访问失败

**问题**：无法访问 KV 存储

**解决方案**：
- 检查 KV 命名空间绑定是否正确
- 检查 Workers 权限
- 查看 Workers 日志获取详细错误信息

### 6.4 自定义域名配置

**问题**：自定义域名无法访问

**解决方案**：
- 检查 DNS 记录是否正确配置
- 检查 Cloudflare 域名设置
- 检查 SSL/TLS 设置
- 等待 DNS 传播完成（通常需要 24-48 小时）

### 6.5 免费额度限制

**问题**：超出 Cloudflare 免费额度

**解决方案**：
- 监控使用量
- 优化存储和请求策略
- 实现缓存机制减少请求
- 考虑升级到付费计划（如果需要）

## 7. 监控与维护

### 7.1 监控工具

- **Cloudflare Analytics**：查看流量和性能数据
- **Workers Logs**：查看 Workers 执行日志
- **R2 Usage**：监控 R2 存储使用情况
- **KV Usage**：监控 KV 存储使用情况

### 7.2 定期维护

- **备份数据**：定期备份 KV 和 R2 中的数据
- **更新依赖**：定期更新项目依赖
- **安全检查**：定期检查安全设置
- **性能优化**：定期优化代码和配置

## 8. 总结

Cloudflare 提供了强大的服务套件，包括 Pages、Workers、R2 和 KV，这些服务可以帮助 MindWeaver 项目实现全球部署、边缘计算、对象存储和键值存储等功能。

通过本指南的步骤，开发团队可以：
- 创建和配置 Cloudflare 账户
- 部署应用到 Cloudflare Pages
- 实现认证和 API 服务
- 存储和管理用户数据
- 提供全球访问能力

使用 Cloudflare 的优势包括：
- **全球边缘网络**：提供快速的全球访问速度
- **免费额度充足**：免费计划提供足够的资源
- **简化架构**：单一服务提供商，简化管理
- **安全可靠**：企业级安全保障
- **可扩展性**：按需扩展存储和计算资源

遵循本指南的步骤，MindWeaver 项目可以成功使用 Cloudflare 服务，为用户提供高质量的思维导图工具。