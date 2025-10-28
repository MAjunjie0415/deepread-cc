import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import crypto from 'crypto-js';

// Types
interface DeepReadingRequest {
  transcript: string;
  interests: Record<string, number>;
  max_main_lines?: number;
  scoring_weights?: {
    relevance: number;
    novelty: number;
    actionability: number;
    credibility: number;
  };
  output_format?: { json: boolean; human: boolean };
  lang?: 'en' | 'zh';
}

interface MainLine {
  id: number;
  title: string;
  definition: string;
  key_points: Array<{
    point: string;
    evidence: {
      segment_id: string;
      timestamp: string;
      quote: string;
      evidence_found: boolean;
    };
  }>;
  score: {
    total: number;
    breakdown: {
      relevance: number;
      novelty: number;
      actionability: number;
      credibility: number;
    };
  };
  unsupported: string[];
}

interface DeepReadingResponse {
  meta: {
    word_count: number;
    paragraph_count: number;
    timestamps_present: boolean;
  };
  main_lines: MainLine[];
  top_segments: Array<{
    segment_id: string;
    start: number;
    end: number;
    reason_to_review: string;
  }>;
  flashcards: Array<{
    q: string;
    a: string;
    source_segment: string;
  }>;
  followup_questions: string[];
  human_note: string;
}

// Initialize DeepSeek client lazily
let deepseek: OpenAI | null = null;

function getDeepSeekClient() {
  if (!deepseek) {
    deepseek = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY!,
      baseURL: 'https://api.deepseek.com/v1'
    });
  }
  return deepseek;
}

// System prompts
const SYSTEM_PROMPT_ZH = `你是一台严谨、可追溯、专注于"长音/长文深度阅读"的文本分析引擎。
目标：帮助用户把任意长播客、访谈、讲座文本「多主线拆解 → 评分筛选 → 生成可复习笔记 → 支持迭代深挖」。

## 输入格式（JSON）
{
  "transcript":   "完整原文（含或不含时间戳）",
  "interests":    {"主线A":权重, "主线B":权重} | {},
  "max_main_lines": int (默认3),
  "scoring_weights":{"relevance":0.4,"novelty":0.25,"actionability":0.2,"credibility":0.15},
  "output_format":{"json":true,"human":true},
  "word_limit":   int (深挖模式时最大输出字数)
}

## 执行步骤（必须严格遵守）

### A 前处理
1. 若含时间戳 → 解析为 segment_id & start/end；若无 → 按换行分段编号 seg_001..
2. 返回字数 & 段落数到 meta.word_count / paragraph_count / timestamps_present。

### B 多主线发现（互相独立）
1. 数量 = max_main_lines；权重参考 interests。
2. 每条主线字段：
   - id:序号
   - title:≤12字
   - definition:20-30字
   - key_points:[]（3-8条）
     → point:一句话论点
     → evidence:{segment_id, timestamp|lineno, quote(≤25字), evidence_found:bool}
   - unsupported:[]（模型暂找不到原文的结论）
3. 主线之间尽量不重叠；若重叠>30%需合并或重命名。

### C 评分（0-100，保留两位）
1. 对「全文」与「每条主线」分别打分。
2. 逐项分数 + 总分 + 10-20字理由。
3. 公式：total = Σ(weight_i * score_i)。

### D 可信度校验
1. 任何"结论性陈述"必须配 quote；否则标注 unsupported。
2. 不得编造原文未出现的数字、名称、日期。

### E 输出（必须同时给出）
#### E-1 JSON（字段严格）
{
  meta:{word_count,paragraph_count,timestamps_present},
  main_lines:[{
    id,title,definition,
    key_points:[{point,evidence:{segment_id,timestamp,quote,evidence_found},score_breakdown}],
    score:{total,breakdown:{relevance,novelty,actionability,credibility}},
    unsupported:[]
  }],
  top_segments:[{segment_id,start,end,reason_to_review}],
  flashcards:[{q,a,source_segment}],
  followup_questions:[字符串*10]
}

#### E-2 可读笔记（Markdown）
# 深度阅读笔记 — 《{{title}}》

## 不确定/unsupported
- 列表

## 主线1 · {{title}} (89.12分)
### 要点
1. ……（引 08:34）
2. ……（引 15:21）

### 推荐动作
- 复看 08:34-10:20
- 延伸阅读《XXX》

## 主线2 …

## 引用 & 长度限制
- 直接引述≤25字；超量请用"…"截断。
- 若 transcript>200k 字，先分段摘要并在 meta 标记 recommend_chunking:true。

## 角色风格
- 中立、简洁、结构化。
- 避免口语"哇"、"呢"。
- 评分理由用短语，如"证据充分，案例新颖"。

## 开始执行
请严格按以上步骤输出，不要添加本提示词以外的解释文字。`;

