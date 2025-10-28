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

interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

async function fetchTranscriptWithPagination(videoId: string, lang: string = 'en'): Promise<TranscriptSegment[]> {
  const allSegments: TranscriptSegment[] = [];
  let startTime = 0;
  let hasMore = true;
  let retryCount = 0;
  const MAX_RETRIES = 3;

  // 首先尝试简单的单次请求
  try {
    console.log(`Trying simple fetch for video ${videoId}...`);
    const simpleUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`;
    const simpleResponse = await fetch(simpleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (simpleResponse.ok) {
      const simpleData = await simpleResponse.json();
      console.log('Simple fetch response:', JSON.stringify(simpleData, null, 2));
      
      if (simpleData.events && Array.isArray(simpleData.events)) {
        const segments = simpleData.events
          .filter((event: any) => event.segs && event.segs.length > 0)
          .map((event: any) => {
            const text = event.segs.map((seg: any) => seg.utf8 || '').join('').trim();
            return {
              text,
              start: event.tStartMs / 1000,
              duration: event.dDurationMs / 1000
            };
          })
          .filter((segment: TranscriptSegment) => segment.text.length > 0);
        
        if (segments.length > 0) {
          console.log(`Simple fetch successful: ${segments.length} segments`);
          return segments;
        }
      }
    }
  } catch (error) {
    console.log('Simple fetch failed, trying pagination:', error);
  }

  while (hasMore && retryCount < MAX_RETRIES) {
    try {
      // 使用 YouTube 的 timedtext API，参考 Kimi 的成功方案
      const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3&t=${startTime}`;
      
      console.log(`Fetching transcript chunk starting at ${startTime}s...`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.events || data.events.length === 0) {
        console.log('No more segments found, pagination complete');
        hasMore = false;
        break;
      }

      // 处理返回的字幕数据
      let segments: TranscriptSegment[] = [];
      
      if (data.events && Array.isArray(data.events)) {
        segments = data.events
          .filter((event: any) => event.segs && event.segs.length > 0)
          .map((event: any) => {
            const text = event.segs.map((seg: any) => seg.utf8 || '').join('').trim();
            return {
              text,
              start: event.tStartMs / 1000,
              duration: event.dDurationMs / 1000
            };
          })
          .filter((segment: TranscriptSegment) => segment.text.length > 0);
      } else if (data.captions && data.captions.playerCaptionsTracklistRenderer) {
        // 处理另一种可能的响应格式
        const captionTracks = data.captions.playerCaptionsTracklistRenderer.captionTracks;
        if (captionTracks && captionTracks.length > 0) {
          // 这里需要进一步处理，暂时跳过
          console.log('Found caption tracks but need additional processing');
        }
      } else {
        console.log('Unexpected response format:', JSON.stringify(data, null, 2));
      }

      if (segments.length === 0) {
        console.log('No valid segments in this chunk, stopping pagination');
        hasMore = false;
        break;
      }

      allSegments.push(...segments);
      
      // 更新 startTime 为最后一个片段的结束时间
      const lastSegment = segments[segments.length - 1];
      startTime = lastSegment.start + lastSegment.duration + 0.01; // 加 0.01 秒避免重复
      
      console.log(`Fetched ${segments.length} segments, total: ${allSegments.length}, next start: ${startTime}s`);
      
      // 如果获取的片段很少，可能已经到末尾了
      if (segments.length < 10) {
        hasMore = false;
      }
      
      // 添加延迟避免请求过于频繁
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`Error fetching transcript chunk at ${startTime}s:`, error);
      retryCount++;
      
      if (retryCount < MAX_RETRIES) {
        console.log(`Retrying... (${retryCount}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      } else {
        console.error('Max retries reached, stopping pagination');
        hasMore = false;
      }
    }
  }

  console.log(`Pagination complete. Total segments: ${allSegments.length}`);
  return allSegments;
}

export async function POST(req: NextRequest) {
  try {
    const { url, lang = 'en' } = await req.json();

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

    console.log(`Fetching transcript for video ID: ${videoId} with pagination`);

    // 使用分页方式获取完整字幕
    const transcript = await fetchTranscriptWithPagination(videoId, lang);

    if (!transcript || transcript.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No transcript found or available for this video.' },
        { status: 404 }
      );
    }

    // 格式化为带时间戳的文本
    const formattedTranscript = transcript.map((segment, index) => ({
      segment_id: `seg_${String(index).padStart(4, '0')}`,
      start: segment.start,
      end: segment.start + segment.duration,
      timestamp: formatTimestamp(segment.start),
      text: segment.text
    }));

    const wordCount = formattedTranscript.reduce((count, segment) => 
      count + segment.text.split(/\s+/).filter(Boolean).length, 0
    );

    const totalDuration = formattedTranscript.length > 0
      ? formattedTranscript[formattedTranscript.length - 1].end
      : 0;

    console.log(`Successfully fetched ${formattedTranscript.length} segments, ${wordCount} words, ${formatTimestamp(totalDuration)} duration`);

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
        source: 'youtube_timedtext_api_with_pagination'
      }
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '服务器错误，请稍后重试' },
      { status: 500 }
    );
  }
}