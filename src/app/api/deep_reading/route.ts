import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const request = await req.json();

    if (!request.transcript) {
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      );
    }

    // 模拟深度分析响应
    return NextResponse.json({
      meta: {
        word_count: 10,
        paragraph_count: 1,
        timestamps_present: true
      },
      main_lines: [
        {
          id: 1,
          title: "测试主线",
          definition: "这是一个测试主线，用于验证部署是否成功",
          key_points: [
            {
              point: "部署测试成功",
              evidence: {
                segment_id: "seg_0000",
                timestamp: "0:00",
                quote: "This is a test transcript",
                evidence_found: true
              }
            }
          ],
          score: {
            total: 85.0,
            breakdown: {
              relevance: 90,
              novelty: 80,
              actionability: 85,
              credibility: 85
            }
          },
          unsupported: []
        }
      ],
      top_segments: [
        {
          segment_id: "seg_0000",
          start: 0,
          end: 5,
          reason_to_review: "测试段落的推荐理由"
        }
      ],
      flashcards: [
        {
          q: "部署测试是否成功？",
          a: "是的，部署测试成功",
          source_segment: "seg_0000"
        }
      ],
      followup_questions: [
        "如何进一步优化应用？",
        "下一步应该添加什么功能？"
      ],
      human_note: "# 部署测试笔记\n\n## 测试结果\n- ✅ 部署成功\n- ✅ API 调用正常\n- ✅ 前端渲染正常\n\n## 下一步\n- 配置真实的 DeepSeek API Key\n- 测试真实的 YouTube 字幕拉取"
    });

  } catch (error) {
    console.error('Deep reading API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}