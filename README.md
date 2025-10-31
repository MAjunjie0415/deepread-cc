# DeepRead - 深度阅读引擎

一个基于 Next.js + DeepSeek 的 YouTube 字幕深度分析工具，能够将长视频内容转化为结构化的知识体系。

> **🎉 v1.0.0 已发布！** 核心功能全部完成，包括字幕获取、AI 分析、深挖功能！

---

> **🚀 快速开始**：
> - 首次使用？查看 [快速启动检查清单](./QUICKSTART_CHECKLIST.md) ⚡
> - 完整设置指南：[SETUP_GUIDE.md](./SETUP_GUIDE.md) 📘
> - API 配置问题？[Supadata 配置指南](./SUPADATA_API_GUIDE.md) 🔑

---

## ✨ 功能特性

### 核心功能

- 🎥 **YouTube 字幕拉取** - 高成功率字幕获取，支持多语言（使用 Supadata API）
- 🧠 **AI 深度分析** - 使用 DeepSeek 提取 2-5 条核心主线，四维评分系统
- 📚 **智能笔记生成** - 自动生成结构化的 Markdown 笔记
- 🔍 **深挖功能** - 针对任何主线生成 2000-3000 字深度长文
- 📖 **教学提纲** - 自动生成 10-15 个教学要点
- 🖼️ **幻灯片主题** - 提供 5-8 个关键 PPT 主题
- 🃏 **复习卡片** - 自动生成问答式记忆卡片
- 💡 **延伸思考** - 提供深入的后续问题

### 使用体验

- 🌐 **双语支持** - 支持中文和英文界面
- 📱 **响应式设计** - 适配桌面和移动设备
- ⚡ **快速响应** - 字幕 3-5 秒，分析 10-30 秒，深挖 20-40 秒
- 🎨 **美观界面** - 现代化卡片式设计

## 🚀 快速开始

> 📘 **完整设置指南**：查看 [SETUP_GUIDE.md](./SETUP_GUIDE.md) 获取详细的步骤说明和故障排查。

### 环境要求

- Node.js 18+ 
- npm 或 yarn
- **Supadata.ai API Key** (字幕获取服务) - [获取指南](./SUPADATA_API_GUIDE.md)
- **DeepSeek API Key** (AI 分析服务) - [获取指南](./DEEPSEEK_API_KEY_GUIDE.md)

### 安装步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/your-username/deepread-cc.git
   cd deepread-cc
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**
   
   创建 `.env.local` 文件并添加以下内容：
   ```bash
   # Supadata.ai API Key（字幕获取 - 必需）
   SUPADATA_API_KEY=your_supadata_api_key_here
   
   # DeepSeek API Key（AI 分析 - 必需）
   DEEPSEEK_API_KEY=sk-your-deepseek-api-key
   ```
   
   **获取 API Keys：**
   - Supadata: 访问 [https://supadata.ai](https://supadata.ai)，注册后免费获得 100 次请求（[详细配置指南](./SUPADATA_API_GUIDE.md)）
   - DeepSeek: 访问 [https://www.deepseek.com](https://www.deepseek.com)，注册后获取 API Key（[详细配置指南](./DEEPSEEK_API_KEY_GUIDE.md)）

4. **测试 API 配置**（推荐）
   ```bash
   node test-supadata.js
   ```
   确保看到 "🎉 测试成功！" 的提示

5. **启动开发服务器**
   ```bash
   npm run dev
   ```

6. **访问应用**
   打开浏览器访问 `http://localhost:3000`

## 📖 使用指南

### 基本流程

1. **输入 YouTube URL** - 在输入框中粘贴 YouTube 视频链接
2. **拉取字幕** - 点击"拉取字幕"按钮获取视频字幕
3. **调整兴趣权重** - 使用滑块调整不同主题的兴趣权重
4. **开始分析** - 点击"开始分析"让 AI 深度分析内容
5. **查看结果** - 浏览主线分析、深度笔记和复习卡片
6. **深挖内容** - 点击任意主线的"深挖"按钮获取详细内容

### 支持的语言

- **界面语言**: 中文 / English
- **字幕语言**: 自动检测，支持中文、英文等多种语言

## 🛠️ 技术栈

- **前端**: Next.js 16, React, TypeScript, Tailwind CSS
- **UI 组件**: shadcn/ui
- **编辑器**: Monaco Editor
- **字幕服务**: Supadata.ai API
- **AI 服务**: DeepSeek API
- **部署**: Vercel

## 📁 项目结构

```
deepread-cc/
├── src/
│   ├── app/
│   │   ├── api/           # API 路由
│   │   │   ├── pull/      # 字幕拉取
│   │   │   ├── deep_reading/  # 深度分析
│   │   │   └── drill_down/    # 深挖功能
│   │   ├── page.tsx       # 主页面
│   │   └── layout.tsx     # 布局组件
│   ├── components/        # React 组件
│   │   ├── ui/           # shadcn/ui 组件
│   │   ├── InterestSlider.tsx
│   │   ├── MainLineCards.tsx
│   │   ├── NoteEditor.tsx
│   │   └── FlashCardZone.tsx
│   └── types/            # TypeScript 类型定义
├── public/               # 静态资源
└── package.json
```

## 🔧 配置说明

### 环境变量

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `SUPADATA_API_KEY` | Supadata.ai API 密钥（字幕获取） | ✅ |
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥（AI 分析） | ✅ |
| `NODE_ENV` | 环境模式 | ❌ |

### API 端点

- `POST /api/pull` - 拉取 YouTube 字幕
- `POST /api/deep_reading` - 执行深度分析
- `POST /api/drill_down` - 深挖特定主线

## 🚀 部署

### Vercel 部署

1. **连接 GitHub**
   - 将代码推送到 GitHub 仓库
   - 在 Vercel 中导入项目

2. **配置环境变量**
   - 在 Vercel 项目设置中添加 `DEEPSEEK_API_KEY`

3. **一键部署**
   - Vercel 会自动检测 Next.js 项目并部署

### 其他平台

项目支持部署到任何支持 Next.js 的平台：
- Netlify
- Railway
- Render
- 自建服务器

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [DeepSeek](https://www.deepseek.com/) - 提供强大的 AI 分析能力
- [Next.js](https://nextjs.org/) - 优秀的 React 框架
- [shadcn/ui](https://ui.shadcn.com/) - 精美的 UI 组件库
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - 强大的代码编辑器

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 [GitHub Issue](https://github.com/your-username/deepread-cc/issues)
- 发送邮件至 your-email@example.com

---

## 📋 版本历史

### v1.0.0 (2025-10-31) - 首个正式版本 🎉

**核心功能全部完成：**
- ✅ YouTube 字幕自动获取（Supadata API）
- ✅ AI 深度分析（DeepSeek API）
- ✅ 主线提取和四维评分
- ✅ 智能笔记生成
- ✅ 复习卡片生成
- ✅ 深挖功能（长文+提纲+幻灯片）
- ✅ 完整的 UI/UX 实现
- ✅ 完善的文档和配置指南

查看完整更新日志：[CHANGELOG.md](./CHANGELOG.md)

---

⭐ 如果这个项目对您有帮助，请给它一个 Star！