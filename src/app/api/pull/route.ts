import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';

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

    console.log(`Fetching transcript for video ID: ${videoId}`);

    // 使用 youtube-transcript 库，它会自动处理分页
    let transcript;
    try {
      transcript = await YoutubeTranscript.fetchTranscript(videoId, {
        lang: lang
      });
      console.log(`Successfully fetched ${transcript.length} segments`);
    } catch (error: any) {
      console.error('Transcript fetch error:', error);
      
      // 如果指定语言失败，尝试英文
      if (lang !== 'en') {
        console.log('Retrying with English...');
        try {
          transcript = await YoutubeTranscript.fetchTranscript(videoId, {
            lang: 'en'
          });
          console.log(`Successfully fetched ${transcript.length} segments in English`);
        } catch (retryError) {
          throw new Error('Failed to fetch transcript in any language');
        }
      } else {
        throw error;
      }
    }

    if (!transcript || transcript.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No transcript found or available for this video.' },
        { status: 404 }
      );
    }

    // 格式化为带时间戳的文本
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

    console.log(`Total: ${formattedTranscript.length} segments, ${wordCount} words, ${formatTimestamp(totalDuration)} duration`);

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
        source: 'youtube_transcript'
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