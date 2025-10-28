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

async function fetchTranscriptDirect(videoId: string, lang: string = 'en'): Promise<any[]> {
  const allSegments: any[] = [];
  let continuationToken = '';
  let pageCount = 0;
  const MAX_PAGES = 50; // 防止无限循环

  while (pageCount < MAX_PAGES) {
    try {
      // 构建 URL
      let url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`;
      if (continuationToken) {
        url += `&continuation=${continuationToken}`;
      }

      console.log(`Fetching page ${pageCount + 1}, continuation: ${continuationToken ? 'yes' : 'no'}`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': `https://www.youtube.com/watch?v=${videoId}`
        }
      });

      if (!response.ok) {
        console.error(`HTTP ${response.status}: ${response.statusText}`);
        break;
      }

      const data = await response.json();
      
      if (!data.events || data.events.length === 0) {
        console.log('No more events, stopping');
        break;
      }

      // 提取字幕段
      const segments = data.events
        .filter((event: any) => event.segs && event.segs.length > 0)
        .map((event: any) => ({
          text: event.segs.map((seg: any) => seg.utf8 || '').join('').trim(),
          offset: event.tStartMs || 0,
          duration: event.dDurationMs || 0
        }))
        .filter((seg: any) => seg.text.length > 0);

      allSegments.push(...segments);
      console.log(`Page ${pageCount + 1}: ${segments.length} segments, total: ${allSegments.length}`);

      // 检查是否有下一页
      if (data.continuation) {
        continuationToken = data.continuation;
        pageCount++;
        // 添加延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 200));
      } else {
        console.log('No continuation token, stopping');
        break;
      }

    } catch (error) {
      console.error(`Error fetching page ${pageCount + 1}:`, error);
      break;
    }
  }

  return allSegments;
}

async function fetchTranscriptWithYoutubeTranscript(videoId: string, lang: string): Promise<any[]> {
  try {
    const { YoutubeTranscript } = await import('youtube-transcript');
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang });
    console.log(`youtube-transcript library: ${transcript.length} segments`);
    return transcript;
  } catch (error) {
    console.error('youtube-transcript library failed:', error);
    throw error;
  }
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

    console.log(`Fetching transcript for video ID: ${videoId}, lang: ${lang}`);

    let transcript: any[] = [];
    let method = '';

    // 方法1：直接调用 YouTube API
    try {
      console.log('Trying direct YouTube API...');
      transcript = await fetchTranscriptDirect(videoId, lang);
      if (transcript.length > 0) {
        method = 'direct_youtube_api';
        console.log(`Success with direct API: ${transcript.length} segments`);
      }
    } catch (error) {
      console.error('Direct API failed:', error);
    }

    // 方法2：使用 youtube-transcript 库
    if (transcript.length === 0) {
      try {
        console.log('Trying youtube-transcript library...');
        transcript = await fetchTranscriptWithYoutubeTranscript(videoId, lang);
        method = 'youtube_transcript_library';
      } catch (error) {
        console.error('youtube-transcript library failed:', error);
        
        // 如果不是英文，尝试英文
        if (lang !== 'en') {
          try {
            console.log('Retrying with English...');
            transcript = await fetchTranscriptWithYoutubeTranscript(videoId, 'en');
            method = 'youtube_transcript_library_en';
          } catch (retryError) {
            console.error('English retry also failed:', retryError);
          }
        }
      }
    }

    if (!transcript || transcript.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch transcript. The video may not have captions, or captions are disabled.' 
        },
        { status: 404 }
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

    console.log(`Success! Method: ${method}, Segments: ${formattedTranscript.length}, Words: ${wordCount}, Duration: ${formatTimestamp(totalDuration)}`);

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
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '服务器错误，请稍后重试' },
      { status: 500 }
    );
  }
}