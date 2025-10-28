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
 * 方法1: 使用 Kimi 的成功方案 - 直接调用 YouTube timedtext API
 * 这是最直接、最可靠的方式
 * 关键：不指定语言，让 YouTube 自动返回视频的原始字幕
 */
async function fetchWithTimedTextAPI(videoId: string, lang?: string): Promise<any[]> {
  const allSegments: any[] = [];
  let startTime = 0;
  let pageCount = 0;
  const MAX_PAGES = 20;

  console.log(`\n🎬 方法1: YouTube timedtext API`);
  console.log(`📺 视频 ID: ${videoId}`);
  console.log(`🌐 语言: ${lang || '自动检测'}`);

  while (pageCount < MAX_PAGES) {
    try {
      // 关键改动：如果没有指定语言，就不加 lang 参数，让 YouTube 返回默认字幕
      const langParam = lang ? `&lang=${lang}` : '';
      const url = `https://www.youtube.com/api/timedtext?v=${videoId}${langParam}&fmt=json3&t=${startTime}`;
      console.log(`📄 第 ${pageCount + 1} 页，起始: ${startTime}s`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.youtube.com/',
        },
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        console.log(`❌ HTTP ${response.status}`);
        break;
      }

      const data = await response.json();

      if (!data.events || !Array.isArray(data.events) || data.events.length === 0) {
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
        console.log(`✓ 第 ${pageCount + 1} 页无有效段落，结束`);
        break;
      }

      allSegments.push(...segments);
      console.log(`✓ 第 ${pageCount + 1} 页: +${segments.length} 段 (累计 ${allSegments.length})`);

      const lastSegment = segments[segments.length - 1];
      startTime = (lastSegment.offset + lastSegment.duration) / 1000 + 0.01;
      pageCount++;

    } catch (error: any) {
      console.error(`❌ 第 ${pageCount + 1} 页失败:`, error.message);
      break;
    }
  }

  if (allSegments.length > 0) {
    console.log(`✅ timedtext API 成功: ${allSegments.length} 段`);
  }

  return allSegments;
}

/**
 * 方法2: 使用 youtube-transcript 库（备用方案）
 * 如果直接 API 失败，使用这个库作为后备
 */
async function fetchWithLibrary(videoId: string): Promise<any[]> {
  console.log(`\n📚 方法2: youtube-transcript 库`);
  
  try {
    const { YoutubeTranscript } = await import('youtube-transcript');
    
    // 不指定语言，让库自动选择
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    
    if (transcript && transcript.length > 0) {
      console.log(`✅ 库方法成功: ${transcript.length} 段`);
      return transcript;
    }
    
    return [];
  } catch (error: any) {
    console.error(`❌ 库方法失败:`, error.message);
    return [];
  }
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
    let method = '';

    // 策略1: 不指定语言，让 YouTube 自动返回原始字幕（最可靠）
    console.log('\n🔄 策略1: 自动检测语言');
    transcript = await fetchWithTimedTextAPI(videoId);
    if (transcript.length > 0) {
      method = 'youtube_timedtext_api_auto';
    } else {
      // 策略2: 明确指定英文
      console.log('\n🔄 策略2: 明确指定英文');
      transcript = await fetchWithTimedTextAPI(videoId, 'en');
      if (transcript.length > 0) {
        method = 'youtube_timedtext_api_en';
      } else {
        // 策略3: 使用 youtube-transcript 库（最后的备用）
        console.log('\n🔄 策略3: youtube-transcript 库');
        transcript = await fetchWithLibrary(videoId);
        if (transcript.length > 0) {
          method = 'youtube_transcript_library';
        }
      }
    }

    if (transcript.length === 0) {
      console.error(`\n❌ 所有方法都失败了`);
      return NextResponse.json(
        { 
          success: false, 
          error: '无法获取字幕。可能原因：1) 视频没有字幕 2) 网络限制 3) 视频不可用'
        },
        { status: 500 }
      );
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
    console.log(`📊 方法: ${method}`);
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
        source: method
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
