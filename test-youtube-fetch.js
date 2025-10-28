/**
 * 测试 YouTube 字幕抓取
 * 视频: https://www.youtube.com/watch?v=7xTGNNLPyMI
 */

const videoId = '7xTGNNLPyMI';

async function testYouTubeInnerTubeAPI() {
  console.log('\n='.repeat(60));
  console.log('🎯 测试 YouTube InnerTube API');
  console.log('='.repeat(60));
  
  const url = 'https://www.youtube.com/youtubei/v1/get_transcript?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
  
  const body = {
    context: {
      client: {
        clientName: 'WEB',
        clientVersion: '2.20240304.00.00'
      }
    },
    params: Buffer.from(`\n\x0b${videoId}`).toString('base64')
  };
  
  console.log('📡 请求 URL:', url);
  console.log('📦 请求参数:', JSON.stringify(body, null, 2));
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify(body)
    });
    
    console.log('📊 响应状态:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 错误响应:', errorText.substring(0, 500));
      return null;
    }
    
    const data = await response.json();
    console.log('✅ 成功获取数据');
    
    // 解析字幕
    if (data.actions && data.actions[0]?.updateEngagementPanelAction) {
      const content = data.actions[0].updateEngagementPanelAction.content;
      const transcriptRenderer = content?.transcriptRenderer?.content?.transcriptSearchPanelRenderer;
      
      if (transcriptRenderer?.body?.transcriptSegmentListRenderer?.initialSegments) {
        const segments = transcriptRenderer.body.transcriptSegmentListRenderer.initialSegments;
        const transcript = segments.map((seg) => {
          const snippet = seg.transcriptSegmentRenderer?.snippet?.runs?.[0]?.text || '';
          const startMs = parseInt(seg.transcriptSegmentRenderer?.startMs || '0');
          const endMs = parseInt(seg.transcriptSegmentRenderer?.endMs || '0');
          
          return {
            text: snippet,
            start: startMs / 1000,
            duration: (endMs - startMs) / 1000
          };
        }).filter((seg) => seg.text.length > 0);
        
        console.log('\n' + '='.repeat(60));
        console.log('📝 字幕统计:');
        console.log('   总段落数:', transcript.length);
        console.log('   总时长:', Math.floor(transcript[transcript.length - 1].start / 60), '分钟');
        console.log('   总字数:', transcript.reduce((sum, seg) => sum + seg.text.split(/\s+/).length, 0));
        console.log('='.repeat(60));
        
        console.log('\n📄 前 10 段字幕预览:');
        transcript.slice(0, 10).forEach((seg, i) => {
          const time = `${Math.floor(seg.start / 60)}:${String(Math.floor(seg.start % 60)).padStart(2, '0')}`;
          console.log(`${i + 1}. [${time}] ${seg.text}`);
        });
        
        console.log('\n📄 最后 5 段字幕预览:');
        transcript.slice(-5).forEach((seg, i) => {
          const time = `${Math.floor(seg.start / 60)}:${String(Math.floor(seg.start % 60)).padStart(2, '0')}`;
          console.log(`${transcript.length - 5 + i + 1}. [${time}] ${seg.text}`);
        });
        
        return transcript;
      }
    }
    
    console.error('❌ 响应格式不符合预期');
    console.log('响应结构:', JSON.stringify(data, null, 2).substring(0, 1000));
    return null;
    
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    return null;
  }
}

// 运行测试
testYouTubeInnerTubeAPI().then(transcript => {
  if (transcript) {
    console.log('\n✅ 测试成功！');
  } else {
    console.log('\n❌ 测试失败！');
  }
});
