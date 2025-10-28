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

async function fetchWithCorsProxy(url: string): Promise<Response> {
  // 尝试多个 CORS 代理
  const proxies = [
    '', // 先尝试直接访问
    'https://corsproxy.io/?',
    'https://api.allorigins.win/raw?url=',
  ];

  for (const proxy of proxies) {
    try {
      const proxyUrl = proxy + encodeURIComponent(url);
      console.log(`Trying ${proxy ? 'proxy' : 'direct'}: ${proxyUrl.substring(0, 100)}...`);
      
      const response = await fetch(proxy ? proxyUrl : url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        signal: AbortSignal.timeout(15000) // 15秒超时
      });

      if (response.ok) {
        console.log(`Success with ${proxy ? 'proxy' : 'direct'}`);
        return response;
      }
    } catch (error) {
      console.error(`Failed with ${proxy ? 'proxy' : 'direct'}:`, error);
    }
  }

  throw new Error('All proxy attempts failed');
}

async function fetchTranscriptFromYoutube(videoId: string, preferredLang?: string): Promise<any[]> {
  const allSegments: any[] = [];
  
  try {
    // 首先获取视频页面以找到字幕 URL
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    console.log(`Fetching video page: ${videoUrl}`);
    
    const pageResponse = await fetchWithCorsProxy(videoUrl);
    const pageHtml = await pageResponse.text();
    
    // 从页面中提取字幕 URL
    const captionTracksMatch = pageHtml.match(/"captionTracks":(\[.*?\])/);
    if (!captionTracksMatch) {
      console.log('No caption tracks found in page HTML');
      throw new Error('No captions available');
    }

    const captionTracks = JSON.parse(captionTracksMatch[1]);
    console.log(`Found ${captionTracks.length} caption tracks:`, captionTracks.map((t: any) => t.languageCode).join(', '));

    // 优先使用第一个可用的字幕（通常是视频的原始语言）
    let captionUrl = null;
    let selectedLang = '';
    
    // 如果指定了语言，先尝试找到匹配的
    if (preferredLang) {
      for (const track of captionTracks) {
        if (track.languageCode === preferredLang || track.languageCode.startsWith(preferredLang)) {
          captionUrl = track.baseUrl;
          selectedLang = track.languageCode;
          console.log(`Found preferred language: ${selectedLang}`);
          break;
        }
      }
    }

    // 如果没找到指定语言或没有指定语言，使用第一个可用的（通常是原始语言）
    if (!captionUrl && captionTracks.length > 0) {
      captionUrl = captionTracks[0].baseUrl;
      selectedLang = captionTracks[0].languageCode;
      console.log(`Using first available language: ${selectedLang}`);
    }

    if (!captionUrl) {
      throw new Error('No caption URL found');
    }

    // 获取字幕内容
    console.log(`Fetching captions from: ${captionUrl.substring(0, 100)}...`);
    const captionResponse = await fetchWithCorsProxy(captionUrl + '&fmt=json3');
    const captionData = await captionResponse.json();

    if (captionData.events && Array.isArray(captionData.events)) {
      const segments = captionData.events
        .filter((event: any) => event.segs && event.segs.length > 0)
        .map((event: any) => ({
          text: event.segs.map((seg: any) => seg.utf8 || '').join('').trim(),
          offset: event.tStartMs || 0,
          duration: event.dDurationMs || 0
        }))
        .filter((seg: any) => seg.text.length > 0);

      allSegments.push(...segments);
      console.log(`Extracted ${segments.length} segments from captions`);
    }

  } catch (error) {
    console.error('Error fetching transcript from YouTube:', error);
    throw error;
  }

  return allSegments;
}

async function fetchTranscriptWithLibrary(videoId: string, lang?: string): Promise<any[]> {
  try {
    const { YoutubeTranscript } = await import('youtube-transcript');
    // 如果指定了语言，使用指定语言；否则让库自动选择
    const options = lang ? { lang } : {};
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, options);
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

    console.log(`=== Fetching transcript for video: ${videoId}, lang: ${lang} ===`);

    let transcript: any[] = [];
    let method = '';
    const errors: string[] = [];

    // 方法1：从 YouTube 页面提取字幕 URL（不指定语言，使用原始语言）
    try {
      console.log('Method 1: Extracting from YouTube page (auto language)...');
      transcript = await fetchTranscriptFromYoutube(videoId);
      if (transcript.length > 0) {
        method = 'youtube_page_extraction';
        console.log(`✓ Success with page extraction: ${transcript.length} segments`);
      }
    } catch (error: any) {
      errors.push(`Page extraction (auto): ${error.message}`);
      console.error('✗ Page extraction (auto) failed:', error.message);
    }

    // 方法2：使用 youtube-transcript 库（不指定语言，让库自动选择）
    if (transcript.length === 0) {
      try {
        console.log('Method 2: Using youtube-transcript library (auto language)...');
        transcript = await fetchTranscriptWithLibrary(videoId);
        method = 'youtube_transcript_library_auto';
        console.log(`✓ Success with library (auto): ${transcript.length} segments`);
      } catch (error: any) {
        errors.push(`Library (auto): ${error.message}`);
        console.error('✗ Library (auto) failed:', error.message);
        
        // 方法3：明确尝试英文
        try {
          console.log('Method 3: Trying explicit English...');
          transcript = await fetchTranscriptWithLibrary(videoId, 'en');
          method = 'youtube_transcript_library_en';
          console.log(`✓ Success with explicit English: ${transcript.length} segments`);
        } catch (retryError: any) {
          errors.push(`Library (EN): ${retryError.message}`);
          console.error('✗ Explicit English failed:', retryError.message);
        }
      }
    }

    if (!transcript || transcript.length === 0) {
      console.error('=== All methods failed ===');
      console.error('Errors:', errors);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch transcript. Possible reasons: 1) Video has no captions, 2) Captions are disabled, 3) Network restrictions.',
          details: errors
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

    console.log(`=== SUCCESS ===`);
    console.log(`Method: ${method}`);
    console.log(`Segments: ${formattedTranscript.length}`);
    console.log(`Words: ${wordCount}`);
    console.log(`Duration: ${formatTimestamp(totalDuration)}`);

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
    console.error('=== API Error ===', error);
    return NextResponse.json(
      { success: false, error: error.message || '服务器错误，请稍后重试' },
      { status: 500 }
    );
  }
}