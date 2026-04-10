# MindWeaver 架构与测试指南

## 1. 整体架构

### 1.1 系统架构

```
┌─────────────────────────┐
│ 前端应用 (React + Vite) │
├─────────────────────────┤
│ 端口: http://localhost:8080/ │
│ 构建产物: dist/          │
└─────────────┬───────────┘
              │
              ▼
┌─────────────────────────┐
│ API 代理 (Vite 代理)    │
├─────────────────────────┤
│ 将 /api 代理到 8787 端口  │
└─────────────┬───────────┘
              │
              ▼
┌─────────────────────────┐
│ Cloudflare Worker 服务  │
├─────────────────────────┤
│ 端口: http://localhost:8787/ │
│ 主文件: worker.ts      │
└─────────────┬───────────┘
              │
              ▼
┌─────────────────────────┐
│ 存储服务                │
├─────────────────────────┤
│ KV 存储: 素材元数据      │
│ R2 存储: 素材文件        │
└─────────────────────────┘
```

### 1.2 技术栈

| 类别 | 技术 | 版本 | 用途 |
|------|------|------|------|
| **前端** | React | 18.2.0 | 用户界面 |
| **前端构建** | Vite | 5.0.8 | 开发服务器和构建工具 |
| **语言** | TypeScript | 5.2.2 | 类型安全 |
| **后端** | Cloudflare Workers | - | 边缘计算服务 |
| **存储** | Cloudflare KV | - | 键值存储（元数据） |
| **存储** | Cloudflare R2 | - | 对象存储（文件） |
| **CI/CD** | GitHub Actions | - | 自动部署 |

## 2. 客户端设置

### 2.1 开发环境

**启动前端开发服务器**：
```bash
cd d:\MindWeaver\web
npm run dev
```
- 访问地址：http://localhost:8080/
- 热更新：支持代码修改后自动刷新
- API 代理：自动将 `/api` 请求代理到 8787 端口

### 2.2 构建配置

**构建生产版本**：
```bash
cd d:\MindWeaver\web
npm run build
```
- 构建产物：`dist/` 目录
- 优化：代码压缩、资源优化
- 输出：HTML、CSS、JavaScript、字体文件

### 2.3 前端 API 服务

**文件**：`src/services/api/ApiService.ts`

**API 端点**：
- `GET /api/health`：健康检查
- `POST /api/assets/upload`：上传素材
- `GET /api/assets/list`：获取素材列表
- `DELETE /api/assets/delete/{id}`：删除素材
- `GET /api/assets/preview/{id}`：获取素材预览
- `POST /api/works/`：创建作品
- `GET /api/works/`：获取作品列表
- `GET /api/works/{id}`：获取作品详情
- `PUT /api/works/{id}`：更新作品
- `DELETE /api/works/{id}`：删除作品

**环境判断**：
- 开发环境：使用 `http://localhost:8787`
- 生产环境：使用相对路径

## 3. 服务端设置

### 3.1 Cloudflare Worker

**启动开发服务器**：
```bash
cd d:\MindWeaver\web
npx wrangler dev
```
- 访问地址：http://localhost:8787/
- 本地存储：模拟 KV 和 R2 存储
- 日志：实时显示 API 请求和错误

### 3.2 配置文件

**文件**：`wrangler.jsonc`

**配置项**：
- `name`：Worker 名称 (`mindweaver-auth`)
- `compatibility_date`：兼容性日期
- `main`：主文件 (`worker.ts`)
- `assets`：静态资源配置
- `kv_namespaces`：KV 命名空间配置
- `r2_buckets`：R2 存储桶配置

**KV 配置**：
```json
"kv_namespaces": [
  {
    "binding": "ASSETS_KV",
    "id": "36f0f3a7d82947608120fd976e47f347",
    "preview_id": "36f0f3a7d82947608120fd976e47f347"
  }
]
```

**R2 配置**：
```json
"r2_buckets": [
  {
    "binding": "ASSETS_R2",
    "bucket_name": "mindweaver-assets",
    "preview_bucket_name": "mindweaver-assets-preview"
  }
]
```

### 3.3 本地开发配置

**文件**：`.dev.vars`

**配置项**：
```
# KV 命名空间 ID（本地开发时使用占位符）
KV_ID=local-development
KV_PREVIEW_ID=local-development-preview

# R2 存储桶配置（本地开发时使用占位符）
R2_BUCKET_NAME=local-assets
R2_PREVIEW_BUCKET_NAME=local-assets-preview
```

## 4. CI/CD 配置

### 4.1 GitHub Actions 工作流

**文件**：`.github/workflows/cloudflare-worker.yml`

**触发条件**：
- 推送到 `main` 分支
- 手动触发

**工作流程**：
1. 检出代码
2. 设置 Node.js 环境
3. 安装依赖
4. 构建项目
5. 部署到 Cloudflare Workers

