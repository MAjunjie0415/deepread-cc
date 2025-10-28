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
    const { url, lang = 'en,zh-Hans,zh-Hant' } = await req.json();

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

    // 尝试获取字幕，支持多语言
    const languages = lang.split(',').map((l: string) => l.trim());
    let transcript = null;
    let lastError = null;

    for (const language of languages) {
      try {
        transcript = await YoutubeTranscript.fetchTranscript(videoId, {
          lang: language
        });
        console.log(`Successfully fetched transcript in ${language}`);
        break;
      } catch (error) {
        console.log(`Failed to fetch transcript in ${language}:`, error);
        lastError = error;
        continue;
      }
    }

    if (!transcript) {
      console.error('Transcript fetch error:', lastError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch transcript. Video may not have captions.' 
        },
        { status: 404 }
      );
    }

    // 格式化为带时间戳的文本
    const formattedTranscript = transcript.map((item, idx) => ({
      segment_id: `seg_${String(idx).padStart(4, '0')}`,
      start: item.offset / 1000,
      end: (item.offset + item.duration) / 1000,
      timestamp: formatTimestamp(item.offset / 1000),
      text: item.text
    }));

    const wordCount = formattedTranscript.reduce((count, segment) => 
      count + segment.text.split(' ').length, 0
    );

    return NextResponse.json({
      success: true,
      video_id: videoId,
      transcript: formattedTranscript,
      meta: {
        word_count: wordCount,
        segment_count: formattedTranscript.length,
        duration_seconds: formattedTranscript[formattedTranscript.length - 1]?.end || 0,
        duration_formatted: formatTimestamp(formattedTranscript[formattedTranscript.length - 1]?.end || 0),
        timestamps_present: true,
        source: 'youtube_transcript'
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