const SYSTEM_PROMPT_EN = `You are a rigorous, traceable text analysis engine focused on "deep reading of long audio/text content".
Goal: Help users break down any long podcast, interview, or lecture text into "multiple main lines → score and filter → generate reviewable notes → support iterative deep diving".

## Input Format (JSON)
{
  "transcript":   "Complete original text (with or without timestamps)",
  "interests":    {"MainLineA":weight, "MainLineB":weight} | {},
  "max_main_lines": int (default 3),
  "scoring_weights":{"relevance":0.4,"novelty":0.25,"actionability":0.2,"credibility":0.15},
  "output_format":{"json":true,"human":true},
  "word_limit":   int (max output words in drill-down mode)
}

## Execution Steps (Must strictly follow)

### A Preprocessing
1. If timestamps present → parse as segment_id & start/end; if not → number paragraphs as seg_001..
2. Return word count & paragraph count to meta.word_count / paragraph_count / timestamps_present.

### B Multi-line Discovery (mutually independent)
1. Count = max_main_lines; weights reference interests.
2. Each main line fields:
   - id: sequence number
   - title: ≤12 characters
   - definition: 20-30 characters
   - key_points:[] (3-8 items)
     → point: one-sentence argument
     → evidence:{segment_id, timestamp|lineno, quote(≤25 chars), evidence_found:bool}
   - unsupported:[] (conclusions model can't find in original text)
3. Main lines should not overlap much; if overlap>30% need to merge or rename.

### C Scoring (0-100, keep two decimals)
1. Score "full text" and "each main line" separately.
2. Individual scores + total + 10-20 character reasoning.
3. Formula: total = Σ(weight_i * score_i).

### D Credibility Verification
1. Any "conclusive statements" must have quotes; otherwise mark as unsupported.
2. Cannot fabricate numbers, names, dates not appearing in original text.

### E Output (must provide both)
#### E-1 JSON (strict fields)
{
  meta:{word_count,paragraph_count,timestamps_present},
  main_lines:[{
    id,title,definition,
    key_points:[{point,evidence:{segment_id,timestamp,quote,evidence_found}}],
    score:{total,breakdown:{relevance,novelty,actionability,credibility}},
    unsupported:[]
  }],
  top_segments:[{segment_id,start,end,reason_to_review}],
  flashcards:[{q,a,source_segment}],
  followup_questions:[string*10]
}

#### E-2 Human-readable Notes (Markdown)
# Deep Reading Notes — 《{{title}}》

## Uncertain/Unsupported
- List

## Main Line 1 · {{title}} (89.12 points)
### Key Points
1. …… (ref 08:34)
2. …… (ref 15:21)

### Recommended Actions
- Review 08:34-10:20
- Extended reading 《XXX》

## Main Line 2 …

## Citation & Length Limits
- Direct quotes ≤25 characters; use "…" for truncation if longer.
- If transcript>200k characters, segment and summarize first, mark recommend_chunking:true in meta.

## Role Style
- Neutral, concise, structured.
- Avoid colloquial expressions like "wow", "ne".
- Scoring reasons in phrases, like "sufficient evidence, novel cases".

## Start Execution
Please strictly follow the above steps for output, do not add explanatory text beyond this prompt.`;

function buildUserPrompt(request: DeepReadingRequest): string {
  const {
    transcript,
    interests,
    max_main_lines = 3,
    scoring_weights = {
      relevance: 0.4,
      novelty: 0.25,
      actionability: 0.2,
      credibility: 0.15
    },
    output_format = { json: true, human: true }
  } = request;

  return JSON.stringify({
    transcript,
    interests,
    max_main_lines,
    scoring_weights,
    output_format
  });
}

// 模拟数据用于本地测试
const mockDeepReadingResponse: DeepReadingResponse = {
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

export async function POST(req: NextRequest) {
  try {
    const request: DeepReadingRequest = await req.json();
    
    if (!request.transcript) {
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      );
    }

  // 检查是否有 DeepSeek API Key 或是否在开发环境
  if (!process.env.DEEPSEEK_API_KEY || process.env.NODE_ENV === 'development') {
    console.log('No DeepSeek API key found or in development mode, using mock data');
    return NextResponse.json(mockDeepReadingResponse);
  }

    // Generate cache key (for future use with Vercel KV)
    const cacheKey = `deep_reading:${crypto.SHA256(request.transcript).toString()}`;
    
    // TODO: Add Vercel KV caching here if needed
    // For now, we'll skip caching to simplify deployment

    // Prepare prompt
    const systemPrompt = request.lang === 'en' ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_ZH;
    const userPrompt = buildUserPrompt(request);

    // Call DeepSeek
    const deepseekClient = getDeepSeekClient();
    const completion = await deepseekClient.chat.completions.create({
      model: 'deepseek-chat',
      temperature: 0.15,
      max_tokens: 4096,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from DeepSeek');
    }

    // Parse response
    let result: DeepReadingResponse;
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse DeepSeek response:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    // TODO: Cache result with Vercel KV if needed
    // For now, we'll skip caching to simplify deployment

    return NextResponse.json(result);

  } catch (error) {
    console.error('Deep reading API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
