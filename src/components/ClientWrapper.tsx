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
  { label: 'Science', weight: 0.4 }
];

export default function ClientWrapper() {
  const [state, setState] = useState<AppState>({
    youtubeUrl: '',
    transcript: [],
    isPullingTranscript: false,
    interests: defaultInterests,
    maxMainLines: 3,
    scoringWeights: {
      relevance: 0.4,
      novelty: 0.25,
      actionability: 0.2,
      credibility: 0.15
    },
    deepReadingResult: null,
    isAnalyzing: false,
    humanNote: '',
    drillDownResult: null,
    isDrillingDown: false,
    selectedMainLine: null,
    activeTab: 'flashcards',
    lang: 'zh'
  });

  // Load saved note from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('deepread_note');
    if (saved) {
      setState(prev => ({ ...prev, humanNote: saved }));
    }
  }, []);

  // Save note to localStorage
  useEffect(() => {
    if (state.humanNote) {
      localStorage.setItem('deepread_note', state.humanNote);
    }
  }, [state.humanNote]);

  const pullTranscript = async () => {
    if (!state.youtubeUrl) return;
    
    setState(prev => ({ ...prev, isPullingTranscript: true }));
    
    try {
      const response = await fetch('/api/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: state.youtubeUrl,
          lang: state.lang === 'zh' ? 'zh-Hans,zh-Hant,en' : 'en,zh-Hans,zh-Hant'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setState(prev => ({ 
          ...prev, 
          transcript: data.transcript,
          isPullingTranscript: false 
        }));
      } else {
        throw new Error(data.error || 'Failed to pull transcript');
      }
    } catch (error) {
      console.error('Error pulling transcript:', error);
      setState(prev => ({ ...prev, isPullingTranscript: false }));
      alert('Failed to pull transcript: ' + (error as Error).message);
    }
  };

  const analyzeTranscript = async () => {
    if (state.transcript.length === 0) return;
    
    setState(prev => ({ ...prev, isAnalyzing: true }));
    
    try {
      const transcriptText = state.transcript.map(seg => 
        `[${seg.timestamp}] ${seg.text}`
      ).join('\n');
      
      const interestsObj = state.interests.reduce((acc, interest) => {
        acc[interest.label] = interest.weight;
        return acc;
      }, {} as Record<string, number>);
      
      const response = await fetch('/api/deep_reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcriptText,
          interests: interestsObj,
          max_main_lines: state.maxMainLines,
          scoring_weights: state.scoringWeights,
          output_format: { json: true, human: true },
          lang: state.lang
        })
      });
      
      const data = await response.json();
      
      if (data.main_lines) {
        setState(prev => ({ 
          ...prev, 
          deepReadingResult: data,
          humanNote: data.human_note || '',
          isAnalyzing: false 
        }));
      } else {
        throw new Error(data.error || 'Failed to analyze transcript');
      }
    } catch (error) {
      console.error('Error analyzing transcript:', error);
      setState(prev => ({ ...prev, isAnalyzing: false }));
      alert('Failed to analyze transcript: ' + (error as Error).message);
    }
  };

  const drillDown = async (mainLineId: number) => {
    if (!state.deepReadingResult || state.transcript.length === 0) return;
    
    setState(prev => ({ ...prev, isDrillingDown: true, selectedMainLine: mainLineId }));
    
    try {
      const transcriptText = state.transcript.map(seg => 
        `[${seg.timestamp}] ${seg.text}`
      ).join('\n');
      
      const response = await fetch('/api/drill_down', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          main_line_index: mainLineId,
          transcript: transcriptText,
          word_limit: 1500,
          lang: state.lang
        })
      });
      
      const data = await response.json();
      
      if (data.long_form) {
        setState(prev => ({ 
          ...prev, 
          drillDownResult: data,
          isDrillingDown: false 
        }));
      } else {
        throw new Error(data.error || 'Failed to drill down');
      }
    } catch (error) {
      console.error('Error drilling down:', error);
      setState(prev => ({ ...prev, isDrillingDown: false }));
      alert('Failed to drill down: ' + (error as Error).message);
    }
  };

  const t = {
    en: {
      title: 'DeepRead - Deep Reading Engine',
      subtitle: 'Transform YouTube transcripts into deep insights',
      urlPlaceholder: 'Paste YouTube URL here...',
      pullTranscript: 'Pull Transcript',
      analyze: 'Analyze',
      interests: 'Interest Weights',
      mainLines: 'Main Lines',
      notes: 'Notes',
      review: 'Review',
      flashcards: 'Flashcards',
      segments: 'Top Segments',
      questions: 'Questions',
      drillDown: 'Drill Down',
      loading: 'Loading...',
      noTranscript: 'No transcript available',
      noAnalysis: 'No analysis available'
    },
    zh: {
      title: 'DeepRead - 深度阅读引擎',
      subtitle: '将 YouTube 字幕转化为深度洞察',
      urlPlaceholder: '粘贴 YouTube 链接...',
      pullTranscript: '拉取字幕',
      analyze: '分析',
      interests: '兴趣权重',
      mainLines: '主线分析',
      notes: '笔记',
      review: '复习',
      flashcards: '复习卡片',
      segments: '重点片段',
      questions: '追问',
      drillDown: '深挖',
      loading: '加载中...',
      noTranscript: '暂无字幕',
      noAnalysis: '暂无分析'
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {t[state.lang].title}
              </h1>
              <p className="text-sm text-gray-600">
                {t[state.lang].subtitle}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={state.lang === 'zh' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setState(prev => ({ ...prev, lang: 'zh' }))}
              >
                中文
              </Button>
              <Button
                variant={state.lang === 'en' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setState(prev => ({ ...prev, lang: 'en' }))}
              >
                EN
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel */}
          <div className="space-y-6">
            {/* URL Input */}
            <Card>
              <CardHeader>
                <CardTitle>{t[state.lang].pullTranscript}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder={t[state.lang].urlPlaceholder}
                    value={state.youtubeUrl}
                    onChange={(e) => setState(prev => ({ ...prev, youtubeUrl: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button 
                    onClick={pullTranscript}
                    disabled={state.isPullingTranscript || !state.youtubeUrl}
                  >
                    {state.isPullingTranscript ? t[state.lang].loading : t[state.lang].pullTranscript}
                  </Button>
                </div>
                
                {state.transcript.length > 0 && (
                  <div className="mt-4">
                    <Button 
                      onClick={analyzeTranscript}
                      disabled={state.isAnalyzing}
                      className="w-full"
                    >
                      {state.isAnalyzing ? t[state.lang].loading : t[state.lang].analyze}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Interest Weights */}
            <Card>
              <CardHeader>
                <CardTitle>{t[state.lang].interests}</CardTitle>
              </CardHeader>
              <CardContent>
                <InterestSlider
                  interests={state.interests}
                  onChange={(interests) => setState(prev => ({ ...prev, interests }))}
                />
              </CardContent>
            </Card>

            {/* Transcript Display */}
            {state.transcript.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Transcript ({state.transcript.length} segments)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {state.transcript.map((segment) => (
                      <div key={segment.segment_id} className="text-sm">
                        <span className="text-blue-600 font-mono">
                          {segment.timestamp}
                        </span>
                        <span className="ml-2">{segment.text}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Panel */}
          <div className="space-y-6">
            {/* Main Lines */}
            {state.deepReadingResult && (
              <Card>
                <CardHeader>
                  <CardTitle>{t[state.lang].mainLines}</CardTitle>
                </CardHeader>
                <CardContent>
                  <MainLineCards
                    lines={state.deepReadingResult.main_lines}
                    onDrillDown={drillDown}
                    isDrillingDown={state.isDrillingDown}
                    selectedMainLine={state.selectedMainLine}
                  />
                </CardContent>
              </Card>
            )}

            {/* Notes Editor */}
            <Card>
              <CardHeader>
                <CardTitle>{t[state.lang].notes}</CardTitle>
              </CardHeader>
              <CardContent>
                <NoteEditor
                  value={state.humanNote}
                  onChange={(note) => setState(prev => ({ ...prev, humanNote: note }))}
                />
              </CardContent>
            </Card>

            {/* Review Section */}
            {state.deepReadingResult && (
              <Card>
                <CardHeader>
                  <CardTitle>{t[state.lang].review}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs value={state.activeTab} onValueChange={(tab) => 
                    setState(prev => ({ ...prev, activeTab: tab as any }))
                  }>
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="flashcards">{t[state.lang].flashcards}</TabsTrigger>
                      <TabsTrigger value="segments">{t[state.lang].segments}</TabsTrigger>
                      <TabsTrigger value="questions">{t[state.lang].questions}</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="flashcards">
                      <FlashCardZone cards={state.deepReadingResult.flashcards} />
                    </TabsContent>
                    
                    <TabsContent value="segments">
                      <div className="space-y-2">
                        {state.deepReadingResult.top_segments.map((segment, idx) => (
                          <div key={idx} className="p-3 border rounded-lg">
                            <div className="font-mono text-sm text-blue-600">
                              {segment.segment_id}
                            </div>
                            <div className="text-sm text-gray-600">
                              {segment.reason_to_review}
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="questions">
                      <div className="space-y-2">
                        {state.deepReadingResult.followup_questions.map((question, idx) => (
                          <div key={idx} className="p-3 border rounded-lg">
                            <div className="text-sm">{question}</div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {/* Drill Down Result */}
            {state.drillDownResult && (
              <Card>
                <CardHeader>
                  <CardTitle>Deep Analysis Result</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <div dangerouslySetInnerHTML={{ 
                      __html: state.drillDownResult.long_form.replace(/\n/g, '<br/>') 
                    }} />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
