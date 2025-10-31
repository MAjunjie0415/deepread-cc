'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TranscriptSegment, DeepReadingResponse, MainLine, FlashCard } from '@/types';
import { MainLineCards } from '@/components/MainLineCards';
import { NoteEditor } from '@/components/NoteEditor';
import { FlashCardZone } from '@/components/FlashCardZone';

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
  
  // 深度分析相关状态
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<DeepReadingResponse | null>(null);
  const [mainLines, setMainLines] = useState<MainLine[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [flashCards, setFlashCards] = useState<FlashCard[]>([]);
  
  // 深挖相关状态
  const [drilling, setDrilling] = useState(false);
  const [drilledMainLineId, setDrilledMainLineId] = useState<string | null>(null);
  const [drillDownContent, setDrillDownContent] = useState<{
    longForm: string;
    teachingOutline: string[];
    keySlides: string[];
  } | null>(null);

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

  // 前端通过自己的代理获取字幕
  const fetchTranscriptFromFrontend = async () => {
    console.log('\n' + '='.repeat(60));
    console.log('🎯 前端获取字幕 - 通过代理 API');
    console.log('📹 视频 ID:', videoId);
    console.log('='.repeat(60));

    setLoading(true);
    setError(null);
    setFetchMethod('代理 API');

    // 尝试多种语言
    const languageCodes = ['', 'en', 'zh', 'zh-Hans', 'zh-Hant', 'a.en'];

    let lastError: any = null;

    for (const lang of languageCodes) {
      try {
        const apiUrl = `/api/proxy?v=${videoId}${lang ? `&lang=${lang}` : ''}`;
        
        console.log(`🔄 尝试语言: ${lang || '自动检测'}`);

        const response = await fetch(apiUrl, {
          method: 'GET',
          signal: AbortSignal.timeout(15000), // 15秒超时
        });

        if (!response.ok) {
          console.log(`   ❌ HTTP ${response.status}`);
          lastError = new Error(`HTTP ${response.status}`);
          continue;
        }

        const text = await response.text();
        
        if (!text || text.trim().length === 0) {
          console.log(`   ❌ 空响应`);
          continue;
        }

        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.log(`   ❌ JSON 解析失败`);
          continue;
        }

        if (data.error) {
          console.log(`   ❌ API 错误: ${data.error}`);
          lastError = new Error(data.error);
          continue;
        }

        if (!data.events || data.events.length === 0) {
          console.log(`   ❌ 无字幕数据`);
          continue;
        }

        // 成功！解析字幕
        const allSegments: TranscriptSegment[] = [];
        let segmentId = 0;

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

        if (allSegments.length > 0) {
          console.log(`✅ 成功获取 ${allSegments.length} 段字幕 (${lang || '自动检测'})`);
          setTranscript(allSegments);
          setError(null);
          setFetchMethod(`代理 API (${lang || '自动'})`);
          setLoading(false);
          return;
        }

      } catch (error: any) {
        console.log(`   ❌ ${error.message}`);
        lastError = error;
        continue;
      }
    }

    // 所有方法都失败了
    console.error('❌ 所有语言尝试都失败了');
    setError(`无法获取字幕。可能原因：\n1) 视频没有字幕\n2) YouTube API 限制\n3) 视频为私有或受限\n\n最后错误: ${lastError?.message || '未知'}`);
    setFetchMethod('');
    setLoading(false);
  };

  // 深度分析函数
  const startDeepAnalysis = async () => {
    if (transcript.length === 0) {
      alert(language === 'zh' ? '请先获取字幕' : 'Please fetch transcript first');
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      console.log('🧠 开始深度分析...');
      
      const response = await fetch('/api/deep_reading', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: transcript,
          interests: [], // 可以后续添加兴趣权重
          lang: language,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result: DeepReadingResponse = await response.json();
      
      console.log('✅ 分析完成:', result);
      
      setAnalysisResult(result);
      setMainLines(result.main_lines || []);
      setNotes(result.human_note || '');
      setFlashCards(result.flashcards || []);
      
    } catch (error: any) {
      console.error('❌ 深度分析失败:', error);
      setError(`深度分析失败: ${error.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  // 深挖功能
  const handleDrillDown = async (mainLineId: string) => {
    console.log('🔍 开始深挖主线:', mainLineId);
    
    setDrilling(true);
    setDrilledMainLineId(mainLineId);
    setError(null);

    try {
      const response = await fetch('/api/drill_down', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          main_line_index: parseInt(mainLineId),
          transcript: transcript,
          lang: language,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      
      console.log('✅ 深挖完成:', result);
      
      setDrillDownContent({
        longForm: result.long_form || '',
        teachingOutline: result.teaching_outline || [],
        keySlides: result.key_slides || [],
      });
      
    } catch (error: any) {
      console.error('❌ 深挖失败:', error);
      setError(`深挖失败: ${error.message}`);
      setDrilledMainLineId(null);
    } finally {
      setDrilling(false);
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
                    {language === 'zh' ? '自动获取字幕失败' : 'Auto-fetch failed'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0">
                  <p className="text-red-600 text-sm mb-3">❌ {error}</p>
                  
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-yellow-800 font-medium mb-2">
                      💡 {language === 'zh' ? '解决方案' : 'Solution'}
                    </p>
                    <p className="text-sm text-yellow-700">
                      {language === 'zh' 
                        ? '请手动下载字幕文件并上传：'
                        : 'Please download and upload subtitle file manually:'}
                    </p>
                    <ol className="text-sm text-yellow-700 mt-2 ml-4 list-decimal space-y-1">
                      <li>{language === 'zh' ? '点击视频下方的"..."按钮' : 'Click "..." below video'}</li>
                      <li>{language === 'zh' ? '选择"显示文字记录"' : 'Select "Show transcript"'}</li>
                      <li>{language === 'zh' ? '复制字幕文本' : 'Copy transcript text'}</li>
                      <li>{language === 'zh' ? '粘贴到下方输入框' : 'Paste to input below'}</li>
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <Button
                      onClick={fetchTranscriptFromFrontend}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      {language === 'zh' ? '🔄 重试自动获取' : '🔄 Retry Auto-fetch'}
                    </Button>
                    
                    <Button
                      onClick={() => {
                        const text = prompt(language === 'zh' 
                          ? '请粘贴字幕文本（每行一段）：' 
                          : 'Paste transcript text (one line per segment):');
                        
                        if (text) {
                          const lines = text.split('\n').filter(l => l.trim());
                          const segments: TranscriptSegment[] = lines.map((line, i) => ({
                            segment_id: `seg_${i.toString().padStart(4, '0')}`,
                            start: i * 3,
                            end: (i + 1) * 3,
                            timestamp: formatTimestamp(i * 3),
                            text: line.trim()
                          }));
                          
                          setTranscript(segments);
                          setError(null);
                          setFetchMethod('手动上传');
                        }
                      }}
                      variant="default"
                      size="sm"
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {language === 'zh' ? '📝 手动粘贴字幕' : '📝 Paste Manually'}
                    </Button>
                  </div>
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

            {transcript.length > 0 && !analysisResult && (
              <Button
                className="w-full mt-4 text-lg py-3"
                size="lg"
                onClick={startDeepAnalysis}
                disabled={analyzing}
              >
                {analyzing ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    {language === 'zh' ? '分析中...' : 'Analyzing...'}
                  </span>
                ) : (
                  language === 'zh' ? '🧠 开始深度分析' : '🧠 Start Deep Analysis'
                )}
              </Button>
            )}
          </div>
        </div>

        {/* 深度分析结果区域 */}
        {analysisResult && (
          <div className="mt-8">
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl">
                  {language === 'zh' ? '📊 深度分析结果' : '📊 Deep Analysis Results'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="mainlines" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="mainlines">
                      {language === 'zh' ? '🎯 主线分析' : '🎯 Main Lines'} 
                      {mainLines.length > 0 && ` (${mainLines.length})`}
                    </TabsTrigger>
                    <TabsTrigger value="notes">
                      {language === 'zh' ? '📝 学习笔记' : '📝 Notes'}
                    </TabsTrigger>
                    <TabsTrigger value="flashcards">
                      {language === 'zh' ? '🃏 复习卡片' : '🃏 Flashcards'}
                      {flashCards.length > 0 && ` (${flashCards.length})`}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="mainlines" className="mt-6">
                    {mainLines.length > 0 ? (
                      <MainLineCards
                        mainLines={mainLines}
                        onDrillDown={handleDrillDown}
                        language={language}
                      />
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        {language === 'zh' ? '未找到主线' : 'No main lines found'}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="notes" className="mt-6">
                    <NoteEditor
                      initialContent={notes}
                      onContentChange={(value) => setNotes(value || '')}
                      language={language}
                    />
                  </TabsContent>

                  <TabsContent value="flashcards" className="mt-6">
                    {flashCards.length > 0 ? (
                      <FlashCardZone
                        flashCards={flashCards}
                        language={language}
                      />
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        {language === 'zh' ? '未生成复习卡片' : 'No flashcards generated'}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                {/* 后续问题 */}
                {analysisResult.followup_questions && analysisResult.followup_questions.length > 0 && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {language === 'zh' ? '💡 延伸思考' : '💡 Follow-up Questions'}
                    </h3>
                    <ul className="space-y-2">
                      {analysisResult.followup_questions.slice(0, 5).map((question, idx) => (
                        <li key={idx} className="text-sm text-gray-700">
                          • {question}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* 深挖结果区域 */}
        {drillDownContent && (
          <div className="mt-8">
            <Card className="shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-2xl">
                  {language === 'zh' ? '🔍 深度挖掘内容' : '🔍 Deep Dive Content'}
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDrillDownContent(null);
                    setDrilledMainLineId(null);
                  }}
                >
                  {language === 'zh' ? '关闭' : 'Close'}
                </Button>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="longform" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="longform">
                      {language === 'zh' ? '📄 深度长文' : '📄 Long-form'}
                    </TabsTrigger>
                    <TabsTrigger value="outline">
                      {language === 'zh' ? '📚 教学提纲' : '📚 Outline'}
                      {drillDownContent.teachingOutline.length > 0 && 
                        ` (${drillDownContent.teachingOutline.length})`}
                    </TabsTrigger>
                    <TabsTrigger value="slides">
                      {language === 'zh' ? '🖼️ 关键幻灯片' : '🖼️ Key Slides'}
                      {drillDownContent.keySlides.length > 0 && 
                        ` (${drillDownContent.keySlides.length})`}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="longform" className="mt-6">
                    <div className="prose prose-sm max-w-none">
                      <div 
                        className="text-gray-700 leading-relaxed whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ 
                          __html: drillDownContent.longForm.replace(/\n/g, '<br/>') 
                        }}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="outline" className="mt-6">
                    {drillDownContent.teachingOutline.length > 0 ? (
                      <ol className="space-y-3 list-decimal list-inside">
                        {drillDownContent.teachingOutline.map((item, idx) => (
                          <li key={idx} className="text-gray-700 leading-relaxed">
                            {item}
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        {language === 'zh' ? '未生成教学提纲' : 'No teaching outline generated'}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="slides" className="mt-6">
                    {drillDownContent.keySlides.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {drillDownContent.keySlides.map((slide, idx) => (
                          <Card key={idx} className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                                {idx + 1}
                              </div>
                              <p className="text-gray-800 font-medium">{slide}</p>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        {language === 'zh' ? '未生成关键幻灯片' : 'No key slides generated'}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 深挖加载提示 */}
        {drilling && (
          <div className="mt-8">
            <Card className="shadow-xl">
              <CardContent className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                <p className="text-lg text-gray-700">
                  {language === 'zh' ? '🔍 正在深度挖掘...' : '🔍 Deep diving...'}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {language === 'zh' 
                    ? '正在生成详细长文和教学提纲，这可能需要 20-40 秒...'
                    : 'Generating detailed content and teaching outline, this may take 20-40 seconds...'}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
