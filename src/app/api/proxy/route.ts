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
    // 方法 1: 尝试 YouTube 官方 timedtext API（无需 API Key）
    console.log(`🔄 [方法1] timedtext API: videoId=${videoId}, lang=${lang || 'auto'}`);
    
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
      
      // 检查是否有内容
      if (data && data.trim().length > 0) {
        try {
          const json = JSON.parse(data);
          if (json.events && json.events.length > 0) {
            console.log(`✅ [方法1] 成功: ${json.events.length} events`);
            return new NextResponse(data, {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=3600', // 缓存 1 小时
              },
            });
          }
        } catch (e) {
          console.log(`⚠️  [方法1] JSON 解析失败`);
        }
      }
    }

    console.log(`❌ [方法1] 失败: HTTP ${response.status}`);

    // 方法 2: 尝试获取视频页面，提取 ytInitialPlayerResponse
    console.log(`🔄 [方法2] 解析视频页面`);
    
    const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const pageResponse = await fetch(videoPageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (pageResponse.ok) {
      const html = await pageResponse.text();
      
      // 提取 ytInitialPlayerResponse
      const match = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
      if (match) {
        try {
          const playerResponse = JSON.parse(match[1]);
          const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
          
          if (captions && captions.length > 0) {
            // 找到合适的字幕轨道
            let captionUrl = null;
            
            // 优先选择指定语言
            if (lang) {
              const track = captions.find((t: any) => 
                t.languageCode === lang || t.languageCode?.startsWith(lang)
              );
              captionUrl = track?.baseUrl;
            }
            
            // 如果没有指定语言，选择第一个
            if (!captionUrl && captions[0]) {
              captionUrl = captions[0].baseUrl;
            }

            if (captionUrl) {
              // 添加 fmt=json3 参数
              const finalUrl = captionUrl.includes('?') 
                ? `${captionUrl}&fmt=json3` 
                : `${captionUrl}?fmt=json3`;
              
              console.log(`📥 [方法2] 获取字幕: ${finalUrl}`);
              
              const captionResponse = await fetch(finalUrl);
              if (captionResponse.ok) {
                const captionData = await captionResponse.text();
                console.log(`✅ [方法2] 成功`);
                
                return new NextResponse(captionData, {
                  status: 200,
                  headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=3600',
                  },
                });
              }
            }
          }
        } catch (e) {
          console.log(`⚠️  [方法2] 解析失败: ${e}`);
        }
      }
    }

    console.log(`❌ [方法2] 失败`);

    // 所有方法都失败
    return NextResponse.json(
      { 
        error: '无法获取字幕',
        details: '视频可能没有字幕，或字幕已被禁用'
      },
      { status: 404 }
    );

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

