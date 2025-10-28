import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// 深挖系统提示词
const DRILL_DOWN_PROMPT_ZH = `你是一个专业的内容深挖分析师。你的任务是对特定的主线内容进行深度挖掘，生成长文和教学提纲。

## 深挖要求

### 1. 长文生成
- 基于主线内容生成长篇深度文章（2000-3000字）
- 结构清晰：引言、核心概念、详细分析、实践指导、未来展望、结论
- 包含具体的证据引用和时间戳
- 语言流畅，逻辑严密

### 2. 教学提纲
- 生成10-15个教学要点
- 按逻辑顺序排列
- 适合教学和培训使用

### 3. 关键幻灯片
- 提供5-8个关键幻灯片主题
- 适合PPT制作和演示

请严格按照JSON格式输出，确保内容质量和实用性。`;

const DRILL_DOWN_PROMPT_EN = `You are a professional content drill-down analyst. Your task is to perform deep mining on specific main line content and generate long-form articles and teaching outlines.

## Drill Down Requirements

### 1. Long-form Article Generation
- Generate long-form in-depth articles (2000-3000 words) based on main line content
- Clear structure: introduction, core concepts, detailed analysis, practical guidance, future prospects, conclusion
- Include specific evidence citations and timestamps
- Fluent language and rigorous logic

### 2. Teaching Outline
- Generate 10-15 teaching points
- Arranged in logical order
- Suitable for teaching and training

### 3. Key Slides
- Provide 5-8 key slide topics
- Suitable for PPT creation and presentation

Please output strictly in JSON format, ensuring content quality and practicality.`;

// 模拟数据用于本地测试
const mockDrillDownResponse = {
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

function buildDrillDownPrompt(request: any): string {
  const { main_line_index, transcript, lang } = request;
  
  let prompt = lang === 'en' ? DRILL_DOWN_PROMPT_EN : DRILL_DOWN_PROMPT_ZH;
  
  prompt += `\n\n## 主线索引\n${main_line_index}\n\n`;
  prompt += `## 字幕内容\n`;
  transcript.forEach((segment: any) => {
    prompt += `[${segment.timestamp}] ${segment.text}\n`;
  });
  
  prompt += `\n请针对索引为 ${main_line_index} 的主线进行深度挖掘，按照要求的JSON格式输出深挖结果。`;
  
  return prompt;
}

export async function POST(req: NextRequest) {
  try {
    const request = await req.json();

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
      return NextResponse.json(mockDrillDownResponse);
    }

  } catch (error) {
    console.error('Drill down API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}