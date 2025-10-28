'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TranscriptSegment } from '@/types';

// 声明 YouTube IFrame API 类型
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function VideoPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const videoId = params.videoId as string;
  const videoUrl = searchParams.get('url') || `https://www.youtube.com/watch?v=${videoId}`;

  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'en' | 'zh'>('zh');
  const playerRef = useRef<any>(null);

  // 加载 YouTube IFrame API
  useEffect(() => {
    // 如果已经加载过，直接返回
    if (window.YT) {
      return;
    }

    // 加载 YouTube IFrame API 脚本
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    // API 准备好后的回调
    window.onYouTubeIframeAPIReady = () => {
      console.log('YouTube IFrame API ready');
    };
  }, []);

  // 从后端 API 获取字幕（备用方案）
  const fetchTranscriptFromBackend = async () => {
    setLoading(true);
    setError(null);

    try {
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
      console.error('Backend fetch failed:', error);
      
      // 如果后端失败，尝试前端方案
      await fetchTranscriptFromFrontend();
    } finally {
      setLoading(false);
    }
  };

  // 从前端直接获取字幕（主要方案）
  const fetchTranscriptFromFrontend = async () => {
    console.log('尝试从前端获取字幕...');
    setLoading(true);
    setError(null);

    try {
      // 使用 fetch 直接从浏览器访问 YouTube
      const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const response = await fetch(videoPageUrl);
      
      if (!response.ok) {
        throw new Error('无法访问 YouTube 视频页面');
      }

      const html = await response.text();
      
      // 提取 ytInitialPlayerResponse
      const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
      if (!playerResponseMatch) {
        throw new Error('无法从页面提取播放器数据');
      }

      const playerResponse = JSON.parse(playerResponseMatch[1]);
      const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer;
      
      if (!captions || !captions.captionTracks || captions.captionTracks.length === 0) {
        throw new Error('视频没有可用的字幕');
      }

      // 获取第一个可用的字幕轨道
      const captionTrack = captions.captionTracks[0];
      const captionUrl = captionTrack.baseUrl;

      console.log('字幕 URL:', captionUrl);

      // 获取字幕内容
      const captionResponse = await fetch(`${captionUrl}&fmt=json3`);
      if (!captionResponse.ok) {
        throw new Error('无法获取字幕内容');
      }

      const captionData = await captionResponse.json();
      
      if (!captionData.events || captionData.events.length === 0) {
        throw new Error('字幕数据为空');
      }

      // 转换为我们的格式
      const segments: TranscriptSegment[] = captionData.events
        .filter((event: any) => event.segs && event.segs.length > 0)
        .map((event: any, index: number) => {
          const text = event.segs.map((seg: any) => seg.utf8 || '').join('').trim();
          const start = event.tStartMs / 1000;
          const duration = event.dDurationMs / 1000;
          
          return {
            segment_id: `seg_${index.toString().padStart(4, '0')}`,
            start,
            end: start + duration,
            timestamp: formatTimestamp(start),
            text
          };
        })
        .filter((seg: TranscriptSegment) => seg.text.length > 0);

      console.log(`成功获取 ${segments.length} 段字幕`);
      setTranscript(segments);
      setError(null);

    } catch (error: any) {
      console.error('Frontend fetch failed:', error);
      setError(`前端获取失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  function formatTimestamp(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  useEffect(() => {
    // 页面加载时优先尝试后端 API
    fetchTranscriptFromBackend();
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
                  <p className="text-red-600 text-sm mb-2">❌ {error}</p>
                  <div className="flex gap-2">
                    <Button 
                      onClick={fetchTranscriptFromFrontend} 
                      variant="outline" 
                      size="sm"
                    >
                      {language === 'zh' ? '重试（前端）' : 'Retry (Frontend)'}
                    </Button>
                    <Button 
                      onClick={fetchTranscriptFromBackend} 
                      variant="outline" 
                      size="sm"
                    >
                      {language === 'zh' ? '尝试后端' : 'Try Backend'}
                    </Button>
                  </div>
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
