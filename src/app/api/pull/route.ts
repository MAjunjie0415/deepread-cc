import { NextRequest, NextResponse } from 'next/server';

function extractVideoId(url: string): string {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  throw new Error('Invalid YouTube URL');
}

function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// 基于 Kimi 的成功经验，实现分页拉取
async function fetchTranscriptWithPagination(videoId: string): Promise<any[]> {
  const allSegments: any[] = [];
  let lastEnd = 0;
  let page = 1;
  const maxPages = 10; // 限制最大页数

  console.log(`开始拉取视频 ${videoId} 的字幕...`);

  while (page <= maxPages) {
    try {
      // 使用 Kimi 成功的 API 格式
      const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3&start=${lastEnd}`;
      console.log(`拉取第 ${page} 页，start=${lastEnd}, url=${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.youtube.com/'
        }
      });

      console.log(`响应状态: ${response.status}`);

      if (!response.ok) {
        console.log(`HTTP 错误: ${response.status} ${response.statusText}`);
        if (response.status === 404) {
          break; // 没有更多数据
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`第 ${page} 页数据:`, JSON.stringify(data).substring(0, 200) + '...');
      
      // 检查是否有字幕数据
      if (!data.events || data.events.length === 0) {
        console.log(`第 ${page} 页无数据，拉取完成`);
        break;
      }

      // 提取字幕段落
      const segments = data.events
        .filter((event: any) => event.segs && event.segs.length > 0)
        .map((event: any) => {
          const text = event.segs
            .map((seg: any) => seg.utf8 || '')
            .join('')
            .trim();
          
          return {
            text,
            start: event.tStartMs / 1000,
            duration: event.dDurationMs / 1000
          };
        })
        .filter((seg: any) => seg.text.length > 0);

      if (segments.length === 0) {
        console.log(`第 ${page} 页无有效字幕，拉取完成`);
        break;
      }

      allSegments.push(...segments);
      console.log(`第 ${page} 页获取到 ${segments.length} 段字幕，累计 ${allSegments.length} 段`);

      // 更新 lastEnd 为当前页最后一段的结束时间
      const lastSegment = segments[segments.length - 1];
      lastEnd = lastSegment.start + lastSegment.duration + 0.01; // 加 0.01 秒避免重复
      
      page++;

      // 添加延迟避免请求过快
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error) {
      console.error(`第 ${page} 页拉取失败:`, error);
      break;
    }
  }

  console.log(`字幕拉取完成，共 ${allSegments.length} 段`);
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

    // Extract video ID
    let videoId: string;
    try {
      videoId = extractVideoId(url);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    console.log('Fetching transcript for video ID:', videoId);

    // 使用分页拉取
    let transcript;
    try {
      transcript = await fetchTranscriptWithPagination(videoId);
    } catch (error) {
      console.error('Transcript fetch error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('HTTP 404')) {
          return NextResponse.json(
            { success: false, error: '此视频没有字幕，请尝试其他视频' },
            { status: 404 }
          );
        } else if (error.message.includes('timeout')) {
          return NextResponse.json(
            { success: false, error: '网络超时，请检查网络连接后重试' },
            { status: 408 }
          );
        }
      }
      
      return NextResponse.json(
        { success: false, error: '获取字幕失败，请尝试其他视频或稍后重试' },
        { status: 500 }
      );
    }

    if (!transcript || transcript.length === 0) {
      return NextResponse.json(
        { success: false, error: '未找到字幕内容' },
        { status: 404 }
      );
    }

    // Format transcript with timestamps
    const formatted = transcript.map((item: any, idx: number) => ({
      segment_id: `seg_${String(idx).padStart(4, '0')}`,
      start: item.start,
      end: item.start + item.duration,
      timestamp: formatTimestamp(item.start),
      text: item.text
    }));

    // Calculate metadata
    const wordCount = transcript.reduce((acc: number, item: any) => 
      acc + item.text.split(/\s+/).length, 0
    );

    const duration = transcript.length > 0 
      ? transcript[transcript.length - 1].start + transcript[transcript.length - 1].duration
      : 0;

    console.log(`Successfully fetched transcript: ${formatted.length} segments, ${wordCount} words, ${formatTimestamp(duration)} duration`);

    return NextResponse.json({
      success: true,
      video_id: videoId,
      transcript: formatted,
      meta: {
        word_count: wordCount,
        segment_count: formatted.length,
        duration_seconds: duration,
        duration_formatted: formatTimestamp(duration),
        timestamps_present: true,
        source: 'youtube_api_direct'
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误，请稍后重试' },
      { status: 500 }
    );
  }
}