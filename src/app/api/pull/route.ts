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
 * 使用 Kimi 的成功方案：直接调用 YouTube timedtext API
 * 核心 URL: https://www.youtube.com/api/timedtext?v={id}&lang=en&fmt=json3
 * 无需代理，无需密钥，公开接口
 */
async function fetchYoutubeTranscript(videoId: string): Promise<any[]> {
  const allSegments: any[] = [];
  let startTime = 0;
  let hasMore = true;
  let pageCount = 0;
  const MAX_PAGES = 20; // 防止无限循环

  console.log(`📺 开始拉取视频字幕: ${videoId}`);

  while (hasMore && pageCount < MAX_PAGES) {
    try {
      // Kimi 的成功方案：直接调用 timedtext API
      const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3&t=${startTime}`;
      console.log(`📄 第 ${pageCount + 1} 页，起始时间: ${startTime}s`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(10000) // 10秒超时
      });

      if (!response.ok) {
        console.error(`❌ HTTP ${response.status}: ${response.statusText}`);
        break;
      }

      const data = await response.json();

      // 检查是否有字幕数据
      if (!data.events || !Array.isArray(data.events) || data.events.length === 0) {
        console.log(`✓ 第 ${pageCount + 1} 页无数据，分页结束`);
        hasMore = false;
        break;
      }

      // 提取字幕段落
      const segments = data.events
        .filter((event: any) => event.segs && event.segs.length > 0)
        .map((event: any) => ({
          text: event.segs.map((seg: any) => seg.utf8 || '').join('').trim(),
          offset: event.tStartMs || 0,
          duration: event.dDurationMs || 0
        }))
        .filter((seg: any) => seg.text.length > 0);

      if (segments.length === 0) {
        console.log(`✓ 第 ${pageCount + 1} 页无有效段落，分页结束`);
        hasMore = false;
        break;
      }

      allSegments.push(...segments);
      console.log(`✓ 第 ${pageCount + 1} 页: ${segments.length} 段，累计 ${allSegments.length} 段`);

      // 计算下一页的起始时间（Kimi 的分页逻辑）
      const lastSegment = segments[segments.length - 1];
      startTime = (lastSegment.offset + lastSegment.duration) / 1000 + 0.01;
      pageCount++;

    } catch (error: any) {
      console.error(`❌ 第 ${pageCount + 1} 页失败:`, error.message);
      break;
    }
  }

  if (allSegments.length === 0) {
    throw new Error('未找到字幕数据，视频可能没有启用字幕');
  }

  console.log(`✅ 拉取完成: ${allSegments.length} 段字幕，${pageCount} 页`);
  return allSegments;
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
    console.log(`🎬 视频 ID: ${videoId}`);
    console.log(`${'='.repeat(60)}\n`);

    // 使用 Kimi 的成功方案
    const transcript = await fetchYoutubeTranscript(videoId);

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
    console.log(`✅ 成功`);
    console.log(`📊 段落数: ${formattedTranscript.length}`);
    console.log(`📝 单词数: ${wordCount}`);
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
        source: 'youtube_timedtext_api'
      }
    });

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
