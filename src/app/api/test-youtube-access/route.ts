import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const testResults: any = {
    timestamp: new Date().toISOString(),
    tests: []
  };

  // 测试1: 能否访问 YouTube 主页
  try {
    console.log('测试1: 访问 YouTube 主页...');
    const response1 = await fetch('https://www.youtube.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(10000)
    });
    testResults.tests.push({
      name: 'YouTube 主页',
      status: response1.status,
      ok: response1.ok,
      contentType: response1.headers.get('content-type'),
      bodyLength: (await response1.text()).length
    });
  } catch (error: any) {
    testResults.tests.push({
      name: 'YouTube 主页',
      error: error.message
    });
  }

  // 测试2: 能否访问特定视频页面
  try {
    console.log('测试2: 访问视频页面...');
    const response2 = await fetch('https://www.youtube.com/watch?v=7xTGNNLPyMI', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(10000)
    });
    const body = await response2.text();
    testResults.tests.push({
      name: '视频页面',
      status: response2.status,
      ok: response2.ok,
      contentType: response2.headers.get('content-type'),
      bodyLength: body.length,
      hasCaptions: body.includes('"captions":'),
      hasPlayerResponse: body.includes('ytInitialPlayerResponse')
    });
  } catch (error: any) {
    testResults.tests.push({
      name: '视频页面',
      error: error.message
    });
  }

  // 测试3: 能否访问 timedtext API
  try {
    console.log('测试3: 访问 timedtext API...');
    const response3 = await fetch('https://www.youtube.com/api/timedtext?v=7xTGNNLPyMI&fmt=json3', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(10000)
    });
    const body = await response3.text();
    testResults.tests.push({
      name: 'timedtext API',
      status: response3.status,
      ok: response3.ok,
      contentType: response3.headers.get('content-type'),
      bodyLength: body.length,
      bodyPreview: body.substring(0, 200)
    });
  } catch (error: any) {
    testResults.tests.push({
      name: 'timedtext API',
      error: error.message
    });
  }

  return NextResponse.json(testResults);
}

