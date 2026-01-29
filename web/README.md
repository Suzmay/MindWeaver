# MindWeaver - 实时预览开发指南

## 🚀 如何实时查看界面设计

### 方法一：启动开发服务器（推荐）

1. **打开终端，进入项目目录**
   ```bash
   cd web
   ```

2. **安装依赖（如果还没安装）**
   ```bash
   npm install
   ```

3. **启动开发服务器**
   ```bash
   npm run dev
   ```

4. **查看界面**
   - 开发服务器会自动在浏览器中打开 `http://localhost:3000`
   - 如果没有自动打开，手动访问：`http://localhost:3000`

### ✨ 实时预览功能

- **热模块替换（HMR）**：修改代码后，浏览器会自动刷新，无需手动刷新
- **即时反馈**：保存文件后，界面立即更新
- **自动打开浏览器**：启动后自动打开默认浏览器

### 📝 开发流程

1. 修改代码（在 `src/` 目录下的任何文件）
2. 保存文件（Ctrl+S / Cmd+S）
3. 浏览器自动刷新，立即看到效果

### 🛠️ 其他命令

```bash
# 构建生产版本
npm run build

# 预览生产构建
npm run preview

# 代码检查
npm run lint
```

### 🌐 访问地址

- **本地访问**：http://localhost:3000
- **局域网访问**：http://[你的IP地址]:3000（可以在同一网络的其他设备上访问）

### 💡 提示

- 开发服务器会持续运行，直到您按 `Ctrl+C` 停止
- 修改代码后保存即可看到效果，无需重启服务器
- 如果端口 3000 被占用，Vite 会自动使用下一个可用端口

---

## 📁 项目结构

```
web/
├── src/
│   ├── App.tsx              # 主应用组件
│   ├── main.tsx             # 入口文件
│   ├── components/          # 组件目录
│   │   ├── Sidebar.tsx      # 左侧导航栏
│   │   ├── AccountPage.tsx   # 账号页面
│   │   ├── WorksPage.tsx    # 作品集页面
│   │   ├── TemplatesPage.tsx # 模板集页面
│   │   ├── SettingsPage.tsx # 设置页面
│   │   ├── MindMapEditor.tsx # 思维导图编辑器
│   │   ├── MindyAssistant.tsx # AI助手
│   │   └── ui/              # UI组件库
│   └── styles/
│       └── globals.css      # 全局样式
├── index.html               # HTML入口
├── vite.config.ts           # Vite配置
└── package.json             # 项目配置
```

---

## 🎨 设计文件位置

如果您在 Figma 中设计了界面，可以：
1. 导出设计图片到 `src/assets/` 目录
2. 在组件中引用这些图片
3. 或者根据设计稿编写代码实现

---

## ❓ 常见问题

**Q: 启动后显示空白页面？**
- 检查浏览器控制台是否有错误
- 确认所有依赖已正确安装：`npm install`

**Q: 修改代码后没有自动刷新？**
- 确认文件已保存
- 检查终端是否有错误信息
- 尝试手动刷新浏览器

**Q: 端口被占用？**
- Vite 会自动使用下一个可用端口
- 或者修改 `vite.config.ts` 中的 `port` 配置

---

## 🔐 GitHub登录配置

### 为什么需要配置GitHub登录？

- 启用GitHub账号登录功能
- 自动同步GitHub用户信息（头像、用户名、邮箱）
- 获得完整的用户体验

### 配置步骤

1. **创建GitHub OAuth应用**

   - 登录GitHub账号
   - 进入 `Settings > Developer settings > OAuth Apps`
   - 点击 `New OAuth App` 创建新应用
   - 填写应用信息：
     
     | 字段 | 值 |
     |------|-----|
     | Application name | MindWeaver |
     | Homepage URL | `http://localhost:3000` |
     | Application description | 思维导图工具 |
     | Authorization callback URL | `http://localhost:3000/account` |
     
   - 点击 `Register application` 保存

2. **获取Client ID**

   - 保存应用后，您会看到生成的 `Client ID`
   - 复制这个 `Client ID`

3. **配置环境变量**

   - 在 `web` 目录下创建 `.env` 文件（复制 `.env.example`）
   - 打开 `.env` 文件，将 `Client ID` 粘贴到对应位置：
     
     ```
     VITE_GITHUB_CLIENT_ID=your_github_client_id_here
     ```
     
   - 保存文件

4. **重启开发服务器**

   - 如果开发服务器正在运行，按 `Ctrl+C` 停止
   - 重新启动：`npm run dev`

### 测试GitHub登录

1. 访问 `http://localhost:3000`
2. 点击左侧导航栏的「账户」
3. 在「登录选项」卡片中点击「GitHub」登录按钮
4. 按照提示授权GitHub应用
5. 验证是否成功登录并自动填充用户信息

### 注意事项

- **安全性**：不要将 `Client ID` 提交到版本控制系统
- **本地开发**：只需要配置 `Client ID`，不需要 `Client Secret`
- **生产环境**：生产环境需要完整的后端OAuth流程

---

现在您可以开始实时查看和开发界面了！🎉

