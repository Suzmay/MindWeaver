# MindWeaver

一个基于 React + TypeScript + Cloudflare Workers 的现代化思维导图系统。

## 🌟 功能特性

### 🧠 核心编辑功能
- **多布局支持**: 思维导图、树状图、组织结构图、鱼骨图
- **节点操作**: 创建、编辑、删除、拖动、复制粘贴
- **样式定制**: 主题配色、节点形状、连线样式、字体设置
- **缩放与平移**: 支持画布缩放、拖拽平移、双击聚焦

### 📁 作品管理
- **本地存储**: 基于 IndexedDB 的离线数据持久化
- **版本历史**: 自动保存历史版本，支持版本对比和回滚
- **导入导出**: 支持 JSON 格式的导入导出
- **分享功能**: 生成分享链接

### 🎨 素材中心
- **图标库**: 集成 Iconify 图标库
- **自定义素材**: 支持上传和管理自定义图片素材
- **素材收藏**: 收藏常用素材便于快速访问

### 📊 仪表盘
- **创作统计**: 作品数、节点数、星标作品统计
- **布局分布**: 饼图展示布局模式使用比例
- **创作趋势**: 近30天作品创建趋势图表
- **最近作品**: 快速访问最近编辑的思维导图

### 🐙 Mindy 智能助手
- **智能聊天**: 自然语言对话，解答使用疑问
- **新手教程**: 9个详细教程步骤
- **快捷操作**: 一键执行常用操作

## 🛠️ 技术栈

| 分类 | 技术 | 版本 |
|------|------|------|
| 前端框架 | React | 18+ |
| 语言 | TypeScript | 5+ |
| 构建工具 | Vite | 5+ |
| 样式 | Tailwind CSS | 3+ |
| UI 组件 | shadcn/ui | latest |
| 动画 | Framer Motion | 10+ |
| 图标 | Lucide React | latest |
| 后端 | Cloudflare Workers | latest |
| 数据库 | IndexedDB | - |
| 加密 | AES-GCM | - |

## 📁 项目结构

```
MindWeaver/
├── web/                      # 前端应用
│   ├── src/
│   │   ├── components/       # React 组件
│   │   │   ├── ui/          # UI 基础组件（shadcn）
│   │   │   ├── canvas/      # 画布渲染组件
│   │   │   ├── editor/      # 编辑器组件
│   │   │   ├── assets/      # 素材管理组件
│   │   │   ├── export/      # 导出导入组件
│   │   │   └── auth/        # 认证组件
│   │   ├── context/         # React Context
│   │   ├── services/        # 服务层
│   │   │   ├── storage/     # 存储服务
│   │   │   ├── api/         # API 服务
│   │   │   ├── ai/          # AI 服务
│   │   │   └── assets/      # 素材服务
│   │   ├── models/          # 数据模型
│   │   └── worker/          # Cloudflare Worker 入口
│   ├── worker.ts            # Worker 主文件
│   └── wrangler.jsonc       # Cloudflare 配置
├── .github/workflows/       # CI/CD 配置
└── README.md
```

## 🚀 快速开始

### 环境要求
- Node.js >= 20.x
- npm >= 10.x
- Cloudflare Wrangler CLI（用于部署）

### 安装依赖

```bash
cd web
npm install
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:5173 查看应用。

### 构建生产版本

```bash
npm run build
```

### 部署到 Cloudflare

```bash
# 登录 Cloudflare
npx wrangler login

# 部署
npm run deploy
```

## 🔧 配置说明

### Cloudflare 环境变量

在 Cloudflare Dashboard 中配置以下环境变量：

| 变量名 | 说明 |
|--------|------|
| `JWT_SECRET` | JWT 密钥 |
| `ENCRYPTION_KEY` | 数据加密密钥 |
| `KV_NAMESPACE` | KV 命名空间 ID |

### 本地开发配置

创建 `web/.dev.vars` 文件：

```env
JWT_SECRET=your-secret-key
ENCRYPTION_KEY=your-encryption-key
```

## 📝 使用指南

### 创建思维导图
1. 点击左侧导航栏的「作品」
2. 点击「新建」按钮
3. 选择模板或从空白开始
4. 在画布上创建和编辑节点

### 使用模板
1. 点击左侧导航栏的「模板」
2. 浏览模板列表或搜索
3. 点击模板预览，然后点击「使用模板」

### 导出作品
1. 在作品列表中选择要导出的作品
2. 点击「导出」按钮
3. 选择导出格式（JSON）

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

如有问题或建议，请通过以下方式联系：
- 提交 GitHub Issue
- 发送邮件至 2295665424@qq.com
