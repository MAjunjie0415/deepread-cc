import { NextRequest, NextResponse } from 'next/server';

// ⚠️ 重要：部署 Zeabur 后，把下面的地址替换为你的实际 Zeabur 域名
// 例如：https://deepread-subtitle-api-xxxxx.zeabur.app/extract
const SUBTITLE_API = process.env.SUBTITLE_API_URL || 'https://your-zeabur-domain.zeabur.app/extract';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    console.log('\n' + '='.repeat(60));
    console.log('🔄 转发字幕请求到 Zeabur');
    console.log(`📹 YouTube URL: ${url}`);
    console.log(`🌐 Zeabur API: ${SUBTITLE_API}`);
    console.log('='.repeat(60));

    // 调用 Zeabur 字幕 API
    const response = await fetch(SUBTITLE_API, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(60000) // 60秒超时
    });

    console.log(`📊 Zeabur 响应状态: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Zeabur API 错误:', errorText);
      throw new Error(`Zeabur API failed with status ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      console.error('❌ Zeabur 返回错误:', data.error);
      throw new Error(data.error || 'Zeabur API returned error');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ 成功获取字幕！');
    console.log(`📝 段落数: ${data.transcript?.length || 0}`);
    console.log(`💬 字数: ${data.meta?.word_count || 0}`);
    console.log(`⏱️  时长: ${data.meta?.duration_formatted || 'N/A'}`);
    console.log('='.repeat(60) + '\n');

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('\n❌ API 错误:', error.message);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || '服务器错误，请稍后重试'
      },
      { status: 500 }
    );
  }
}
