import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Types
interface DrillDownRequest {
  main_line_index: number;
  transcript: string;
  word_limit?: number;
  lang?: 'en' | 'zh';
}

interface DrillDownResponse {
  long_form: string;
  teaching_outline: string[];
  key_slides: string[];
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

// System prompts for drill down
const DRILL_DOWN_PROMPT_ZH = `你是一个深度内容创作专家，专门为选定的主线生成详细的长文分析和教学材料。

## 任务
针对用户选定的主线，生成：
1. 800-2000字的深度长文（Markdown格式）
2. 10条教学/演讲提纲
3. 5个关键幻灯片标题

## 要求
1. **长文结构**：
   - 引言：背景和重要性
   - 核心论证：基于原文的具体证据
   - 深度分析：多角度解读
   - 实践应用：可操作的建议
   - 结论：总结和展望

2. **引用规范**：
   - 每段至少包含1处原文引用（≤25字）
   - 引用格式：> "原文内容"（时间戳）
   - 确保所有引用都来自提供的transcript

3. **教学提纲**：
   - 10条，每条10-20字
   - 从基础到高级的逻辑顺序
   - 包含互动环节和讨论点

4. **幻灯片标题**：
   - 5个，每个≤15字
   - 适合PPT展示的简洁标题
   - 涵盖核心概念和关键数据

## 输出格式
请严格按照以下JSON格式输出：
{
  "long_form": "# 深度文章：{主线标题}\\n\\n## 引言\\n...",
  "teaching_outline": ["1. 基础概念介绍", "2. 核心原理分析", ...],
  "key_slides": ["Slide 1: 核心概念图", "Slide 2: 数据对比表", ...]
}`;

const DRILL_DOWN_PROMPT_EN = `You are a deep content creation expert, specializing in generating detailed long-form analysis and teaching materials for selected main lines.

## Task
For the user-selected main line, generate:
1. 800-2000 word deep long-form article (Markdown format)
2. 10 teaching/presentation outlines
3. 5 key slide titles

## Requirements
1. **Long-form Structure**:
   - Introduction: background and importance
   - Core arguments: specific evidence from original text
   - Deep analysis: multi-perspective interpretation
   - Practical applications: actionable recommendations
   - Conclusion: summary and outlook

2. **Citation Standards**:
   - Each paragraph must contain at least 1 original text citation (≤25 chars)
   - Citation format: > "original content" (timestamp)
   - Ensure all citations come from the provided transcript

3. **Teaching Outline**:
   - 10 items, each 10-20 characters
   - Logical progression from basic to advanced
   - Include interactive elements and discussion points

4. **Slide Titles**:
   - 5 items, each ≤15 characters
   - Concise titles suitable for PPT presentation
   - Cover core concepts and key data

## Output Format
Please strictly follow this JSON format:
{
  "long_form": "# Deep Article: {Main Line Title}\\n\\n## Introduction\\n...",
  "teaching_outline": ["1. Basic Concept Introduction", "2. Core Principle Analysis", ...],
  "key_slides": ["Slide 1: Core Concept Diagram", "Slide 2: Data Comparison Table", ...]
}`;

function buildDrillDownPrompt(request: DrillDownRequest): string {
  const { main_line_index, transcript, word_limit = 1500 } = request;
  
  return `请针对主线索引 ${main_line_index} 进行深度分析。

原文内容：
${transcript}

字数限制：${word_limit}字
请生成详细的长文分析、教学提纲和幻灯片标题。`;
}

export async function POST(req: NextRequest) {
  try {
    const request: DrillDownRequest = await req.json();
    
    if (request.main_line_index === undefined || !request.transcript) {
      return NextResponse.json(
        { error: 'main_line_index and transcript are required' },
        { status: 400 }
      );
    }

    // Prepare prompt
    const systemPrompt = request.lang === 'en' ? DRILL_DOWN_PROMPT_EN : DRILL_DOWN_PROMPT_ZH;
    const userPrompt = buildDrillDownPrompt(request);

    // Call DeepSeek
    const deepseekClient = getDeepSeekClient();
    const completion = await deepseekClient.chat.completions.create({
      model: 'deepseek-chat',
      temperature: 0.2,
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
    let result: DrillDownResponse;
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: create structured response from text
        result = {
          long_form: response,
          teaching_outline: [
            "1. 核心概念介绍",
            "2. 深度分析展开", 
            "3. 实践应用指导",
            "4. 案例研究分析",
            "5. 总结与展望"
          ],
          key_slides: [
            "核心概念图",
            "分析框架",
            "关键数据",
            "实践案例",
            "总结要点"
          ]
        };
      }
    } catch (parseError) {
      console.error('Failed to parse drill down response:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Drill down API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
