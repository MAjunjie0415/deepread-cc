#!/usr/bin/env node

/**
 * Supadata API 测试脚本
 * 用于验证 API Key 是否正确配置
 */

const testVideoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

async function testSupadataAPI() {
  console.log('🧪 测试 Supadata.ai API 配置\n');
  
  // 检查环境变量
  const apiKey = process.env.SUPADATA_API_KEY;
  
  if (!apiKey) {
    console.error('❌ 错误：未找到 SUPADATA_API_KEY 环境变量');
    console.log('\n💡 解决方案：');
    console.log('1. 创建 .env.local 文件');
    console.log('2. 添加：SUPADATA_API_KEY=your_api_key_here');
    console.log('3. 重新运行此脚本：node test-supadata.js\n');
    process.exit(1);
  }

  console.log('✅ 找到 API Key:', apiKey.substring(0, 10) + '...');
  console.log(`📹 测试视频: ${testVideoUrl}\n`);
  console.log('⏳ 正在请求字幕...\n');

  try {
    const response = await fetch(
      `https://api.supadata.ai/v1/transcript?url=${encodeURIComponent(testVideoUrl)}`,
      {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API 请求失败 (${response.status})`);
      console.error('错误详情:', errorText);
      
      if (response.status === 401) {
        console.log('\n💡 可能原因：');
        console.log('- API Key 无效或已过期');
        console.log('- 请访问 https://supadata.ai 检查你的 API Key');
      } else if (response.status === 429) {
        console.log('\n💡 可能原因：');
        console.log('- 请求次数超过限制');
        console.log('- 请等待一段时间后重试');
      }
      
      process.exit(1);
    }

    const data = await response.json();
    
    console.log('✅ API 请求成功！\n');
    console.log('📊 返回数据概览：');
    console.log('-----------------------------------');
    console.log('语言:', data.lang || '未知');
    console.log('内容长度:', data.content?.length || 0, '字符');
    
    if (data.segments && Array.isArray(data.segments)) {
      console.log('片段数量:', data.segments.length);
      console.log('\n📝 前 3 个片段示例：');
      data.segments.slice(0, 3).forEach((seg, index) => {
        console.log(`  ${index + 1}. [${seg.start?.toFixed(1)}s] ${seg.text?.substring(0, 50)}...`);
      });
    }
    
    if (data.content) {
      console.log('\n📄 内容预览（前 200 字符）：');
      console.log(data.content.substring(0, 200) + '...');
    }
    
    console.log('\n-----------------------------------');
    console.log('🎉 测试成功！你的 Supadata API 配置正确。');
    console.log('✨ 现在可以启动应用：npm run dev\n');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.log('\n💡 可能原因：');
    console.log('- 网络连接问题');
    console.log('- API 服务暂时不可用');
    console.log('- 请稍后重试\n');
    process.exit(1);
  }
}

// 运行测试
testSupadataAPI();

