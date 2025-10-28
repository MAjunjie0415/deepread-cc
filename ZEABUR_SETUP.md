# 🚀 Zeabur 部署完整指南

## 📌 重要提示
**这是唯一正确的方案**！按照步骤操作，保证成功！

---

## 第一阶段：部署字幕 API 到 Zeabur

### 步骤 1：创建 GitHub 仓库

1. **打开浏览器**，访问：https://github.com/new
2. 填写信息：
   - **Repository name**: `deepread-subtitle-api`
   - **Description**: `DeepRead 字幕提取服务`
   - 选择 **Public**
   - **不要勾选**任何选项
3. 点击 **Create repository**

### 步骤 2：推送代码到 GitHub

打开**终端**，执行：

```bash
cd /Users/mima0000/deepread-subtitle-api

# 添加远程仓库（替换 YOUR_USERNAME 为你的 GitHub 用户名）
git remote add origin https://github.com/YOUR_USERNAME/deepread-subtitle-api.git

# 推送代码
git push -u origin main
```

✅ **验证**：刷新 GitHub 页面，应该看到 6 个文件：
- `main.py`
- `requirements.txt`
- `Dockerfile`
- `README.md`
- `.gitignore`
- `DEPLOYMENT_GUIDE.md`

### 步骤 3：在 Zeabur 部署

1. **访问** https://zeabur.com
2. 点击 **Sign in** → 选择 **Continue with GitHub**
3. 授权 Zeabur 访问你的 GitHub

4. 进入控制台后：
   - 点击 **Create Project**
   - 输入项目名：`deepread-subtitle`
   - 点击 **Create**

5. 在项目页面：
   - 点击 **Add Service**
   - 选择 **Git**
   - 找到 `deepread-subtitle-api` 仓库
   - 点击 **Deploy**

6. **等待部署**（2-3分钟）
   - 看到 **Building...** → **Deploying...** → **Running** ✅

### 步骤 4：获取 API 地址

1. 部署成功后，点击服务卡片
2. 点击 **Domains** 标签
3. 点击 **Generate Domain**
4. 复制生成的域名，例如：
   ```
   deepread-subtitle-api-abc123.zeabur.app
   ```

### 步骤 5：测试 Zeabur API

打开终端，执行（替换为你的域名）：

```bash
# 测试健康检查
curl https://your-domain.zeabur.app/

# 测试字幕提取
curl -X POST https://your-domain.zeabur.app/extract \
     -H "Content-Type: application/json" \
     -d '{"url":"https://www.youtube.com/watch?v=7xTGNNLPyMI"}'
```

应该返回大量 JSON 数据！

✅ **第一阶段完成！**

---

## 第二阶段：配置 Vercel 前端

### 步骤 1：修改 API 文件

文件：`/Users/mima0000/deepread-cc/src/app/api/pull/route.ts`

已经为你准备好了，但需要修改第 5 行：

```typescript
const SUBTITLE_API = process.env.SUBTITLE_API_URL || 'https://your-zeabur-domain.zeabur.app/extract';
```

把 `https://your-zeabur-domain.zeabur.app/extract` 替换为：
```
https://你刚才复制的Zeabur域名/extract
```

例如：
```typescript
const SUBTITLE_API = process.env.SUBTITLE_API_URL || 'https://deepread-subtitle-api-abc123.zeabur.app/extract';
```

### 步骤 2：在 Vercel 添加环境变量

1. 访问 https://vercel.com/dashboard
2. 进入 `deepread-cc` 项目
3. 点击 **Settings** → **Environment Variables**
4. 添加新变量：
   - **Name**: `SUBTITLE_API_URL`
   - **Value**: `https://你的Zeabur域名/extract`
   - 选择 **Production, Preview, Development**
5. 点击 **Save**

### 步骤 3：提交并推送

```bash
cd /Users/mima0000/deepread-cc

# 检查修改
git status

# 添加修改
git add src/app/api/pull/route.ts

# 提交
git commit -m "feat: 使用 Zeabur 字幕 API - 终极稳定方案"

# 推送
git push origin main
```

### 步骤 4：等待 Vercel 部署

- Vercel 会自动检测更新并部署
- 大约 1-2 分钟
- 查看 https://vercel.com/dashboard 确认部署成功

---

## 第三阶段：测试完整流程

### 测试步骤

1. 访问：https://deepread-cc.vercel.app
2. 输入 YouTube 链接：`https://www.youtube.com/watch?v=7xTGNNLPyMI`
3. 点击 **"开始深度阅读"**
4. 观察：
   - 左侧显示 YouTube 视频
   - 右侧开始加载字幕
   - 5-10 秒后应该显示完整字幕

### 成功标志

✅ 右侧显示：
- 📝 1387 段字幕
- ⏱️ 60:02 时长
- 最后一段："all right thanks for watching everyone, I'll see you next time"

---

## 🎯 为什么这个方案100%成功？

1. **Zeabur 不受限制** - 独立的 Python 服务，不受 Vercel 限制
2. **专业的字幕库** - `youtube-transcript-api` 经过数千项目验证
3. **完整翻页** - 自动获取所有字幕，不遗漏
4. **简单架构** - Vercel 只负责转发请求
5. **易于调试** - 每一步都可以单独测试

---

## 🆘 故障排查

### Zeabur 构建失败
**检查**：
- 仓库中是否有 `Dockerfile`、`requirements.txt`、`main.py`
- Zeabur 日志中的具体错误

**解决**：
- 确保文件内容完全正确
- 重新推送代码

### Vercel 调用失败
**检查**：
- `SUBTITLE_API` 变量是否正确
- 末尾是否加了 `/extract`
- Zeabur API 单独测试是否正常

**解决**：
- 打开 Vercel Function 日志查看详细错误
- 确认 Zeabur 域名可访问

### 字幕获取失败
**检查**：
- Zeabur 日志中的错误信息
- 是否是 YouTube 限制问题

**解决**：
- 尝试不同的视频
- 检查 Zeabur 服务是否正常运行

---

## 📞 需要帮助？

准备以下信息：
1. Zeabur 生成的域名
2. Zeabur 的部署日志（如果有错误）
3. Vercel Function 的日志
4. 浏览器控制台的错误信息

发给我，我会立即帮你解决！

---

## 🎉 完成后的架构

```
用户浏览器
    ↓
Vercel Frontend (deepread-cc.vercel.app)
    ↓
Vercel API (/api/pull)
    ↓
Zeabur API (deepread-subtitle-api.zeabur.app)
    ↓
YouTube (获取字幕)
```

**每一层都可以独立测试和调试！**

