import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// 深度阅读系统提示词
const DEEP_READING_PROMPT_ZH = `你是一个专业的深度阅读分析师。你的任务是对YouTube视频字幕进行深度分析，提取核心观点和知识结构。

## 分析要求

### 1. 主线提取
- 识别视频的2-5条核心主线
- 每条主线包含：标题、定义、关键观点、证据引用、评分
- 评分维度：相关性(0-100)、新颖性(0-100)、可操作性(0-100)、可信度(0-100)

### 2. 证据要求
- 每个关键观点必须有具体的字幕片段作为证据
- 包含segment_id、时间戳、原文引用
- 标记evidence_found为true

### 3. 输出格式
- 使用JSON格式
- 包含meta信息、main_lines、top_segments、flashcards、followup_questions、human_note

### 4. 人读笔记
- 生成结构化的Markdown格式笔记
- 包含不确定/unsupported部分
- 提供推荐动作和延伸阅读建议

请严格按照JSON格式输出，确保数据完整性和准确性。`;

const DEEP_READING_PROMPT_EN = `You are a professional deep reading analyst. Your task is to perform deep analysis on YouTube video transcripts and extract core insights and knowledge structures.

## Analysis Requirements

### 1. Main Line Extraction
- Identify 2-5 core main lines from the video
- Each main line includes: title, definition, key points, evidence citations, scoring
- Scoring dimensions: relevance(0-100), novelty(0-100), actionability(0-100), credibility(0-100)

### 2. Evidence Requirements
- Each key point must have specific transcript segments as evidence
- Include segment_id, timestamp, original text quotes
- Mark evidence_found as true

### 3. Output Format
- Use JSON format
- Include meta info, main_lines, top_segments, flashcards, followup_questions, human_note

### 4. Human Notes
- Generate structured Markdown format notes
- Include uncertain/unsupported sections
- Provide recommended actions and extended reading suggestions

Please output strictly in JSON format, ensuring data completeness and accuracy.`;

// 模拟数据用于本地测试
const mockDeepReadingResponse = {
  meta: {
    word_count: 156,
    paragraph_count: 12,
    timestamps_present: true
  },
  main_lines: [
    {
      id: 1,
      title: "机器学习基础",
      definition: "机器学习是人工智能的子集，专注于算法学习模式",
      key_points: [
        {
          point: "机器学习是人工智能的子集，专注于算法",
          evidence: {
            segment_id: "seg_0002",
            timestamp: "0:10",
            quote: "Machine learning is a subset of artificial intelligence",
            evidence_found: true
          }
        },
        {
          point: "算法可以从数据中学习模式而无需显式编程",
          evidence: {
            segment_id: "seg_0003",
            timestamp: "0:16",
            quote: "learn patterns from data without being explicitly programmed",
            evidence_found: true
          }
        },
        {
          point: "有三种主要类型：监督、无监督和强化学习",
    evidence: {
            segment_id: "seg_0004",
            timestamp: "0:21",
            quote: "supervised, unsupervised, and reinforcement learning",
            evidence_found: true
          }
        }
      ],
  score: {
        total: 87.5,
    breakdown: {
          relevance: 90,
          novelty: 85,
          actionability: 88,
          credibility: 87
        }
      },
      unsupported: []
    },
    {
      id: 2,
      title: "深度学习应用",
      definition: "使用多层神经网络的机器学习方法",
      key_points: [
        {
          point: "深度学习使用多层神经网络",
          evidence: {
            segment_id: "seg_0008",
            timestamp: "0:44",
            quote: "neural networks with multiple layers",
            evidence_found: true
          }
        },
        {
          point: "可以处理图像、文本和音频等复杂数据",
          evidence: {
            segment_id: "seg_0009",
            timestamp: "0:49",
            quote: "process complex data like images, text, and audio",
            evidence_found: true
          }
        }
      ],
      score: {
        total: 82.3,
        breakdown: {
          relevance: 85,
          novelty: 80,
          actionability: 82,
          credibility: 82
        }
      },
      unsupported: []
    }
  ],
  top_segments: [
    {
      segment_id: "seg_0002",
      start: 10.0,
      end: 16.1,
      reason_to_review: "核心概念定义，包含机器学习的基本概念"
    },
    {
      segment_id: "seg_0004",
      start: 21.6,
      end: 26.5,
      reason_to_review: "三种学习类型的重要分类"
    },
    {
      segment_id: "seg_0008",
      start: 44.5,
      end: 49.9,
      reason_to_review: "深度学习的技术细节"
    }
  ],
  flashcards: [
    {
      q: "什么是机器学习？",
      a: "机器学习是人工智能的子集，专注于算法学习模式",
      source_segment: "seg_0002"
    },
    {
      q: "机器学习的三种主要类型是什么？",
      a: "监督学习、无监督学习和强化学习",
      source_segment: "seg_0004"
    },
    {
      q: "深度学习使用什么技术？",
      a: "使用多层神经网络处理复杂数据",
      source_segment: "seg_0008"
    }
  ],
  followup_questions: [
    "如何选择合适的机器学习算法？",
    "监督学习和无监督学习的具体应用场景是什么？",
    "深度学习在哪些领域有突破性应用？",
    "如何评估机器学习模型的性能？",
    "机器学习的未来发展趋势是什么？",
    "如何开始学习机器学习？",
    "深度学习与传统机器学习的区别是什么？",
    "如何避免机器学习中的过拟合问题？",
    "机器学习在商业中的应用案例有哪些？",
    "如何构建一个完整的机器学习项目？"
  ],
  human_note: `# 深度阅读笔记 — 《AI与机器学习基础》

## 不确定/unsupported
- 无

## 主线1 · 机器学习基础 (87.5分)
### 要点
1. 机器学习是人工智能的子集，专注于算法（引 0:10）
2. 算法可以从数据中学习模式而无需显式编程（引 0:16）
3. 有三种主要类型：监督、无监督和强化学习（引 0:21）

### 推荐动作
- 复看 0:10-0:26
- 延伸阅读《机器学习实战》

## 主线2 · 深度学习应用 (82.3分)
### 要点
1. 深度学习使用多层神经网络（引 0:44）
2. 可以处理图像、文本和音频等复杂数据（引 0:49）

### 推荐动作
- 复看 0:44-0:56
- 延伸阅读《深度学习入门》`
};