**Secrets 配置**：
- `CLOUDFLARE_API_TOKEN`：Cloudflare API 令牌
- `CLOUDFLARE_ACCOUNT_ID`：Cloudflare 账户 ID
- `ASSETS_KV_ID`：KV 命名空间 ID
- `ASSETS_R2_BUCKET`：R2 存储桶名称

## 5. 测试计划

### 5.1 本地开发环境测试

**启动服务**：
1. 启动 Wrangler 开发服务器：`npx wrangler dev`
2. 启动 Vite 开发服务器：`npm run dev`

**测试项目**：

| 测试项 | 测试方法 | 预期结果 |
|--------|----------|----------|
| 健康检查 | 访问 http://localhost:8080/api/health | 返回 `{"status":"ok","timestamp":...}` |
| 素材上传 | 使用前端上传功能 | 文件成功上传到 R2，元数据存储到 KV |
| 素材列表 | 访问素材列表页面 | 显示已上传的素材 |
| 素材删除 | 删除某个素材 | 素材从列表中消失，文件从存储中删除 |
| 素材预览 | 查看素材预览 | 显示素材的预览图像 |
| 静态资源 | 访问主页面 | 页面正常加载，CSS/JS 资源加载成功 |
| API 代理 | 检查 Wrangler 终端 | 显示 API 请求日志 |

### 5.2 生产环境测试

**部署流程**：
1. 推送到 `main` 分支
2. 查看 GitHub Actions 部署状态
3. 获取 Worker URL

**测试项目**：

| 测试项 | 测试方法 | 预期结果 |
|--------|----------|----------|
| 健康检查 | 访问 `{worker-url}/api/health` | 返回 `{"status":"ok","timestamp":...}` |
| 素材上传 | 使用生产环境前端上传 | 文件成功上传到 R2 |
| 素材列表 | 访问生产环境素材列表 | 显示已上传的素材 |
| 素材删除 | 在生产环境删除素材 | 素材成功删除 |
| 素材预览 | 在生产环境查看预览 | 显示素材预览 |
| 作品创建 | 在生产环境创建作品 | 作品成功创建 |
| 作品列表 | 访问生产环境作品列表 | 显示已创建的作品 |
| 作品更新 | 在生产环境修改作品 | 作品成功更新 |
| 作品删除 | 在生产环境删除作品 | 作品成功删除 |
| 跨设备访问 | 在不同设备访问作品 | 作品数据一致 |
| 静态资源 | 访问生产环境主页 | 页面正常加载 |
| 性能测试 | 测量页面加载时间 | 加载时间合理 |

### 5.3 集成测试

**端到端测试**：
1. 完整的用户流程测试
2. 素材管理功能测试
3. 错误处理测试
4. 边界情况测试

**性能测试**：
1. 大文件上传测试
2. 并发请求测试
3. 响应时间测试

## 6. 故障排除

### 6.1 常见问题

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| API 代理失败 | Vite 代理配置错误 | 检查 `vite.config.ts` 中的代理配置 |
| 存储访问失败 | KV/R2 配置错误 | 检查 `wrangler.jsonc` 中的存储配置 |
| 部署失败 | GitHub Secrets 配置错误 | 检查 Actions Secrets 是否正确设置 |
| 构建错误 | TypeScript 错误 | 运行 `npm run build` 检查错误信息 |
| 网络错误 | CORS 配置错误 | 检查 `Content-Security-Policy` 配置 |

### 6.2 日志查看

**本地开发**：
- Wrangler 终端：API 请求和错误日志
- 浏览器控制台：前端错误和网络请求
- 浏览器 Network 标签：API 调用详情

**生产环境**：
- Cloudflare Dashboard：Worker 日志
- GitHub Actions：部署日志
- 浏览器开发者工具：网络请求和错误

## 7. 部署检查清单

### 7.1 本地开发
- [ ] Wrangler 开发服务器正常运行
- [ ] Vite 开发服务器正常运行
- [ ] API 代理配置正确
- [ ] 所有 API 端点正常响应
- [ ] 素材管理功能正常

### 7.2 生产部署
- [ ] GitHub Secrets 配置完成
- [ ] CI/CD 工作流配置正确
- [ ] 构建过程无错误
- [ ] 部署到 Cloudflare 成功
- [ ] 生产环境 API 正常
- [ ] 前端与后端集成正常

## 8. 总结

MindWeaver 项目采用了现代化的前后端分离架构，使用 Cloudflare Workers 作为后端服务，Cloudflare KV 和 R2 作为存储方案。这种架构具有以下优势：

- **全球边缘网络**：Cloudflare 的边缘计算提供快速的全球访问
- **无服务器架构**：无需管理服务器，降低运维成本
- **存储集成**：KV 和 R2 提供高效的存储解决方案
- **开发体验**：Vite 提供优秀的前端开发体验
- **CI/CD 自动化**：GitHub Actions 实现自动部署

通过本指南的测试计划，可以确保项目在本地开发和生产环境中都能正常运行，为用户提供稳定、高效的思维导图工具。