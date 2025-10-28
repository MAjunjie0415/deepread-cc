# DeepRead 本地测试指南

## 🚀 快速开始

### 1. 启动开发服务器

```bash
cd /Users/mima0000/deepread-cc
npm run dev
```

服务器将在 `http://localhost:3000` 启动

### 2. 访问应用

打开浏览器访问：`http://localhost:3000`

## 🧪 测试流程

### 步骤 1：拉取字幕

1. 在 URL 输入框中输入任意 YouTube 链接（包含 "test" 关键词会使用模拟数据）
2. 点击"拉取字幕"按钮
3. 应该看到成功获取 12 段模拟字幕数据

**测试 URL 示例：**
- `https://www.youtube.com/watch?v=test123` ✅ 使用模拟数据
- `https://www.youtube.com/watch?v=any-video-id` ✅ 使用模拟数据（开发环境）

### 步骤 2：调整兴趣权重

1. 在兴趣权重区域调整各个兴趣的权重
2. 默认兴趣：AI (0.5), Technology (0.3), Business (0.2), Psychology (0.1), Science (0.4)

### 步骤 3：开始分析

1. 点击"开始分析"按钮
2. 等待几秒钟（模拟 AI 处理时间）
3. 应该看到：
   - 2 条主线分析结果
   - 深度笔记（Markdown 格式）
   - 3 张复习卡片
   - 10 个追问问题

### 步骤 4：深挖内容

1. 在主线卡片中点击"深挖这条主线"按钮
2. 等待几秒钟
3. 应该看到：
   - 详细的长文分析（800+ 字）
   - 10 条教学提纲
   - 5 个关键幻灯片标题

## 📊 模拟数据说明

### 字幕数据
- 12 段关于 AI 和机器学习的英文字幕
- 包含时间戳和文本内容
- 总时长约 1 分 8 秒

### 深度阅读结果
- **主线 1**：机器学习基础 (87.5 分)
- **主线 2**：深度学习应用 (82.3 分)
- 包含详细的证据引用和评分

### 深挖内容
- 1500+ 字的深度长文
- 完整的教学提纲
- 实用的幻灯片标题

## 🔧 API 测试

### 字幕拉取 API
```bash
curl -X POST http://localhost:3000/api/pull \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=test123","lang":"zh"}'
```

### 深度阅读 API
```bash
curl -X POST http://localhost:3000/api/deep_reading \
  -H "Content-Type: application/json" \
  -d '{"transcript":"test data","interests":{"AI":0.8,"Technology":0.6},"lang":"zh"}'
```

### 深挖 API
```bash
curl -X POST http://localhost:3000/api/drill_down \
  -H "Content-Type: application/json" \
  -d '{"main_line_index":1,"transcript":"test data","lang":"zh"}'
```

## ✅ 预期结果

### 成功指标
- [ ] 页面正常加载，无控制台错误
- [ ] 字幕拉取成功，显示 12 段数据
- [ ] 深度分析完成，显示 2 条主线
- [ ] 深挖功能正常，生成长文内容
- [ ] 所有 UI 组件正常交互
- [ ] 中英文切换正常

### 功能验证
- [ ] 兴趣权重滑块可以调整
- [ ] 主线卡片可以展开/收起
- [ ] 笔记编辑器可以编辑
- [ ] 复习卡片可以翻页
- [ ] 深挖内容可以查看

## 🐛 常见问题

### 1. 页面无法加载
- 检查服务器是否启动：`npm run dev`
- 检查端口 3000 是否被占用

### 2. API 调用失败
- 检查网络连接
- 查看浏览器控制台错误信息
- 确认 API 路由文件存在

### 3. 模拟数据不显示
- 确认 URL 包含 "test" 关键词
- 检查开发环境变量设置

## 🚀 下一步

测试完成后，可以：
1. 部署到 Vercel 进行生产环境测试
2. 配置真实的 DeepSeek API Key
3. 测试真实的 YouTube 字幕拉取
4. 优化 UI 和用户体验

## 📝 测试记录

- [ ] 基础功能测试完成
- [ ] API 接口测试完成
- [ ] UI 交互测试完成
- [ ] 错误处理测试完成
- [ ] 性能测试完成

---

**注意**：当前使用模拟数据进行测试，确保在没有网络问题的情况下验证所有功能正常工作。
