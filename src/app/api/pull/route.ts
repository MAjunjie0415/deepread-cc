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
 * 使用经过验证的开源 YouTube 字幕 API
 * 这些服务已经被数千个项目使用
 */
async function fetchTranscriptFromOpenAPI(videoId: string): Promise<any[]> {
  console.log(`📡 使用开源 YouTube 字幕 API`);
  
  // 多个经过验证的开源 API
  const apis: Array<{
    name: string;
    url: string;
    method?: string;
    body?: string;
    headers: Record<string, string>;
  }> = [
    // API: 直接使用 YouTube 的 innertube API
    {
      name: 'YouTube InnerTube API',
      url: 'https://www.youtube.com/youtubei/v1/get_transcript?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8',
      method: 'POST',
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20240304.00.00'
          }
        },
        params: Buffer.from(`\n\x0b${videoId}`).toString('base64')
      }),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }
  ];

  for (const api of apis) {
    try {
      console.log(`🔄 尝试: ${api.name}`);
      
      const response = await fetch(api.url, {
        method: api.method || 'GET',
        headers: api.headers,
        body: api.body,
        signal: AbortSignal.timeout(20000)
      });

      if (!response.ok) {
        console.log(`❌ ${api.name} 失败: HTTP ${response.status}`);
        const errorText = await response.text();
        console.log('错误响应:', errorText.substring(0, 200));
        continue;
      }

      const data = await response.json();
      console.log(`✓ ${api.name} 返回数据`);

      // 处理 InnerTube API 响应
      if (data.actions && data.actions[0]?.updateEngagementPanelAction) {
        const content = data.actions[0].updateEngagementPanelAction.content;
        const transcriptRenderer = content?.transcriptRenderer?.content?.transcriptSearchPanelRenderer;
        
        if (transcriptRenderer?.body?.transcriptSegmentListRenderer?.initialSegments) {
          const segments = transcriptRenderer.body.transcriptSegmentListRenderer.initialSegments;
          const transcript = segments.map((seg: any) => {
            const snippet = seg.transcriptSegmentRenderer?.snippet?.runs?.[0]?.text || '';
            const startMs = parseInt(seg.transcriptSegmentRenderer?.startMs || '0');
            const endMs = parseInt(seg.transcriptSegmentRenderer?.endMs || '0');
            
            return {
              text: snippet,
              offset: startMs,
              duration: endMs - startMs
            };
          }).filter((seg: any) => seg.text.length > 0);

          if (transcript.length > 0) {
            console.log(`✅ ${api.name} 成功: ${transcript.length} 段`);
            return transcript;
          }
        }
      }

      // 处理标准响应格式
      let transcript = [];
      if (Array.isArray(data)) {
        transcript = data;
      } else if (data.transcript && Array.isArray(data.transcript)) {
        transcript = data.transcript;
      } else if (data.data && Array.isArray(data.data)) {
        transcript = data.data;
      }

      if (transcript.length > 0) {
        console.log(`✅ ${api.name} 成功: ${transcript.length} 段`);
        return transcript.map((item: any) => ({
          text: item.text || item.snippet || '',
          offset: (item.offset || item.start || item.startMs || 0),
          duration: (item.duration || item.dur || 0)
        }));
      }

    } catch (error: any) {
      console.error(`❌ ${api.name} 错误:`, error.message);
    }
  }

  throw new Error('所有 API 都失败了');
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

    const transcript = await fetchTranscriptFromOpenAPI(videoId);

    if (!transcript || transcript.length === 0) {
      throw new Error('字幕为空');
    }

    // 格式化为统一格式
    const formattedTranscript = transcript.map((segment, index) => {
      // 确保 offset 是毫秒
      const offsetMs = segment.offset > 10000 ? segment.offset : segment.offset * 1000;
      const durationMs = segment.duration > 1000 ? segment.duration : segment.duration * 1000;
      
      return {
        segment_id: `seg_${String(index).padStart(4, '0')}`,
        start: offsetMs / 1000,
        end: (offsetMs + durationMs) / 1000,
        timestamp: formatTimestamp(offsetMs / 1000),
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
        source: 'youtube_innertube_api'
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
