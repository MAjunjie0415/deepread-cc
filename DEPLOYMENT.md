# DeepRead 部署指南

## 🚀 Vercel 部署步骤

### 1. 准备 GitHub 仓库

```bash
# 初始化 Git 仓库
git init

# 添加所有文件
git add .

# 提交更改
git commit -m "Initial commit: DeepRead engine ready for deployment"

# 添加远程仓库（替换为你的 GitHub 仓库地址）
git remote add origin https://github.com/your-username/deepread-cc.git

# 推送到 GitHub
git push -u origin main
```

### 2. Vercel 部署

1. **访问 Vercel**
   - 打开 [vercel.com](https://vercel.com)
   - 使用 GitHub 账号登录

2. **导入项目**
   - 点击 "New Project"
   - 选择你的 GitHub 仓库 `deepread-cc`
   - 点击 "Import"

3. **配置项目**
   - Framework Preset: Next.js
   - Root Directory: `./` (默认)
   - Build Command: `npm run build` (默认)
   - Output Directory: `.next` (默认)

4. **环境变量配置**
   - 在项目设置中找到 "Environment Variables"
   - 添加以下变量：
     ```
     DEEPSEEK_API_KEY = sk-your-deepseek-api-key
     ```

5. **部署**
   - 点击 "Deploy" 按钮
   - 等待部署完成（通常需要 2-3 分钟）

### 3. 验证部署

部署完成后，你会得到一个 Vercel 提供的 URL（如：`https://deepread-cc.vercel.app`）

访问该 URL 并测试以下功能：

1. **字幕拉取测试**
   - 输入一个真实的 YouTube URL
   - 点击"拉取字幕"按钮
   - 验证是否能成功获取字幕

2. **深度分析测试**
   - 在获取字幕后，点击"开始分析"
   - 验证是否能成功调用 DeepSeek API
   - 检查是否生成了主线分析结果

3. **深挖功能测试**
   - 点击任意主线的"深挖"按钮
   - 验证是否能生成长文内容

## 🔧 环境变量说明

### 必需变量

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | `sk-xxxxxxxxxxxxxxxx` |

### 获取 DeepSeek API Key

1. 访问 [DeepSeek 官网](https://www.deepseek.com/)
2. 注册账号并登录
3. 进入 API 管理页面
4. 创建新的 API Key
5. 复制生成的密钥

## 🐛 常见问题

### 1. 字幕拉取失败

**可能原因：**
- YouTube URL 格式不正确
- 视频没有字幕
- 网络连接问题

**解决方案：**
- 检查 URL 格式是否正确
- 尝试其他有字幕的视频
- 检查 Vercel 函数日志

### 2. DeepSeek API 调用失败

**可能原因：**
- API Key 未设置或无效
- API 配额不足
- 请求内容过长

**解决方案：**
- 检查环境变量是否正确设置
- 验证 API Key 有效性
- 检查 DeepSeek 账户余额

### 3. 部署失败

**可能原因：**
- 构建错误
- 依赖安装失败
- 环境变量缺失

**解决方案：**
- 检查本地 `npm run build` 是否成功
- 查看 Vercel 构建日志
- 确保所有必需的环境变量都已设置

## 📊 性能优化

### 1. 启用缓存

在生产环境中，建议启用以下缓存策略：

- **字幕缓存**: 相同视频的字幕结果缓存 24 小时
- **分析缓存**: 相同内容的分析结果缓存 7 天

### 2. 监控和日志

- 使用 Vercel Analytics 监控应用性能
- 设置错误日志收集
- 监控 API 调用频率和成本

## 🔄 更新部署

当代码有更新时：

```bash
# 提交更改
git add .
git commit -m "Update: 描述你的更改"
git push origin main
```

Vercel 会自动检测到 GitHub 的更新并重新部署。

## 📈 扩展功能

部署成功后，可以考虑添加以下功能：

1. **用户认证** - 支持用户登录和个性化设置
2. **数据持久化** - 保存用户的笔记和分析结果
3. **分享功能** - 允许用户分享分析结果
4. **批量处理** - 支持同时分析多个视频
5. **导出功能** - 导出为 PDF、Markdown 等格式

## 🆘 技术支持

如果遇到部署问题：

1. 查看 [Vercel 文档](https://vercel.com/docs)
2. 检查 [Next.js 部署指南](https://nextjs.org/docs/deployment)
3. 提交 [GitHub Issue](https://github.com/your-username/deepread-cc/issues)
4. 联系技术支持

---

🎉 恭喜！你的 DeepRead 深度阅读引擎已经成功部署到 Vercel！