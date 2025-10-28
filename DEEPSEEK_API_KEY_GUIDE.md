# DeepSeek API Key 验证指南

## 1. 检查 API Key 格式
您的 DeepSeek API Key 应该：
- 以 `sk-` 开头
- 长度约 50+ 字符
- 示例：`sk-1234567890abcdef1234567890abcdef1234567890abcdef`

## 2. 获取正确的 API Key
1. 访问 https://www.deepseek.com/
2. 登录您的账户
3. 进入 API 管理页面
4. 创建新的 API Key
5. 复制完整的密钥（包括 sk- 前缀）

## 3. 测试 API Key
您可以使用以下 curl 命令测试 API Key 是否有效：

```bash
curl -X POST "https://api.deepseek.com/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -d '{
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 10
  }'
```

如果返回 JSON 响应而不是错误，说明 API Key 有效。
