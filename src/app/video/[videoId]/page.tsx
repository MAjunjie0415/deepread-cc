'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TranscriptSegment } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';

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

  // 前端直接获取字幕 - 使用 CORS 代理
  const fetchTranscriptFromFrontend = async () => {
    console.log('\n' + '='.repeat(60));
    console.log('🎯 前端获取字幕 - 使用 CORS 代理');
    console.log('📹 视频 ID:', videoId);
    console.log('='.repeat(60));

    setLoading(true);
    setError(null);
    setFetchMethod('前端 CORS 代理');

    try {
      // 直接使用 YouTube 的 timedtext API + CORS 代理
      const corsProxy = 'https://api.allorigins.win/raw?url=';
      const youtubeUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&fmt=json3`;
      const finalUrl = `${corsProxy}${encodeURIComponent(youtubeUrl)}`;

      console.log('📥 获取字幕:', finalUrl);

      const response = await fetch(finalUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.events || data.events.length === 0) {
        throw new Error('没有找到字幕数据');
      }

      const allSegments: TranscriptSegment[] = [];
      let segmentId = 0;

      // 解析字幕
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

      console.log(`✅ 成功获取 ${allSegments.length} 段字幕`);

      setTranscript(allSegments);
      setError(null);
      setFetchMethod('前端 CORS 代理');

    } catch (error: any) {
      console.error('❌ 前端获取失败:', error);
      setError(`无法获取字幕: ${error.message}。请尝试使用有字幕的视频。`);
      setFetchMethod('');
    } finally {
      setLoading(false);
    }
  };

  // 页面加载时自动获取
  useEffect(() => {
    fetchTranscriptFromFrontend();
  }, [videoId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* 顶部导航 */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h1 className="text-3xl font-extrabold text-gray-900">DeepRead 深度阅读引擎</h1>
          <div className="flex gap-2">
            <Button
              onClick={() => setLanguage('zh')}
              variant={language === 'zh' ? 'default' : 'outline'}
            >
              中文
            </Button>
            <Button
              onClick={() => setLanguage('en')}
              variant={language === 'en' ? 'default' : 'outline'}
            >
              EN
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：YouTube 视频播放器 */}
          <div className="space-y-4">
            <Card className="shadow-lg">
              <CardContent className="p-0">
                <div className="aspect-video">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="rounded-lg"
                  />
                </div>
              </CardContent>
            </Card>

            {loading && (
              <Card className="shadow-lg">
                <CardContent className="p-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    {language === 'zh' ? '正在加载字幕...' : 'Loading transcript...'}
                  </p>
                </CardContent>
              </Card>
            )}

            {error && (
              <Card className="border-red-200 bg-red-50 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-red-700 text-lg">
                    {language === 'zh' ? '获取字幕失败' : 'Failed to fetch transcript'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <p className="text-red-600 text-sm mb-2">❌ {error}</p>
                  <p className="text-sm text-red-700 mb-4">
                    {language === 'zh'
                      ? '可能原因：1) 视频没有字幕 2) 网络限制 3) CORS 代理失败'
                      : 'Possible reasons: 1) No captions 2) Network restriction 3) CORS proxy failed'}
                  </p>
                  <Button
                    onClick={fetchTranscriptFromFrontend}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    {language === 'zh' ? '🔄 重试' : '🔄 Retry'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 右侧：字幕显示 */}
          <div>
            <Card className="h-[600px] overflow-hidden shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xl font-bold">
                  {language === 'zh' ? '字幕' : 'Transcript'}
                  {transcript.length > 0 && (
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      ({transcript.length} {language === 'zh' ? '段' : 'segments'})
                    </span>
                  )}
                </CardTitle>
                {fetchMethod && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {fetchMethod}
                  </span>
                )}
              </CardHeader>
              <CardContent className="h-[calc(100%-80px)] overflow-y-auto">
                {transcript.length === 0 && !loading && !error && (
                  <div className="text-center text-gray-500 py-8">
                    {language === 'zh' ? '等待加载字幕...' : 'Waiting for transcript...'}
                  </div>
                )}

                {transcript.length > 0 && (
                  <ScrollArea className="h-full pr-4">
                    <div className="space-y-3">
                      {transcript.map((segment) => (
                        <div
                          key={segment.segment_id}
                          className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-xs font-mono text-blue-600 mt-1 flex-shrink-0">
                              {segment.timestamp}
                            </span>
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {segment.text}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {transcript.length > 0 && (
              <Button
                className="w-full mt-4 text-lg py-3"
                size="lg"
                onClick={() => {
                  alert('开始深度分析功能即将上线！');
                }}
              >
                {language === 'zh' ? '开始深度分析' : 'Start Deep Analysis'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
