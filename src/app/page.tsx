'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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

export default function HomePage() {
  const router = useRouter();
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'en' | 'zh'>('zh');

  const handleSubmit = () => {
    setError(null);

    if (!youtubeUrl.trim()) {
      setError(language === 'zh' ? '请输入 YouTube 链接' : 'Please enter a YouTube URL');
      return;
    }

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      setError(language === 'zh' ? '无效的 YouTube 链接' : 'Invalid YouTube URL');
      return;
    }

    // 跳转到视频页面
    router.push(`/video/${videoId}?url=${encodeURIComponent(youtubeUrl)}`);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        {/* Logo & Title */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            DeepRead
          </h1>
          <p className="text-xl text-gray-600">
            {language === 'zh' ? '深度阅读引擎' : 'Deep Reading Engine'}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {language === 'zh' 
              ? 'Too Long; Didn\'t Watch - 从长视频中快速学习' 
              : 'Too Long; Didn\'t Watch - Learn from long videos 10x faster'}
          </p>
        </div>

        {/* Language Toggle */}
        <div className="flex justify-center gap-2 mb-8">
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

        {/* Main Input Card */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl">
              {language === 'zh' ? '拉取 YouTube 字幕' : 'Pull YouTube Subtitles'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <input
                type="url"
                placeholder={
                  language === 'zh' 
                    ? '粘贴 YouTube 链接...' 
                    : 'Paste YouTube URL here...'
                }
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <Button 
                onClick={handleSubmit}
                size="lg"
                className="px-8"
              >
                {language === 'zh' ? '拉取字幕' : 'Pull Subtitles'}
              </Button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Example */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">
                {language === 'zh' ? '示例：' : 'Example:'}
              </p>
              <button
                onClick={() => setYoutubeUrl('https://www.youtube.com/watch?v=7xTGNNLPyMI')}
                className="text-xs text-blue-600 hover:underline"
              >
                https://www.youtube.com/watch?v=7xTGNNLPyMI
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl mb-2">🎬</div>
            <h3 className="font-semibold text-gray-900 mb-1">
              {language === 'zh' ? '智能提取' : 'Smart Extraction'}
            </h3>
            <p className="text-sm text-gray-600">
              {language === 'zh' 
                ? '自动提取 YouTube 视频字幕' 
                : 'Auto-extract YouTube subtitles'}
            </p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">🧠</div>
            <h3 className="font-semibold text-gray-900 mb-1">
              {language === 'zh' ? '深度分析' : 'Deep Analysis'}
            </h3>
            <p className="text-sm text-gray-600">
              {language === 'zh' 
                ? 'AI 驱动的内容理解' 
                : 'AI-powered content understanding'}
            </p>
          </div>
          <div className="text-center">
            <div className="text-3xl mb-2">📝</div>
            <h3 className="font-semibold text-gray-900 mb-1">
              {language === 'zh' ? '笔记生成' : 'Note Generation'}
            </h3>
            <p className="text-sm text-gray-600">
              {language === 'zh' 
                ? '自动生成学习笔记' 
                : 'Auto-generate learning notes'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
