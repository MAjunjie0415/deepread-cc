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

    // 直接使用 youtube-transcript 库（最简单可靠）
    console.log('📚 使用 youtube-transcript 库');
    
    let transcript;
    try {
      transcript = await YoutubeTranscript.fetchTranscript(videoId);
      console.log(`✅ 成功获取 ${transcript.length} 段字幕`);
    } catch (error: any) {
      console.error('❌ 获取失败:', error.message);
      
      // 如果是 "Transcript is disabled" 错误，尝试获取英文字幕
      if (error.message.includes('Transcript is disabled')) {
        console.log('🔄 尝试获取英文字幕...');
        try {
          transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
          console.log(`✅ 成功获取英文字幕 ${transcript.length} 段`);
        } catch (retryError: any) {
          console.error('❌ 英文字幕也失败:', retryError.message);
          throw new Error('无法获取字幕。视频可能没有启用字幕，或字幕不可用。');
        }
      } else {
        throw error;
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
        source: 'youtube_transcript_library'
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
