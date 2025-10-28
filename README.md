# DeepRead - 深度阅读引擎

一个基于 Next.js + DeepSeek 的 YouTube 字幕深度分析工具，能够将长视频内容转化为结构化的知识体系。

## ✨ 功能特性

- 🎥 **YouTube 字幕拉取** - 支持多语言字幕自动获取
- 🧠 **AI 深度分析** - 使用 DeepSeek 提取主线内容和关键观点
- 📚 **智能笔记生成** - 自动生成结构化的人读笔记
- 🔍 **深挖功能** - 针对特定主线生成长文和教学提纲
- 🃏 **复习卡片** - 自动生成问答式复习卡片
- 🌐 **双语支持** - 支持中文和英文界面
- 📱 **响应式设计** - 适配桌面和移动设备

## 🚀 快速开始

### 环境要求

- Node.js 18+ 
- npm 或 yarn
- DeepSeek API Key

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
   ```bash
   cp .env.example .env.local
   ```
   
   编辑 `.env.local` 文件：
   ```bash
   DEEPSEEK_API_KEY=sk-your-deepseek-api-key
   ```

4. **启动开发服务器**
   ```bash
   npm run dev
   ```

5. **访问应用**
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
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | ✅ |
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

⭐ 如果这个项目对您有帮助，请给它一个 Star！