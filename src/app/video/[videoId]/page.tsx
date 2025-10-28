'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TranscriptSegment, DeepReadingResponse } from '@/types';

export default function VideoPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const videoId = params.videoId as string;
  const videoUrl = searchParams.get('url') || `https://www.youtube.com/watch?v=${videoId}`;

  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'en' | 'zh'>('zh');

  // 从 YouTube IFrame API 获取字幕
  const fetchTranscriptFromPlayer = async () => {
    setLoading(true);
    setError(null);

    try {
      // 调用后端 API
      const response = await fetch('/api/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: videoUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '获取字幕失败');
      }

      const data = await response.json();
      setTranscript(data.transcript);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 页面加载时自动获取字幕
    fetchTranscriptFromPlayer();
  }, [videoId]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* 语言切换 */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">DeepRead - 深度阅读引擎</h1>
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
            <Card>
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
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    {language === 'zh' ? '正在加载字幕...' : 'Loading transcript...'}
                  </p>
                </CardContent>
              </Card>
            )}

            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-6">
                  <p className="text-red-600 text-sm">❌ {error}</p>
                  <Button 
                    onClick={fetchTranscriptFromPlayer} 
                    variant="outline" 
                    size="sm"
                    className="mt-2"
                  >
                    {language === 'zh' ? '重试' : 'Retry'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 右侧：字幕显示 */}
          <div>
            <Card className="h-[600px] overflow-hidden">
              <CardHeader>
                <CardTitle>
                  {language === 'zh' ? '字幕' : 'Transcript'}
                  {transcript.length > 0 && (
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      ({transcript.length} {language === 'zh' ? '段' : 'segments'})
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[calc(100%-80px)] overflow-y-auto">
                {transcript.length === 0 && !loading && !error && (
                  <div className="text-center text-gray-500 py-8">
                    {language === 'zh' ? '等待加载字幕...' : 'Waiting for transcript...'}
                  </div>
                )}

                {transcript.length > 0 && (
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
                )}
              </CardContent>
            </Card>

            {transcript.length > 0 && (
              <Button 
                className="w-full mt-4" 
                size="lg"
                onClick={() => {
                  // TODO: 跳转到分析页面
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

