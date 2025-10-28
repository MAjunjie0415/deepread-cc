import { NextRequest, NextResponse } from 'next/server';

function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * 使用第三方 YouTube 字幕 API 服务
 * 这些服务已经处理了 YouTube 的访问限制
 */
async function fetchTranscriptViaProxy(videoId: string): Promise<any[]> {
  console.log(`📡 使用第三方 API 服务`);
  
  // 尝试多个第三方服务
  const services: Array<{ name: string; url: string; needsKey?: boolean }> = [
    {
      name: 'yt-transcript-api',
      url: `https://yt-transcript-api.vercel.app/api/transcript?videoId=${videoId}`,
    }
  ];

  for (const service of services) {
    try {
      console.log(`🔄 尝试: ${service.name}`);

      const response = await fetch(service.url, {
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        console.log(`❌ ${service.name} 失败: HTTP ${response.status}`);
        continue;
      }

      const data = await response.json();
      
      // 处理不同服务的响应格式
      let transcript = [];
      if (Array.isArray(data)) {
        transcript = data;
      } else if (data.transcript && Array.isArray(data.transcript)) {
        transcript = data.transcript;
      } else if (data.data && Array.isArray(data.data)) {
        transcript = data.data;
      }

      if (transcript.length > 0) {
        console.log(`✅ ${service.name} 成功: ${transcript.length} 段`);
        return transcript.map((item: any) => ({
          text: item.text || item.snippet || '',
          offset: (item.offset || item.start || 0) * 1000,
          duration: (item.duration || 0) * 1000
        }));
      }

    } catch (error: any) {
      console.error(`❌ ${service.name} 错误:`, error.message);
    }
  }

  throw new Error('所有第三方服务都失败了');
}

/**
 * 备用方案：使用自建的简单代理
 * 通过 CORS 代理访问 YouTube 的 timedtext API
 */
async function fetchTranscriptViaCorsProxy(videoId: string): Promise<any[]> {
  console.log(`🌐 使用 CORS 代理`);
  
  const allSegments: any[] = [];
  let startTime = 0;
  let pageCount = 0;
  const MAX_PAGES = 30;

  const corsProxies = [
    'https://corsproxy.io/?',
    'https://api.allorigins.win/raw?url=',
  ];

  for (const proxyBase of corsProxies) {
    try {
      console.log(`🔄 尝试代理: ${proxyBase.replace('?', '').replace('url=', '')}`);
      
      while (pageCount < MAX_PAGES) {
        const youtubeUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&fmt=json3&t=${startTime}`;
        const proxiedUrl = `${proxyBase}${encodeURIComponent(youtubeUrl)}`;

        const response = await fetch(proxiedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
          console.log(`❌ HTTP ${response.status}`);
          break;
        }

        const data = await response.json();

        if (!data.events || data.events.length === 0) {
          console.log(`✓ 第 ${pageCount + 1} 页无数据，结束`);
          break;
        }

        const segments = data.events
          .filter((event: any) => event.segs && event.segs.length > 0)
          .map((event: any) => ({
            text: event.segs.map((seg: any) => seg.utf8 || '').join('').trim(),
            offset: event.tStartMs || 0,
            duration: event.dDurationMs || 0
          }))
          .filter((seg: any) => seg.text.length > 0);

        if (segments.length === 0) {
          break;
        }

        allSegments.push(...segments);
        console.log(`✓ 第 ${pageCount + 1} 页: +${segments.length} 段 (累计 ${allSegments.length})`);

        const lastSegment = segments[segments.length - 1];
        startTime = (lastSegment.offset + lastSegment.duration) / 1000 + 0.01;
        pageCount++;
      }

      if (allSegments.length > 0) {
        console.log(`✅ CORS 代理成功: ${allSegments.length} 段`);
        return allSegments;
      }

    } catch (error: any) {
      console.error(`❌ 代理失败:`, error.message);
    }
  }

  throw new Error('CORS 代理也失败了');
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        { success: false, error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎯 开始拉取字幕`);
    console.log(`🔗 视频 ID: ${videoId}`);
    console.log(`${'='.repeat(60)}`);

    let transcript: any[] = [];
    let source = '';

    // 策略1: 尝试第三方 API 服务
    try {
      transcript = await fetchTranscriptViaProxy(videoId);
      source = 'third_party_api';
    } catch (error1: any) {
      console.log(`⚠️  第三方服务失败: ${error1.message}`);
      
      // 策略2: 使用 CORS 代理
      try {
        transcript = await fetchTranscriptViaCorsProxy(videoId);
        source = 'cors_proxy';
      } catch (error2: any) {
        console.error(`❌ 所有方法都失败了`);
        throw new Error('无法获取字幕。可能原因：1) 视频没有字幕 2) 网络限制 3) 服务不可用');
      }
    }

    if (!transcript || transcript.length === 0) {
      throw new Error('字幕为空');
    }

    // 格式化为统一格式
    const formattedTranscript = transcript.map((segment, index) => ({
      segment_id: `seg_${String(index).padStart(4, '0')}`,
      start: segment.offset / 1000,
      end: (segment.offset + segment.duration) / 1000,
      timestamp: formatTimestamp(segment.offset / 1000),
      text: segment.text
    }));

    const wordCount = formattedTranscript.reduce((count, segment) => 
      count + segment.text.split(/\s+/).filter(Boolean).length, 0
    );

    const totalDuration = formattedTranscript.length > 0
      ? formattedTranscript[formattedTranscript.length - 1].end
      : 0;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ 成功！`);
    console.log(`📊 来源: ${source}`);
    console.log(`📝 段落: ${formattedTranscript.length}`);
    console.log(`💬 单词: ${wordCount}`);
    console.log(`⏱️  时长: ${formatTimestamp(totalDuration)}`);
    console.log(`${'='.repeat(60)}\n`);

    return NextResponse.json({
      success: true,
      video_id: videoId,
      transcript: formattedTranscript,
      meta: {
        word_count: wordCount,
        segment_count: formattedTranscript.length,
        duration_seconds: totalDuration,
        duration_formatted: formatTimestamp(totalDuration),
        timestamps_present: true,
        source: source
      }
    });

  } catch (error: any) {
    console.error('\n❌ API 错误:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || '服务器错误，请稍后重试'
      },
      { status: 500 }
    );
  }
}
