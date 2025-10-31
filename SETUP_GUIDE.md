# DeepRead 完整设置指南

## 📋 目录

1. [安装依赖](#1-安装依赖)
2. [配置 Supadata API](#2-配置-supadata-api)
3. [配置 DeepSeek API](#3-配置-deepseek-api)
4. [测试配置](#4-测试配置)
5. [启动应用](#5-启动应用)
6. [故障排查](#6-故障排查)

---

## 1. 安装依赖

```bash
# 克隆项目
git clone https://github.com/your-username/deepread-cc.git
cd deepread-cc

# 安装依赖
npm install
```

---

## 2. 配置 Supadata API

### 为什么需要 Supadata？

Supadata.ai 是我们用于获取 YouTube 字幕的核心服务。相比其他方案，它具有：
- ✅ 高成功率
- ✅ 稳定可靠
- ✅ 免费额度（100次请求）

### 获取步骤

1. **访问 Supadata 官网**
   
   打开 https://supadata.ai

2. **注册账号**
   
   - 点击右上角 "Sign in"
   - 使用 Google 或邮箱注册
   - 验证邮箱

3. **获取 API Key**
   
   - 登录后进入 Dashboard
   - 复制显示的 API Key
   - 格式类似：`sup_xxxxxxxxxxxxxxxxxxxxxxxx`

4. **添加到项目**
   
   在项目根目录创建 `.env.local` 文件：
   
   ```bash
   SUPADATA_API_KEY=sup_your_actual_api_key_here
   ```

### 验证配置

运行测试脚本验证：

```bash
node test-supadata.js
```

如果看到 "🎉 测试成功！" 说明配置正确。

> 💡 详细说明请查看：[SUPADATA_API_GUIDE.md](./SUPADATA_API_GUIDE.md)

---

## 3. 配置 DeepSeek API

### 为什么需要 DeepSeek？

DeepSeek 是我们用于 AI 分析的服务，负责：
- 提取视频主线
- 生成结构化笔记
- 创建复习卡片

### 获取步骤

1. **访问 DeepSeek 官网**
   
   打开 https://www.deepseek.com/

2. **注册账号**
   
   - 点击注册按钮
   - 完成账号注册流程

3. **获取 API Key**
   
   - 登录后进入 API 管理页面
   - 创建新的 API Key
   - 复制生成的密钥
   - 格式类似：`sk-xxxxxxxxxxxxxxxxxxxxxxxx`

4. **添加到项目**
   
   在 `.env.local` 文件中添加：
   
   ```bash
   SUPADATA_API_KEY=sup_your_actual_api_key_here
   DEEPSEEK_API_KEY=sk-your-actual-deepseek-api-key-here
   ```

> 💡 详细说明请查看：[DEEPSEEK_API_KEY_GUIDE.md](./DEEPSEEK_API_KEY_GUIDE.md)

---

## 4. 测试配置

### 完整的 .env.local 示例

你的 `.env.local` 文件应该包含以下内容：

```bash
# Supadata.ai API Key（字幕获取 - 必需）
SUPADATA_API_KEY=sup_your_actual_api_key_here

# DeepSeek API Key（AI 分析 - 必需）
DEEPSEEK_API_KEY=sk-your-actual-deepseek-api-key-here
```

### 测试 Supadata API

```bash
node test-supadata.js
```

预期输出：
```
✅ 找到 API Key: sup_xxxxxx...
📹 测试视频: https://www.youtube.com/watch?v=dQw4w9WgXcQ
⏳ 正在请求字幕...

✅ API 请求成功！
🎉 测试成功！你的 Supadata API 配置正确。
```

---

## 5. 启动应用

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build
npm start
```

访问 http://localhost:3000 查看应用。

---

## 6. 故障排查

### ❌ 字幕获取失败

**症状**：无法获取 YouTube 字幕

**可能原因及解决方案**：

1. **API Key 未配置**
   ```bash
   # 检查 .env.local 是否存在
   cat .env.local
   
   # 运行测试脚本
   node test-supadata.js
   ```

2. **API Key 无效**
   - 访问 https://supadata.ai 验证 API Key
   - 确保复制了完整的 Key（包括 `sup_` 前缀）
   - 重新生成 API Key

3. **免费额度用尽**
   - 检查 Supadata Dashboard 的使用情况
   - 考虑升级付费套餐
   - 或使用新账号（如果是测试环境）

4. **视频无字幕**
   - 确认视频确实有字幕
   - 在 YouTube 上打开视频，查看是否有 CC 按钮
   - 尝试其他视频

### ❌ AI 分析失败

**症状**：无法进行深度分析

**可能原因及解决方案**：

1. **DeepSeek API Key 未配置**
   ```bash
   # 检查环境变量
   echo $DEEPSEEK_API_KEY
   ```

2. **API Key 无效**
   - 访问 https://www.deepseek.com/ 验证
   - 确保 Key 以 `sk-` 开头
   - 检查 Key 是否过期

3. **API 额度不足**
   - 检查 DeepSeek 账户余额
   - 充值或购买套餐

### ❌ 应用启动失败

**症状**：`npm run dev` 报错

**解决方案**：

1. **删除并重新安装依赖**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **检查 Node.js 版本**
   ```bash
   node --version  # 应该 >= 18
   ```

3. **清除 Next.js 缓存**
   ```bash
   rm -rf .next
   npm run dev
   ```

### ❌ 端口被占用

**症状**：`Port 3000 is already in use`

**解决方案**：

```bash
# 方法 1: 使用其他端口
PORT=3001 npm run dev

# 方法 2: 杀死占用进程（Mac/Linux）
lsof -ti:3000 | xargs kill -9
```

---

## 📚 更多资源

- [README.md](./README.md) - 项目概述
- [SUPADATA_API_GUIDE.md](./SUPADATA_API_GUIDE.md) - Supadata 详细指南
- [DEEPSEEK_API_KEY_GUIDE.md](./DEEPSEEK_API_KEY_GUIDE.md) - DeepSeek 配置指南
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 部署指南

---

## 💬 获取帮助

如果遇到问题：

1. 查看本文档的故障排查部分
2. 检查项目的 GitHub Issues
3. 提交新的 Issue 并附上错误信息

---

**祝你使用愉快！🎉**

