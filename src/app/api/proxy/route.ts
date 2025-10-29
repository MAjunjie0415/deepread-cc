import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// 使用公开的第三方字幕提取 API
async function fetchFromThirdPartyAPI(videoId: string, lang: string = '') {
  const apis = [
    // API 1: yt-transcript-api (公开服务)
    `https://yt-transcript-api.herokuapp.com/transcript?videoId=${videoId}${lang ? `&lang=${lang}` : ''}`,
    // API 2: invidious (开源 YouTube 前端)
    `https://invidious.io.lol/api/v1/captions/${videoId}?lang=${lang || 'en'}`,
  ];

  for (const apiUrl of apis) {
    try {
      console.log(`🔄 尝试第三方 API: ${apiUrl}`);
      const response = await fetch(apiUrl, {
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ 第三方 API 成功`);
        return data;
      }
    } catch (e) {
      console.log(`❌ 第三方 API 失败: ${e}`);
      continue;
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const videoId = searchParams.get('v');
  const lang = searchParams.get('lang') || '';

  if (!videoId) {
    return NextResponse.json({ error: 'Missing video ID' }, { status: 400 });
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎯 获取字幕: videoId=${videoId}, lang=${lang || 'auto'}`);
  console.log('='.repeat(60));

  try {
    // 方法 1: 尝试第三方 API
    const thirdPartyData = await fetchFromThirdPartyAPI(videoId, lang);
    if (thirdPartyData) {
      // 转换为我们的格式
      let formattedData;
      if (Array.isArray(thirdPartyData)) {
        // yt-transcript-api 格式
        formattedData = {
          events: thirdPartyData.map((item: any, index: number) => ({
            tStartMs: (item.start || item.offset || 0) * 1000,
            dDurationMs: (item.duration || 0) * 1000,
            segs: [{ utf8: item.text }]
          }))
        };
      } else {
        formattedData = thirdPartyData;
      }

      return NextResponse.json(formattedData, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // 方法 2: 直接请求 YouTube timedtext API
    console.log(`🔄 [方法2] timedtext API`);
    const youtubeUrl = lang
      ? `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`
      : `https://www.youtube.com/api/timedtext?v=${videoId}&fmt=json3`;

    const response = await fetch(youtubeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
        'Referer': 'https://www.youtube.com/',
        'Origin': 'https://www.youtube.com',
      },
    });

    if (response.ok) {
      const data = await response.text();
      
      if (data && data.trim().length > 0) {
        try {
          const json = JSON.parse(data);
          if (json.events && json.events.length > 0) {
            console.log(`✅ [方法2] 成功`);
            return new NextResponse(data, {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=3600',
              },
            });
          }
        } catch (e) {
          console.log(`⚠️  JSON 解析失败`);
        }
      }
    }

    console.log(`❌ [方法2] 失败: HTTP ${response.status}`);

    // 方法 3: 提示用户使用 Whisper
    return NextResponse.json(
      { 
        error: '无法获取字幕',
        details: '该视频可能没有字幕。建议：1) 确认视频有字幕 2) 或考虑使用 Whisper API 进行语音转录',
        suggestion: 'whisper'
      },
      { status: 404 }
    );

  } catch (error: any) {
    console.error('❌ 错误:', error);
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

