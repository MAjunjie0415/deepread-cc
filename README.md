# DeepRead - 深度阅读引擎

一个基于 Next.js + DeepSeek + Vercel 的 YouTube 字幕深度分析工具，支持多主线评分、深度笔记生成、复习卡片和迭代深挖功能。

## 功能特性

- 🎥 **YouTube 字幕拉取**: 支持多语言字幕自动获取
- 🧠 **AI 深度分析**: 基于 DeepSeek 的多主线文本分析
- 📊 **智能评分**: 相关性、新颖性、可操作性、可信度四维评分
- 📝 **深度笔记**: 自动生成可编辑的 Markdown 笔记
- 🃏 **复习卡片**: 智能生成问答卡片，支持学习进度跟踪
- 🔍 **深挖功能**: 针对特定主线生成详细长文分析
- 🌐 **双语支持**: 中文/英文界面切换
- 💾 **本地存储**: 笔记自动保存到 localStorage
- 🚀 **零配置部署**: 一键部署到 Vercel

## 技术栈

- **前端**: Next.js 16, React, TypeScript, Tailwind CSS, shadcn/ui
- **后端**: Next.js API Routes
- **AI**: DeepSeek API
- **存储**: localStorage (无数据库依赖)
- **编辑器**: Monaco Editor
- **部署**: Vercel (推荐)

## 快速开始

### 1. 环境配置

创建 `.env.local` 文件：

```bash
# DeepSeek API (必需)
DEEPSEEK_API_KEY=sk-xxxxx

# App URL (可选，用于生产环境)
NEXT_PUBLIC_APP_URL=https://deepread.vercel.app
```

### 2. 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:3000
```

### 3. 部署到 Vercel

#### 方法一：Vercel CLI (推荐)

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录 Vercel
vercel login

# 部署
vercel --prod
```

#### 方法二：GitHub 集成

1. 将代码推送到 GitHub 仓库
2. 访问 [vercel.com](https://vercel.com)
3. 点击 "New Project"
4. 导入 GitHub 仓库
5. 配置环境变量 `DEEPSEEK_API_KEY`
6. 点击 "Deploy"

## 使用指南

### 基本流程

1. **粘贴 YouTube URL**: 在左侧输入框中粘贴 YouTube 视频链接
2. **拉取字幕**: 点击"拉取字幕"按钮获取视频字幕
3. **设置兴趣权重**: 调整不同主题的兴趣权重（0-1）
4. **深度分析**: 点击"分析"按钮进行 AI 深度分析
5. **查看结果**: 在右侧查看主线分析、笔记编辑器和复习区
6. **深挖探索**: 点击任意主线的"深挖"按钮获取详细分析

### 功能说明

#### 主线分析
- 自动识别 3-8 条主要线索
- 每条主线包含关键要点和原文引用
- 四维评分系统（相关性、新颖性、可操作性、可信度）

#### 笔记编辑器
- 基于 Monaco Editor 的 Markdown 编辑器
- 自动保存到本地存储
- 支持语法高亮和实时预览

#### 复习系统
- **复习卡片**: 智能生成的问答对
- **重点片段**: 需要重点关注的文本段落
- **追问列表**: 进一步探索的问题建议

#### 深挖功能
- 针对特定主线生成 800-2000 字深度分析
- 包含教学提纲和幻灯片标题
- 支持多角度解读和实践应用

## API 接口

### POST /api/pull
拉取 YouTube 字幕

```json
{
  "url": "https://youtube.com/watch?v=xxx",
  "lang": "zh-Hans,zh-Hant,en"
}
```

### POST /api/deep_reading
深度阅读分析

```json
{
  "transcript": "字幕文本",
  "interests": {"AI": 0.7, "Technology": 0.3},
  "max_main_lines": 3,
  "scoring_weights": {
    "relevance": 0.4,
    "novelty": 0.25,
    "actionability": 0.2,
    "credibility": 0.15
  },
  "lang": "zh"
}
```

### POST /api/drill_down
深挖分析

```json
{
  "main_line_index": 0,
  "transcript": "字幕文本",
  "word_limit": 1500,
  "lang": "zh"
}
```

## 开发说明

### 项目结构

```
src/
├── app/
│   ├── api/           # API 路由
│   ├── page.tsx       # 主页面
│   └── layout.tsx     # 布局组件
├── components/        # UI 组件
├── types/            # TypeScript 类型定义
└── lib/              # 工具函数
```

### 核心组件

- `InterestSlider`: 兴趣权重调节器
- `MainLineCards`: 主线分析卡片
- `NoteEditor`: Monaco 笔记编辑器
- `FlashCardZone`: 复习卡片区域

## 注意事项

1. **API 限制**: DeepSeek API 有调用频率限制，建议合理使用
2. **无缓存设计**: 当前版本无缓存，每次分析都会调用 DeepSeek API
3. **字幕质量**: 分析效果取决于字幕的完整性和准确性
4. **浏览器兼容**: 建议使用现代浏览器（Chrome, Firefox, Safari）
5. **数据存储**: 所有数据存储在浏览器 localStorage，刷新页面不会丢失

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### v1.0.0
- 初始版本发布
- 支持 YouTube 字幕拉取和分析
- 实现深度阅读和复习功能
- 添加双语支持