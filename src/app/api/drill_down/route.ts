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

// 模拟数据用于本地测试
const mockDrillDownResponse: DrillDownResponse = {
  long_form: `# 深度文章：机器学习基础

## 引言

在当今数字化时代，机器学习已经成为推动技术进步的核心驱动力。正如视频中所说："Machine learning is a subset of artificial intelligence that focuses on algorithms"（引 0:10）。这一技术不仅改变了我们处理数据的方式，更重新定义了人机交互的可能性。

## 核心概念解析

### 机器学习的本质

机器学习的核心在于让计算机系统能够从数据中自动学习和改进，而无需显式编程。正如原文所述："These algorithms can learn patterns from data without being explicitly programmed"（引 0:16）。这种能力使得机器能够识别复杂模式，做出预测，并不断优化其性能。

### 三大学习类型

机器学习主要分为三种类型，每种都有其独特的应用场景：

1. **监督学习**：使用标记数据训练模型，使其能够对新数据进行预测。这种方法在图像识别、语音识别等领域表现出色。

2. **无监督学习**：在没有标签的情况下发现数据中的隐藏模式。这种方法在数据挖掘、聚类分析中发挥重要作用。

3. **强化学习**：通过试错过程学习最优策略。这种方法在游戏AI、自动驾驶等领域取得了突破性进展。

## 深度学习的革命性影响

### 神经网络的力量

深度学习作为机器学习的子集，使用多层神经网络来处理复杂数据。正如视频中提到的："neural networks with multiple layers"（引 0:44）能够处理图像、文本和音频等多种类型的数据，展现出惊人的准确性。

### 应用领域的扩展

深度学习的应用范围极其广泛，从医疗诊断到金融风控，从自动驾驶到智能助手，几乎涵盖了所有需要智能决策的领域。这种技术的普及正在重塑各行各业的运作方式。

## 实践指导

### 学习路径建议

对于想要进入机器学习领域的学习者，建议从基础数学和编程开始，逐步深入到具体的算法实现。实践项目是巩固理论知识的最佳方式。

### 技术选型考虑

在选择机器学习技术时，需要考虑数据量、问题复杂度、计算资源等多个因素。不同的算法适用于不同的场景，没有万能的解决方案。

## 未来展望

随着计算能力的提升和算法的不断优化，机器学习将在更多领域发挥重要作用。我们需要在技术发展的同时，关注伦理和社会影响，确保技术为人类带来真正的福祉。

## 结论

机器学习作为人工智能的重要组成部分，正在改变我们的世界。通过深入理解其基本原理和应用方法，我们可以更好地利用这一技术，为社会发展贡献力量。`,
  teaching_outline: [
    "1. 机器学习基础概念介绍",
    "2. 三大学习类型详解",
    "3. 深度学习技术原理",
    "4. 神经网络架构分析",
    "5. 实际应用案例研究",
    "6. 算法选择与优化",
    "7. 数据预处理技术",
    "8. 模型评估与验证",
    "9. 行业应用趋势分析",
    "10. 未来发展方向讨论"
  ],
  key_slides: [
    "机器学习概念图",
    "三大学习类型对比",
    "神经网络架构图",
    "应用领域分布图",
    "技术发展时间线"
  ]
};

export async function POST(req: NextRequest) {
  try {
    const request: DrillDownRequest = await req.json();
    
    if (request.main_line_index === undefined || !request.transcript) {
      return NextResponse.json(
        { error: 'main_line_index and transcript are required' },
        { status: 400 }
      );
    }

  // 检查是否有 DeepSeek API Key
  if (!process.env.DEEPSEEK_API_KEY) {
    console.log('No DeepSeek API key found, using mock data');
    return NextResponse.json(mockDrillDownResponse);
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
