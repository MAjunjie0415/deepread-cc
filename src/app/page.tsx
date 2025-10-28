'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { InterestSlider } from '@/components/InterestSlider';
import { MainLineCards } from '@/components/MainLineCards';
import { NoteEditor } from '@/components/NoteEditor';
import { FlashCardZone } from '@/components/FlashCardZone';
import { AppState, TranscriptSegment, DeepReadingResponse, DrillDownResponse } from '@/types';

const defaultInterests = [
  { label: 'AI', weight: 0.5 },
  { label: 'Technology', weight: 0.3 },
  { label: 'Business', weight: 0.2 },
  { label: 'Psychology', weight: 0.1 },
  { label: 'Science', weight: 0.4 },
];

export default function HomePage() {
  const [appState, setAppState] = useState<AppState>({
    youtubeUrl: '',
    transcript: [],
    mainLines: [],
    notes: '',
    flashCards: [],
    drillDownContent: '',
    loading: false,
    error: null,
    language: 'zh', // Default to Chinese
    interests: defaultInterests,
  });

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAppState(prev => ({ ...prev, youtubeUrl: e.target.value }));
  };

  const handleFetchTranscript = async () => {
    setAppState(prev => ({ ...prev, loading: true, error: null, transcript: [] }));
    try {
      const response = await fetch('/api/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: appState.youtubeUrl, lang: appState.language }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch transcript');
      }

      const data = await response.json();
      setAppState(prev => ({ ...prev, transcript: data.transcript, loading: false }));
    } catch (error: any) {
      setAppState(prev => ({ ...prev, error: error.message, loading: false }));
    }
  };

  const handleAnalyze = async () => {
    setAppState(prev => ({ ...prev, loading: true, error: null, mainLines: [] }));
    try {
      const response = await fetch('/api/deep_reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: appState.transcript,
          interests: appState.interests,
          lang: appState.language,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to perform deep reading');
      }

      const data: DeepReadingResponse = await response.json();
      setAppState(prev => ({
        ...prev,
        mainLines: data.main_lines,
        notes: data.human_note,
        flashCards: data.flashcards,
        loading: false,
      }));
    } catch (error: any) {
      setAppState(prev => ({ ...prev, error: error.message, loading: false }));
    }
  };

  const handleDrillDown = async (mainLineId: string) => {
    setAppState(prev => ({ ...prev, loading: true, error: null, drillDownContent: '' }));
    try {
      const response = await fetch('/api/drill_down', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          main_line_index: parseInt(mainLineId),
          transcript: appState.transcript,
          lang: appState.language,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to perform drill down');
      }

      const data: DrillDownResponse = await response.json();
      setAppState(prev => ({ ...prev, drillDownContent: data.long_form, loading: false }));
    } catch (error: any) {
      setAppState(prev => ({ ...prev, error: error.message, loading: false }));
    }
  };

  const handleNoteChange = (value: string | undefined) => {
    setAppState(prev => ({ ...prev, notes: value || '' }));
  };

  const handleLanguageChange = (lang: 'en' | 'zh') => {
    setAppState(prev => ({ ...prev, language: lang }));
  };

  const handleInterestChange = (newInterests: { label: string; weight: number }[]) => {
    setAppState(prev => ({ ...prev, interests: newInterests }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">DeepRead - 深度阅读引擎</h1>

        <div className="flex justify-center mb-6">
          <Button
            onClick={() => handleLanguageChange('zh')}
            variant={appState.language === 'zh' ? 'default' : 'outline'}
            className="mr-2"
          >
            中文
          </Button>
          <Button
            onClick={() => handleLanguageChange('en')}
            variant={appState.language === 'en' ? 'default' : 'outline'}
          >
            EN
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>拉取 YouTube 字幕</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <input
                type="url"
                placeholder={appState.language === 'zh' ? '粘贴 YouTube 链接...' : 'Paste YouTube URL...'}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={appState.youtubeUrl}
                onChange={handleUrlChange}
              />
              <Button onClick={handleFetchTranscript} disabled={appState.loading}>
                {appState.loading
                  ? (appState.language === 'zh' ? '加载中...' : 'Loading...')
                  : (appState.language === 'zh' ? '拉取字幕' : 'Pull Subtitles')}
              </Button>
            </div>
            {appState.error && (
              <p className="text-red-500 text-sm mt-2">{appState.error}</p>
            )}
            {appState.transcript.length > 0 && (
              <Badge variant="secondary" className="mt-2">
                {appState.language === 'zh' ? `已拉取 ${appState.transcript.length} 段字幕` : `Fetched ${appState.transcript.length} segments`}
              </Badge>
            )}
          </CardContent>
        </Card>

        {appState.transcript.length > 0 && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>兴趣权重</CardTitle>
              </CardHeader>
              <CardContent>
                <InterestSlider
                  interests={appState.interests}
                  onInterestsChange={handleInterestChange}
                  language={appState.language}
                />
                <Button onClick={handleAnalyze} disabled={appState.loading} className="mt-4">
                  {appState.loading
                    ? (appState.language === 'zh' ? '分析中...' : 'Analyzing...')
                    : (appState.language === 'zh' ? '开始分析' : 'Start Analysis')}
                </Button>
              </CardContent>
            </Card>

            {appState.mainLines.length > 0 && (
              <Tabs defaultValue="main-lines" className="mb-6">
                <TabsList>
                  <TabsTrigger value="main-lines">
                    {appState.language === 'zh' ? '主线分析' : 'Main Lines'}
                  </TabsTrigger>
                  <TabsTrigger value="notes">
                    {appState.language === 'zh' ? '深度笔记' : 'Deep Notes'}
                  </TabsTrigger>
                  <TabsTrigger value="flash-cards">
                    {appState.language === 'zh' ? '复习卡片' : 'Flash Cards'}
                  </TabsTrigger>
                  {appState.drillDownContent && (
                    <TabsTrigger value="drill-down">
                      {appState.language === 'zh' ? '深挖内容' : 'Drill Down'}
                    </TabsTrigger>
                  )}
                </TabsList>
                <TabsContent value="main-lines">
                  <MainLineCards
                    mainLines={appState.mainLines}
                    onDrillDown={handleDrillDown}
                    language={appState.language}
                  />
                </TabsContent>
                <TabsContent value="notes">
                  <NoteEditor
                    initialContent={appState.notes}
                    onContentChange={handleNoteChange}
                    language={appState.language}
                  />
                </TabsContent>
                <TabsContent value="flash-cards">
                  <FlashCardZone
                    flashCards={appState.flashCards}
                    language={appState.language}
                  />
                </TabsContent>
                {appState.drillDownContent && (
                  <TabsContent value="drill-down">
                    <Card>
                      <CardHeader>
                        <CardTitle>
                          {appState.language === 'zh' ? '深挖内容' : 'Drill Down Content'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div
                          className="prose dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: appState.drillDownContent }}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}
              </Tabs>
            )}
          </>
        )}
      </div>
    </div>
  );
}