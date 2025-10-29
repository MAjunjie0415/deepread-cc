import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const videoId = searchParams.get('v');
  const lang = searchParams.get('lang') || '';

  if (!videoId) {
    return NextResponse.json({ error: 'Missing video ID' }, { status: 400 });
  }

  try {
    // 直接从 Vercel Edge Function 请求 YouTube API
    // Edge Function 不受浏览器 CORS 限制
    const youtubeUrl = lang
      ? `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`
      : `https://www.youtube.com/api/timedtext?v=${videoId}&fmt=json3`;

    console.log(`🔄 代理请求: ${youtubeUrl}`);

    const response = await fetch(youtubeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
      },
    });

    if (!response.ok) {
      console.log(`❌ YouTube API 返回: ${response.status}`);
      return NextResponse.json(
        { error: `YouTube API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.text();

    // 返回原始数据，设置 CORS 头
    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error: any) {
    console.error('❌ 代理错误:', error);
    return NextResponse.json(
      { error: error.message || 'Proxy error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

