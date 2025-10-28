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

    let transcript: { text: string; offset: number; duration: number }[] = [];
    let retries = 0;
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 2000; // 2 seconds

    while (retries < MAX_RETRIES) {
      try {
        // The youtube-transcript library handles language selection and fetching
        // It attempts to find the best available transcript for the given language(s)
        transcript = await YoutubeTranscript.fetchTranscript(videoId, {
          lang: lang.split(',').map((l: string) => l.trim())
        });
        break; // Success, exit loop
      } catch (error: any) {
        console.error(`Attempt ${retries + 1} failed to fetch transcript for video ${videoId}:`, error.message);
        retries++;
        if (retries < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        } else {
          // If all retries fail, check for specific errors
          if (error.message.includes('No captions found')) {
            throw new Error('No captions found for this video in the requested languages.');
          } else if (error.message.includes('Failed to retrieve captions')) {
            throw new Error('Failed to retrieve captions. The video might be unavailable or restricted.');
          } else {
            throw new Error(`Failed to fetch transcript after ${MAX_RETRIES} attempts: ${error.message}`);
          }
        }
      }
    }

    if (!transcript || transcript.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No transcript found or available for this video.' },
        { status: 404 }
      );
    }

    // Format the transcript segments
    const formattedTranscript = transcript.map((segment, index) => ({
      segment_id: `seg_${String(index).padStart(4, '0')}`,
      start: segment.offset / 1000,
      end: (segment.offset + segment.duration) / 1000,
      timestamp: formatTimestamp(segment.offset / 1000),
      text: segment.text,
    }));

    const totalDurationSeconds = formattedTranscript.length > 0
      ? formattedTranscript[formattedTranscript.length - 1].end
      : 0;
    const wordCount = formattedTranscript.reduce((acc, segment) => acc + segment.text.split(/\s+/).filter(Boolean).length, 0);

    return NextResponse.json({
      success: true,
      video_id: videoId,
      transcript: formattedTranscript,
      meta: {
        word_count: wordCount,
        segment_count: formattedTranscript.length,
        duration_seconds: totalDurationSeconds,
        duration_formatted: formatTimestamp(totalDurationSeconds),
        timestamps_present: true,
        source: 'youtube_transcript_api'
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