# Supadata.ai API 配置指南

## 🎯 为什么使用 Supadata.ai？

[Supadata.ai](https://supadata.ai) 是一个专业的视频字幕提取 API 服务，相比其他方案有以下优势：

- ✅ **高成功率** - 专门优化用于 YouTube 字幕提取
- ✅ **免费额度** - 注册即送 100 次免费请求
- ✅ **简单易用** - 一行 API 调用即可获取字幕
- ✅ **稳定可靠** - 无需担心被 YouTube 限制
- ✅ **多平台支持** - 支持 YouTube、TikTok、Instagram 等

参考案例：[TLDW.us](https://tldw.us) 也使用了 Supadata 作为后端 API。

## 📋 快速开始

### 1. 注册账号

1. 访问 https://supadata.ai
2. 点击右上角 "Sign in" 按钮
3. 使用 Google 或邮箱注册账号
4. 验证邮箱（如果需要）

### 2. 获取 API Key

1. 登录后进入 Dashboard
2. 在 "API Key" 区域可以看到你的密钥
3. 点击 "Copy" 按钮复制 API Key
4. API Key 格式类似：`sup_xxxxxxxxxxxxxxxxxxxxxxxx`

### 3. 配置到项目

在项目根目录创建 `.env.local` 文件：

```bash
SUPADATA_API_KEY=sup_your_actual_api_key_here
DEEPSEEK_API_KEY=sk-your-deepseek-api-key
```

### 4. 测试 API

可以使用 curl 命令测试：

```bash
curl -X GET 'https://api.supadata.ai/v1/transcript?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ' \
  -H 'x-api-key: sup_your_actual_api_key_here'
```

成功响应示例：
```json
{
  "content": "Never gonna give you up, never gonna let you down...",
  "lang": "en",
  "segments": [
    {
      "start": 0.0,
      "end": 3.5,
      "text": "Never gonna give you up"
    }
  ]
}
```

## 💰 定价说明

### 免费套餐
- **100 次免费请求**
- 适合测试和小规模使用
- 注册即可获得

### 付费套餐
- 按使用量付费
- 详见：https://supadata.ai/pricing
- 价格实惠，适合生产环境

## 🔧 API 使用说明

### 请求格式

```
GET https://api.supadata.ai/v1/transcript?url={VIDEO_URL}
Headers:
  x-api-key: your_api_key
```

### 支持的视频平台

- ✅ YouTube
- ✅ TikTok
- ✅ Instagram
- ✅ X (Twitter)
- ✅ 视频文件

### 返回格式

```typescript
{
  content: string;      // 完整文本内容
  lang: string;         // 语言代码 (en, zh, etc.)
  segments?: Array<{    // 带时间戳的片段（可选）
    start: number;
    end: number;
    text: string;
  }>;
}
```

## ❓ 常见问题

### Q1: 免费额度用完后怎么办？

可以升级到付费套餐，价格很实惠。或者先使用备用方案（项目会自动尝试其他方法）。

### Q2: API 请求失败怎么办？

1. 检查 API Key 是否正确配置
2. 确认视频 URL 是公开的
3. 查看项目日志了解具体错误
4. 项目会自动尝试备用方案

### Q3: 支持哪些语言的字幕？

Supadata 支持 YouTube 上所有语言的字幕，会自动检测并返回。

### Q4: 响应速度如何？

通常 2-5 秒内返回结果，取决于视频长度。

## 🔗 相关链接

- [Supadata 官网](https://supadata.ai)
- [Supadata 文档](https://supadata.ai/documentation)
- [Supadata 定价](https://supadata.ai/pricing)
- [API Status](https://supadata.ai/status)

## 💡 使用建议

1. **开发环境**：使用免费额度即可
2. **生产环境**：建议购买付费套餐以获得稳定服务
3. **缓存策略**：对同一视频的字幕结果进行缓存，避免重复请求
4. **错误处理**：项目已内置备用方案，API 失败时会自动切换

---

如有问题，请查看项目的 Issues 或联系技术支持。