// 懒加载 OpenAI 客户端
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com/v1',
    });
  }
  return openai;
}

function buildDeepReadingPrompt(request: any): string {
  const { transcript, interests, lang } = request;
  
  let prompt = lang === 'en' ? DEEP_READING_PROMPT_EN : DEEP_READING_PROMPT_ZH;
  
  prompt += `\n\n## 字幕内容\n`;
  transcript.forEach((segment: any) => {
    prompt += `[${segment.timestamp}] ${segment.text}\n`;
  });
  
  if (interests && interests.length > 0) {
    prompt += `\n## 兴趣权重\n`;
    interests.forEach((interest: any) => {
      prompt += `- ${interest.label}: ${interest.weight}\n`;
    });
  }
  
  prompt += `\n请分析上述字幕内容，按照要求的JSON格式输出深度阅读结果。`;
  
  return prompt;
}

export async function POST(req: NextRequest) {
  try {
    const request = await req.json();
    
    if (!request.transcript) {
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      );
    }

    // 检查是否有 DeepSeek API Key
    if (!process.env.DEEPSEEK_API_KEY) {
      console.log('No DeepSeek API key found, using mock data');
      return NextResponse.json(mockDeepReadingResponse);
    }

    // Generate cache key (for future use with Vercel KV)
    // const cacheKey = `deep_reading:${crypto.SHA256(request.transcript).toString()}`;
    
    // TODO: Add Vercel KV caching here if needed

    // Prepare prompt
    const systemPrompt = request.lang === 'en' ? DEEP_READING_PROMPT_EN : DEEP_READING_PROMPT_ZH;
    const userPrompt = buildDeepReadingPrompt(request);

    // Call DeepSeek API
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    try {
      // Try to parse JSON response
      const result = JSON.parse(responseText);
      return NextResponse.json(result);
    } catch (parseError) {
      console.error('Failed to parse DeepSeek response as JSON:', parseError);
      console.error('Raw response:', responseText);
      
      // Fallback to mock data if parsing fails
      return NextResponse.json(mockDeepReadingResponse);
    }

  } catch (error) {
    console.error('Deep reading API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}