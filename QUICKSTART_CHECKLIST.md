# 🚀 DeepRead 快速启动检查清单

按照以下步骤操作，5分钟内启动你的 DeepRead 应用！

---

## ✅ 步骤 1: 安装依赖

```bash
npm install
```

**检查点**：看到 "added XXX packages" 表示成功

---

## ✅ 步骤 2: 获取 Supadata API Key

1. [ ] 访问 https://supadata.ai
2. [ ] 点击 "Sign in" 注册账号
3. [ ] 进入 Dashboard
4. [ ] 复制 API Key（以 `sup_` 开头）

**快捷链接**：[详细指南](./SUPADATA_API_GUIDE.md)

---

## ✅ 步骤 3: 获取 DeepSeek API Key

1. [ ] 访问 https://www.deepseek.com
2. [ ] 注册账号并登录
3. [ ] 进入 API 管理页面
4. [ ] 创建并复制 API Key（以 `sk-` 开头）

**快捷链接**：[详细指南](./DEEPSEEK_API_KEY_GUIDE.md)

---

## ✅ 步骤 4: 配置环境变量

创建 `.env.local` 文件：

```bash
# 方法 1: 手动创建
# 在项目根目录创建 .env.local 文件，添加以下内容：

SUPADATA_API_KEY=sup_your_actual_api_key_here
DEEPSEEK_API_KEY=sk-your_actual_api_key_here
```

```bash
# 方法 2: 使用命令行（替换为你的真实 API Key）
echo "SUPADATA_API_KEY=sup_your_api_key" > .env.local
echo "DEEPSEEK_API_KEY=sk_your_api_key" >> .env.local
```

**检查点**：
```bash
# 验证文件是否创建成功
cat .env.local
```

应该看到两行配置。

---

## ✅ 步骤 5: 测试 API 配置

```bash
npm run test:api
```

**期望输出**：
```
✅ 找到 API Key: sup_xxxxxx...
📹 测试视频: https://www.youtube.com/watch?v=dQw4w9WgXcQ
⏳ 正在请求字幕...

✅ API 请求成功！
🎉 测试成功！你的 Supadata API 配置正确。
```

**如果失败**：查看 [SETUP_GUIDE.md](./SETUP_GUIDE.md) 的故障排查部分

---

## ✅ 步骤 6: 启动应用

```bash
npm run dev
```

**期望输出**：
```
  ▲ Next.js 16.0.0
  - Local:        http://localhost:3000
  - Network:      http://192.168.x.x:3000

 ✓ Ready in 2.3s
```

---

## ✅ 步骤 7: 访问应用

在浏览器中打开：http://localhost:3000

**检查点**：
- [ ] 看到 "DeepRead 深度阅读引擎" 标题
- [ ] 看到 YouTube URL 输入框
- [ ] 页面样式正常显示

---

## ✅ 步骤 8: 测试功能

### 测试字幕获取

1. [ ] 在输入框中粘贴：`https://www.youtube.com/watch?v=dQw4w9WgXcQ`
2. [ ] 点击 "拉取字幕" 按钮
3. [ ] 等待跳转到视频页面
4. [ ] 确认字幕自动加载

**期望结果**：
- 左侧显示 YouTube 视频播放器
- 右侧显示字幕列表
- 字幕带有时间戳

### 测试深度分析（可选）

1. [ ] 在字幕加载成功后
2. [ ] 点击 "开始深度分析" 按钮
3. [ ] 等待 AI 分析完成
4. [ ] 查看主线分析结果

---

## 🎉 完成！

恭喜！你的 DeepRead 应用已经成功启动。

### 下一步可以做什么？

- 📺 尝试分析你喜欢的 YouTube 视频
- 🔍 使用深挖功能探索特定主线
- 🃏 使用复习卡片巩固学习
- 📝 在笔记编辑器中整理知识

---

## ❌ 遇到问题？

### 常见问题快速解决

| 问题 | 解决方案 |
|------|---------|
| 找不到 API Key | 查看 [SUPADATA_API_GUIDE.md](./SUPADATA_API_GUIDE.md) |
| 字幕获取失败 | 运行 `npm run test:api` 测试配置 |
| 端口被占用 | 运行 `PORT=3001 npm run dev` 使用其他端口 |
| 依赖安装失败 | 删除 `node_modules` 后重新 `npm install` |

### 详细故障排查

查看 [SETUP_GUIDE.md](./SETUP_GUIDE.md) 的第 6 节：故障排查

---

## 📚 文档索引

- [README.md](./README.md) - 项目概述
- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - 完整设置指南
- [SUPADATA_API_GUIDE.md](./SUPADATA_API_GUIDE.md) - Supadata 配置
- [DEEPSEEK_API_KEY_GUIDE.md](./DEEPSEEK_API_KEY_GUIDE.md) - DeepSeek 配置
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 部署指南
- [CHANGELOG.md](./CHANGELOG.md) - 更新日志

---

**需要帮助？** 提交 Issue 或查看文档获取更多信息。

