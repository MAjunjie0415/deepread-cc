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
 * 使用 YouTube 公开 timedtext API 获取字幕
 * 参考：Kimi 的成功实现
 * 
 * 核心方法：
 * 1. 使用 /api/timedtext 公开接口
 * 2. 自动翻页获取所有字幕
 * 3. 不需要登录或密钥
 */
async function fetchYouTubeTimedText(videoId: string): Promise<any[]> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎯 使用 YouTube TimedText API`);
  console.log(`📹 视频 ID: ${videoId}`);
  console.log(`${'='.repeat(60)}`);

  const allSegments: any[] = [];
  let pageCount = 0;
  let nextStart = 0;
  const maxPages = 50; // 防止无限循环

  // 尝试多种语言
  const languages = ['en', 'en-US', 'en-GB'];
  
  for (const lang of languages) {
    console.log(`\n🔄 尝试语言: ${lang}`);
    
    try {
      // 重置分页状态
      allSegments.length = 0;
      pageCount = 0;
      nextStart = 0;

      while (pageCount < maxPages) {
        pageCount++;
        
        // 构建 URL
        const url = nextStart === 0
          ? `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`
          : `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3&start=${nextStart}`;
        
        console.log(`📄 第 ${pageCount} 页: ${url}`);

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': `https://www.youtube.com/watch?v=${videoId}`
          },
          signal: AbortSignal.timeout(15000)
        });

        if (!response.ok) {
          console.log(`❌ HTTP ${response.status}: ${response.statusText}`);
          if (response.status === 404) {
            console.log(`⚠️  语言 ${lang} 没有字幕`);
            break; // 尝试下一个语言
          }
          throw new Error(`HTTP ${response.status}`);
        }

        const text = await response.text();
        
        if (!text || text.trim().length === 0) {
          console.log(`✓ 第 ${pageCount} 页为空，翻页结束`);
          break;
        }

        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error(`❌ JSON 解析失败:`, text.substring(0, 200));
          throw new Error('Invalid JSON response');
        }

        // 解析 events 数组
        const events = data.events || [];
        
        if (events.length === 0) {
          console.log(`✓ 第 ${pageCount} 页无内容，翻页结束`);
          break;
        }

        // 提取字幕段落
        let segmentsInPage = 0;
        for (const event of events) {
          if (event.segs) {
            // 合并同一时间点的多个片段
            const text = event.segs.map((seg: any) => seg.utf8 || '').join('');
            if (text.trim()) {
              allSegments.push({
                text: text.trim(),
                start: event.tStartMs / 1000,
                duration: (event.dDurationMs || 0) / 1000
              });
              segmentsInPage++;
              nextStart = event.tStartMs / 1000 + 0.01; // 下一页起点
            }
          }
        }

        console.log(`   ✓ 获取 ${segmentsInPage} 段`);

        // 如果这一页段落很少，可能已经到末尾
        if (segmentsInPage < 10) {
          console.log(`✓ 段落数量少于 10，可能已到末尾`);
          break;
        }
      }

      if (allSegments.length > 0) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`✅ 成功获取字幕！`);
        console.log(`   语言: ${lang}`);
        console.log(`   总页数: ${pageCount}`);
        console.log(`   总段数: ${allSegments.length}`);
        console.log(`   时长: ${formatTimestamp(allSegments[allSegments.length - 1].start)}`);
        console.log(`${'='.repeat(60)}`);
        
        return allSegments;
      }

    } catch (error: any) {
      console.error(`❌ 语言 ${lang} 失败:`, error.message);
      continue;
    }
  }

  throw new Error('所有语言都无法获取字幕');
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

    const transcript = await fetchYouTubeTimedText(videoId);

    if (!transcript || transcript.length === 0) {
      throw new Error('字幕为空');
    }

    // 格式化为统一格式
    const formattedTranscript = transcript.map((segment, index) => {
      return {
        segment_id: `seg_${String(index).padStart(4, '0')}`,
        start: segment.start,
        end: segment.start + segment.duration,
        timestamp: formatTimestamp(segment.start),
        text: segment.text
      };
    });

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
        source: 'youtube_timedtext_api'
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
