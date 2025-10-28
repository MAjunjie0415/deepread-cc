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
 * 新方案：从 YouTube 视频页面 HTML 中提取字幕信息
 * 参考 tldw.us 的实现方式
 */
async function fetchTranscriptFromVideoPage(videoId: string): Promise<any[]> {
  console.log(`\n🎬 从视频页面提取字幕`);
  console.log(`📺 视频 ID: ${videoId}`);

  try {
    // 1. 获取视频页面
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    console.log(`📄 正在访问: ${videoUrl}`);
    
    const response = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    console.log(`✓ 页面大小: ${(html.length / 1024).toFixed(2)} KB`);

    // 2. 从 HTML 中提取 ytInitialPlayerResponse
    const playerResponseMatch = html.match(/var ytInitialPlayerResponse = ({.+?});/);
    if (!playerResponseMatch) {
      console.log('❌ 未找到 ytInitialPlayerResponse');
      throw new Error('无法从页面中提取播放器数据');
    }

    const playerResponse = JSON.parse(playerResponseMatch[1]);
    console.log('✓ 成功解析 playerResponse');

    // 3. 提取字幕轨道
    const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer;
    if (!captions || !captions.captionTracks) {
      console.log('❌ 视频没有字幕');
      throw new Error('视频没有可用的字幕');
    }

    const captionTracks = captions.captionTracks;
    console.log(`✓ 找到 ${captionTracks.length} 个字幕轨道`);
    captionTracks.forEach((track: any) => {
      console.log(`  - ${track.name?.simpleText || track.languageCode}: ${track.languageCode}`);
    });

    // 4. 选择第一个可用的字幕轨道（通常是原始语言）
    const captionTrack = captionTracks[0];
    const captionUrl = captionTrack.baseUrl;
    console.log(`✓ 使用字幕: ${captionTrack.name?.simpleText || captionTrack.languageCode}`);

    // 5. 获取字幕内容（JSON3 格式，支持分页）
    const allSegments: any[] = [];
    let startTime = 0;
    let pageCount = 0;
    const MAX_PAGES = 30;

    while (pageCount < MAX_PAGES) {
      const url = `${captionUrl}&fmt=json3&t=${startTime}`;
      console.log(`📄 第 ${pageCount + 1} 页，起始: ${startTime}s`);

      const captionResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000)
      });

      if (!captionResponse.ok) {
        console.log(`❌ HTTP ${captionResponse.status}`);
        break;
      }

      const responseText = await captionResponse.text();
      if (!responseText || responseText.trim().length === 0) {
        console.log(`✓ 第 ${pageCount + 1} 页无数据，结束`);
        break;
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.log(`❌ JSON 解析失败`);
        break;
      }

      if (!data.events || !Array.isArray(data.events) || data.events.length === 0) {
        console.log(`✓ 第 ${pageCount + 1} 页无事件，结束`);
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
    }

    console.log(`✅ 成功！共 ${allSegments.length} 段字幕`);
    return allSegments;

  } catch (error: any) {
    console.error(`❌ 错误:`, error.message);
    throw error;
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

    // 使用新方案：从视频页面提取字幕
    const transcript = await fetchTranscriptFromVideoPage(videoId);

    if (transcript.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: '无法获取字幕。视频可能没有字幕或字幕已禁用。'
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
        source: 'youtube_video_page_extraction'
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
