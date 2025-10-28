import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    // 模拟成功响应
    return NextResponse.json({
      success: true,
      video_id: 'test123',
      transcript: [
        {
          segment_id: 'seg_0000',
          start: 0,
          end: 5,
          timestamp: '0:00',
          text: 'This is a test transcript for deployment verification.'
        }
      ],
      meta: {
        word_count: 10,
        segment_count: 1,
        duration_seconds: 5,
        duration_formatted: '0:05',
        timestamps_present: true,
        source: 'mock_deployment_test'
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误，请稍后重试' },
      { status: 500 }
    );
  }
}