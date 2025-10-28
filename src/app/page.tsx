'use client';

import { useState, useEffect } from 'react';

export default function HomePage() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [transcript, setTranscript] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const pullTranscript = async () => {
    if (!youtubeUrl) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: youtubeUrl,
          lang: 'zh-Hans,zh-Hant,en'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setTranscript(data.transcript);
      } else {
        setError(data.error || 'Failed to pull transcript');
      }
    } catch (error) {
      setError('Network error: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          DeepRead - 深度阅读引擎
        </h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">拉取 YouTube 字幕</h2>
          
          <div className="flex gap-4 mb-4">
            <input
              type="url"
              placeholder="粘贴 YouTube 链接..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={pullTranscript}
              disabled={isLoading || !youtubeUrl}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? '拉取中...' : '拉取字幕'}
            </button>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
        </div>

        {transcript.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">
              字幕内容 ({transcript.length} 段)
            </h2>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {transcript.map((segment: any, idx: number) => (
                <div key={idx} className="text-sm border-l-2 border-blue-200 pl-3">
                  <span className="text-blue-600 font-mono text-xs">
                    {segment.timestamp}
                  </span>
                  <span className="ml-2">{segment.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}