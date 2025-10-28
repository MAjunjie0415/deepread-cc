# DeepRead Vercel 部署指南

## 🚀 一键部署到 Vercel

### 方法一：Vercel CLI (推荐)

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录 Vercel
vercel login

# 3. 进入项目目录
cd deepread-cc

# 4. 部署
vercel --prod
```

### 方法二：GitHub + Vercel Web

1. **推送代码到 GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/deepread-cc.git
   git push -u origin main
   ```

2. **Vercel 部署**
   - 访问 [vercel.com](https://vercel.com)
   - 点击 "New Project"
   - 导入 GitHub 仓库
   - 配置环境变量：
     ```
     DEEPSEEK_API_KEY=sk-xxxxx
     ```
   - 点击 "Deploy"

## 🔧 环境变量配置

### 必需的环境变量
```bash
DEEPSEEK_API_KEY=sk-xxxxx
```

### 可选的环境变量
```bash
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

## 📝 获取 DeepSeek API Key

1. 访问 [DeepSeek 官网](https://platform.deepseek.com)
2. 注册/登录账号
3. 进入 API Keys 页面
4. 创建新的 API Key
5. 复制 API Key 到环境变量

## ✅ 部署完成后的功能

- ✅ YouTube 字幕拉取 (Vercel 网络环境)
- ✅ AI 深度分析
- ✅ 多主线评分
- ✅ 笔记编辑器
- ✅ 复习卡片
- ✅ 深挖功能
- ✅ 中英文切换

## 🎯 使用流程

1. 访问部署的网站
2. 粘贴 YouTube URL
3. 点击"拉取字幕"
4. 调整兴趣权重
5. 点击"分析"
6. 查看结果并编辑笔记
7. 使用复习卡片学习

## 🔍 故障排除

### 常见问题

1. **字幕拉取失败**
   - 检查 YouTube URL 格式
   - 确认视频有字幕
   - Vercel 网络环境通常更稳定

2. **分析失败**
   - 检查 DeepSeek API Key
   - 确认 API 额度充足

3. **页面加载错误**
   - 清除浏览器缓存
   - 检查网络连接

### 技术支持

如有问题，请检查：
- 浏览器控制台错误
- Vercel 部署日志
- DeepSeek API 状态

## 🎉 完成！

部署成功后，您就可以开始使用 DeepRead 深度阅读引擎了！

**Vercel 的网络环境通常比本地开发环境更稳定，字幕拉取成功率更高！**