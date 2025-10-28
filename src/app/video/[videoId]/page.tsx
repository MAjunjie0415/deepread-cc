'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TranscriptSegment } from '@/types';

export default function VideoPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const videoId = params.videoId as string;
  const videoUrl = searchParams.get('url') || `https://www.youtube.com/watch?v=${videoId}`;

  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'en' | 'zh'>('zh');
  const [fetchMethod, setFetchMethod] = useState<string>('');

  // 格式化时间戳
  function formatTimestamp(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  // 前端直接获取字幕 - 在 iframe 中提取
  const fetchTranscriptFromFrontend = async () => {
    console.log('\n' + '='.repeat(60));
    console.log('🎯 前端获取字幕 - 从 YouTube 页面直接提取');
    console.log('📹 视频 ID:', videoId);
    console.log('='.repeat(60));
    
    setLoading(true);
    setError(null);
    setFetchMethod('前端 iframe 提取');

    try {
      // 方法：打开一个隐藏的 popup 窗口加载 YouTube 页面
      // 然后从页面中提取 ytInitialPlayerResponse
      console.log('🌐 打开 YouTube 页面...');
      
      const popup = window.open(
        `https://www.youtube.com/watch?v=${videoId}`,
        '_blank',
        'width=1,height=1,left=-1000,top=-1000'
      );
      
      if (!popup) {
        throw new Error('无法打开弹窗，请允许弹窗权限');
      }

      // 等待页面加载
      await new Promise(resolve => setTimeout(resolve, 3000));

      try {
        // 从 popup 窗口中提取字幕数据
        // @ts-ignore - popup.eval 在运行时存在
        const ytData = popup.eval?.('window.ytInitialPlayerResponse');
        
        console.log('📊 ytInitialPlayerResponse:', ytData ? '存在' : '不存在');
        
        if (!ytData || !ytData.captions) {
          throw new Error('页面中没有字幕数据');
        }

        const captionTracks = ytData.captions.playerCaptionsTracklistRenderer?.captionTracks;
        
        if (!captionTracks || captionTracks.length === 0) {
          throw new Error('没有找到字幕轨道');
        }

        console.log(`✅ 找到 ${captionTracks.length} 个字幕轨道`);

        // 选择英语字幕
        const track = captionTracks.find((t: any) => t.languageCode === 'en') || captionTracks[0];
        const subtitleUrl = track.baseUrl;

        console.log('📥 下载字幕:', subtitleUrl);

        // 关闭 popup
        popup.close();

        // 下载字幕内容
        const response = await fetch(subtitleUrl);
        const data = await response.json();

        const allSegments: TranscriptSegment[] = [];
        let segmentId = 0;

        // 解析字幕
        if (data.events) {
          for (const event of data.events) {
            if (event.segs) {
              const text = event.segs.map((seg: any) => seg.utf8 || '').join('').trim();
              if (text) {
                allSegments.push({
                  segment_id: `seg_${segmentId.toString().padStart(4, '0')}`,
                  start: event.tStartMs / 1000,
                  end: (event.tStartMs + event.dDurationMs) / 1000,
                  timestamp: formatTimestamp(event.tStartMs / 1000),
                  text: text
                });
                segmentId++;
              }
            }
          }
        }

        console.log(`✅ 成功获取 ${allSegments.length} 段字幕`);

        setTranscript(allSegments);
        setError(null);
        setFetchMethod('前端 Popup 提取');

      } catch (extractError: any) {
        popup.close();
        throw extractError;
      }

    } catch (error: any) {
      console.error('❌ 前端获取失败:', error);
      setError(`无法获取字幕: ${error.message}`);
      setFetchMethod('');
    } finally {
      setLoading(false);
    }
  };

  // 页面加载时自动获取
  useEffect(() => {
    fetchTranscriptFromFrontend();
  }, [videoId]);

  // 旧的后端方法（已弃用）
  const fetchTranscriptFromBackendOld = async () => {
    console.log('🔄 使用后端 API 获取字幕...');
    setLoading(true);
    setError(null);
    setFetchMethod('后端 API');

    try {
      // 语言配置
      const languageConfigs = [
        { lang: '', name: '自动选择' },
        { lang: 'en', name: '英语' },
        { lang: 'a.en', name: '自动生成英语' }
      ];

      // CORS 代理列表
      const corsProxies = [
        'https://api.allorigins.win/raw?url=',
        'https://corsproxy.io/?',
        ''  // 最后尝试直接访问
      ];

      for (const config of languageConfigs) {
        console.log(`\n🔄 尝试: ${config.name}`);
        
        allSegments.length = 0;
        pageCount = 0;
        nextStart = 0;

        let successProxy = '';

        while (pageCount < maxPages) {
          pageCount++;
          
          // 构建 YouTube API URL
          let youtubeUrl;
          if (config.lang === '') {
            youtubeUrl = nextStart === 0
              ? `https://www.youtube.com/api/timedtext?v=${videoId}&fmt=json3`
              : `https://www.youtube.com/api/timedtext?v=${videoId}&fmt=json3&start=${nextStart}`;
          } else {
            youtubeUrl = nextStart === 0
              ? `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${config.lang}&fmt=json3`
              : `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${config.lang}&fmt=json3&start=${nextStart}`;
          }

          console.log(`📄 第 ${pageCount} 页...`);

          let response: Response | null = null;
          let lastError: Error | null = null;

          // 尝试所有 CORS 代理
          for (const proxy of corsProxies) {
            try {
              const finalUrl = proxy ? `${proxy}${encodeURIComponent(youtubeUrl)}` : youtubeUrl;
              
              response = await fetch(finalUrl, {
                method: 'GET',
                headers: {
                  'Accept': 'application/json'
                },
                signal: AbortSignal.timeout(15000)
              });

              if (response.ok) {
                successProxy = proxy || '直接访问';
                console.log(`   ✓ 使用: ${successProxy}`);
                break;
              }
            } catch (e: any) {
              lastError = e;
              continue;
            }
          }

          if (!response || !response.ok) {
            if (response?.status === 404) {
              console.log(`   ⚠️  ${config.name} 没有字幕`);
              break;
            }
            throw lastError || new Error(`HTTP ${response?.status || 'failed'}`);
          }

          const text = await response.text();
          
          if (!text || text.trim().length === 0) {
            console.log(`   ✓ 空响应，翻页结束`);
            break;
          }

          let data;
          try {
            data = JSON.parse(text);
          } catch (e) {
            console.error('   ❌ JSON 解析失败');
            break;
          }

          const events = data.events || [];
          
          if (events.length === 0) {
            console.log(`   ✓ 无内容，翻页结束`);
            break;
          }

          // 提取字幕段落
          let segmentsInPage = 0;
          for (const event of events) {
            if (event.segs) {
              const text = event.segs.map((seg: any) => seg.utf8 || '').join('').trim();
              if (text) {
                const start = event.tStartMs / 1000;
                const duration = (event.dDurationMs || 0) / 1000;
                
                allSegments.push({
                  segment_id: `seg_${allSegments.length.toString().padStart(4, '0')}`,
                  start,
                  end: start + duration,
                  timestamp: formatTimestamp(start),
                  text
                });
                
                segmentsInPage++;
                nextStart = event.tStartMs / 1000 + 0.01;
              }
            }
          }

          console.log(`   ✓ 获取 ${segmentsInPage} 段 (总计: ${allSegments.length})`);

          if (segmentsInPage < 10) {
            console.log(`   ✓ 段落数少，可能已到末尾`);
            break;
          }
        }

        if (allSegments.length > 0) {
          const lastSegment = allSegments[allSegments.length - 1];
          const totalWords = allSegments.reduce((sum, seg) => 
            sum + seg.text.split(/\s+/).length, 0
          );

          console.log('\n' + '='.repeat(60));
          console.log('✅ 成功获取完整字幕！');
          console.log('='.repeat(60));
          console.log(`   配置: ${config.name}`);
          console.log(`   总页数: ${pageCount}`);
          console.log(`   总段数: ${allSegments.length}`);
          console.log(`   时长: ${lastSegment.timestamp}`);
          console.log(`   总字数: ${totalWords}`);
          console.log(`   最后一段: "${allSegments[allSegments.length - 1].text}"`);
          console.log('='.repeat(60));
          
          setTranscript(allSegments);
          setError(null);
          setFetchMethod(`${config.name} (${successProxy})`);
          return;
        }
      }

      throw new Error('所有语言配置都无法获取字幕');

    } catch (error: any) {
      console.error('\n❌ 前端获取失败:', error);
      setError(`无法获取字幕: ${error.message}`);
      setFetchMethod('');
    } finally {
      setLoading(false);
    }
  };

  // 从后端 API 获取字幕（调用 Zeabur）
  const fetchTranscriptFromBackend = async () => {
    console.log('🔄 调用后端 API 获取字幕...');
    setLoading(true);
    setError(null);
    setFetchMethod('后端 API (Zeabur)');

    try {
      const response = await fetch('/api/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: videoUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '后端 API 调用失败');
      }

      const data = await response.json();
      
      if (!data.success || !data.transcript) {
        throw new Error('后端返回数据格式错误');
      }

      console.log(`✅ 成功获取 ${data.transcript.length} 段字幕`);
      setTranscript(data.transcript);
      setError(null);
      setFetchMethod(`后端 API (${data.meta?.source || 'Zeabur'})`);

    } catch (error: any) {
      console.error('❌ 后端 API 调用失败:', error);
      setError(`无法获取字幕: ${error.message}`);
      setFetchMethod('');
    } finally {
      setLoading(false);
    }
  };

  // 页面加载时自动获取
  useEffect(() => {
    fetchTranscriptFromBackend();
  }, [videoId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* 顶部导航 */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">DeepRead</h1>
            <p className="text-sm text-gray-600 mt-1">深度阅读引擎</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setLanguage('zh')}
              variant={language === 'zh' ? 'default' : 'outline'}
              size="sm"
            >
              中文
            </Button>
            <Button
              onClick={() => setLanguage('en')}
              variant={language === 'en' ? 'default' : 'outline'}
              size="sm"
            >
              EN
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：YouTube 视频 */}
          <div className="space-y-4">
            <Card className="overflow-hidden shadow-lg">
              <CardContent className="p-0">
                <div className="aspect-video bg-black">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </CardContent>
            </Card>

            {/* 状态卡片 */}
            {loading && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">
                        {language === 'zh' ? '正在获取字幕...' : 'Fetching transcript...'}
                      </p>
                      <p className="text-sm text-blue-700 mt-1">
                        {language === 'zh' ? '使用前端直接获取 + 自动翻页' : 'Frontend fetch + auto pagination'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-6">
                  <p className="text-red-900 font-medium mb-2">❌ {error}</p>
                  <p className="text-sm text-red-700 mb-4">
                    {language === 'zh' 
                      ? '可能原因：1) 视频没有字幕 2) 网络限制 3) CORS 代理失败'
                      : 'Possible reasons: 1) No captions 2) Network restriction 3) CORS proxy failed'}
                  </p>
                  <Button 
                    onClick={fetchTranscriptFromBackend} 
                    variant="outline" 
                    size="sm"
                    className="w-full"
                  >
                    {language === 'zh' ? '🔄 重试' : '🔄 Retry'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {transcript.length > 0 && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">✅</div>
                    <div className="flex-1">
                      <p className="font-medium text-green-900 mb-1">
                        {language === 'zh' ? '字幕获取成功！' : 'Transcript loaded!'}
                      </p>
                      <div className="text-sm text-green-700 space-y-1">
                        <p>📝 {transcript.length} {language === 'zh' ? '段' : 'segments'}</p>
                        <p>⏱️ {transcript[transcript.length - 1]?.timestamp}</p>
                        {fetchMethod && <p>🔧 {fetchMethod}</p>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 右侧：字幕显示 */}
          <div>
            <Card className="h-[700px] overflow-hidden shadow-lg">
              <CardHeader className="border-b bg-white">
                <CardTitle className="flex items-center justify-between">
                  <span>{language === 'zh' ? '字幕' : 'Transcript'}</span>
                  {transcript.length > 0 && (
                    <span className="text-sm font-normal text-gray-500">
                      {transcript.length} {language === 'zh' ? '段' : 'segments'}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[calc(100%-80px)] overflow-y-auto p-0">
                {transcript.length === 0 && !loading && !error && (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <div className="text-center">
                      <div className="text-4xl mb-2">📄</div>
                      <p>{language === 'zh' ? '等待加载字幕...' : 'Waiting for transcript...'}</p>
                    </div>
                  </div>
                )}

                {transcript.length > 0 && (
                  <div className="divide-y">
                    {transcript.map((segment) => (
                      <div
                        key={segment.segment_id}
                        className="p-4 hover:bg-blue-50 transition-colors cursor-pointer"
                      >
                        <div className="flex gap-3">
                          <span className="text-xs font-mono text-blue-600 font-semibold flex-shrink-0 mt-0.5">
                            {segment.timestamp}
                          </span>
                          <p className="text-sm text-gray-800 leading-relaxed flex-1">
                            {segment.text}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {transcript.length > 0 && (
              <Button 
                className="w-full mt-4 h-12 text-base font-semibold shadow-lg" 
                size="lg"
                onClick={() => {
                  alert(language === 'zh' 
                    ? '🚀 深度分析功能即将上线！\n\n将提供：\n• 多主线深度阅读\n• AI 生成摘要\n• 知识点提取\n• 智能问答'
                    : '🚀 Deep Analysis coming soon!\n\nFeatures:\n• Multi-line deep reading\n• AI summary\n• Knowledge extraction\n• Smart Q&A'
                  );
                }}
              >
                {language === 'zh' ? '🚀 开始深度分析' : '🚀 Start Deep Analysis'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
