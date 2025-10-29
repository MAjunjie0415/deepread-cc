import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const videoId = searchParams.get('v') || 'RNJCfff1dPY';

  const results: any = {
    videoId,
    tests: [],
    timestamp: new Date().toISOString(),
  };

  // 测试 1: timedtext API
  try {
    const url1 = `https://www.youtube.com/api/timedtext?v=${videoId}&fmt=json3`;
    const start1 = Date.now();
    const response1 = await fetch(url1, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });
    const time1 = Date.now() - start1;

    results.tests.push({
      name: 'timedtext API (无语言)',
      url: url1,
      status: response1.status,
      statusText: response1.statusText,
      time: `${time1}ms`,
      headers: Object.fromEntries(response1.headers.entries()),
      bodyPreview: response1.ok ? (await response1.text()).substring(0, 200) : 'N/A',
    });
  } catch (e: any) {
    results.tests.push({
      name: 'timedtext API (无语言)',
      error: e.message,
    });
  }

  // 测试 2: timedtext API with lang=en
  try {
    const url2 = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`;
    const start2 = Date.now();
    const response2 = await fetch(url2, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });
    const time2 = Date.now() - start2;

    results.tests.push({
      name: 'timedtext API (lang=en)',
      url: url2,
      status: response2.status,
      statusText: response2.statusText,
      time: `${time2}ms`,
      bodyPreview: response2.ok ? (await response2.text()).substring(0, 200) : 'N/A',
    });
  } catch (e: any) {
    results.tests.push({
      name: 'timedtext API (lang=en)',
      error: e.message,
    });
  }

  // 测试 3: 页面请求
  try {
    const url3 = `https://www.youtube.com/watch?v=${videoId}`;
    const start3 = Date.now();
    const response3 = await fetch(url3, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });
    const time3 = Date.now() - start3;

    const html = await response3.text();
    const hasPlayerResponse = html.includes('ytInitialPlayerResponse');
    const hasCaptions = html.includes('captionTracks');

    results.tests.push({
      name: '视频页面',
      url: url3,
      status: response3.status,
      statusText: response3.statusText,
      time: `${time3}ms`,
      htmlLength: html.length,
      hasPlayerResponse,
      hasCaptions,
      htmlPreview: html.substring(0, 500),
    });
  } catch (e: any) {
    results.tests.push({
      name: '视频页面',
      error: e.message,
    });
  }

  return NextResponse.json(results, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
