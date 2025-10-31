import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// 使用 Supadata.ai API 获取字幕
async function fetchFromSupadata(videoUrl: string) {
  const apiKey = process.env.SUPADATA_API_KEY;
  
  if (!apiKey) {
    console.log('⚠️  未配置 SUPADATA_API_KEY，尝试使用备用方案');
    return null;
  }

  try {
    console.log('🚀 使用 Supadata.ai API 获取字幕');
    console.log('📹 视频 URL:', videoUrl);
    
    const response = await fetch(`https://api.supadata.ai/v1/transcript?url=${encodeURIComponent(videoUrl)}`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(30000), // 30秒超时
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Supadata API 错误 (${response.status}):`, errorText);
      return null;
    }

    const data = await response.json();
    console.log('✅ Supadata API 成功获取字幕');
    
    return data;
  } catch (error: any) {
    console.error('❌ Supadata API 调用失败:', error.message);
    return null;
  }
}

// 备用方案：直接请求 YouTube timedtext API
async function fetchFromYouTubeDirect(videoId: string, lang: string = '') {
  console.log(`🔄 [备用方案] YouTube timedtext API`);
  
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
    signal: AbortSignal.timeout(15000),
  });

  if (response.ok) {
    const data = await response.text();
    
    if (data && data.trim().length > 0) {
      try {
        const json = JSON.parse(data);
        if (json.events && json.events.length > 0) {
          console.log(`✅ [备用方案] 成功`);
          return json;
        }
      } catch (e) {
        console.log(`⚠️  JSON 解析失败`);
      }
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
    // 构建 YouTube URL
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    // 方法 1: 使用 Supadata.ai API（推荐）
    const supadataResult = await fetchFromSupadata(videoUrl);
    
    if (supadataResult) {
      // Supadata 返回格式: { content: [...], lang: "en", availableLangs: [...] }
      // 转换为我们应用使用的格式
      let formattedData;
      
      if (supadataResult.content && Array.isArray(supadataResult.content)) {
        // Supadata 返回的是数组格式，每个元素包含 text, offset, duration
        formattedData = {
          events: supadataResult.content.map((item: any) => ({
            tStartMs: item.offset || 0,  // offset 已经是毫秒
            dDurationMs: item.duration || 0,  // duration 已经是毫秒
            segs: [{ utf8: item.text || '' }]
          })),
          lang: supadataResult.lang,
          source: 'supadata'
        };
      } else if (typeof supadataResult.content === 'string') {
        // 如果是纯文本内容（旧格式或其他情况）
        // 按句子分割并创建虚拟时间戳
        const sentences = supadataResult.content.split(/[.!?]+/).filter((s: string) => s.trim());
        formattedData = {
          events: sentences.map((text: string, index: number) => ({
            tStartMs: index * 3000, // 每句3秒
            dDurationMs: 3000,
            segs: [{ utf8: text.trim() }]
          })),
          lang: supadataResult.lang,
          source: 'supadata'
        };
      }

      if (formattedData && formattedData.events && formattedData.events.length > 0) {
        console.log(`✅ 成功转换 ${formattedData.events.length} 段字幕`);
        return NextResponse.json(formattedData, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }
    }

    // 方法 2: 备用方案 - 直接请求 YouTube timedtext API
    const directResult = await fetchFromYouTubeDirect(videoId, lang);
    
    if (directResult) {
      return NextResponse.json(directResult, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // 所有方法都失败
    return NextResponse.json(
      { 
        error: '无法获取字幕',
        details: '该视频可能没有字幕。请确认：\n1) 视频是否有字幕\n2) SUPADATA_API_KEY 是否正确配置\n3) 视频是否为公开视频',
        suggestion: 'manual_upload'
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

