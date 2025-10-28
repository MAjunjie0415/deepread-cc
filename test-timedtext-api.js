/**
 * 测试 YouTube TimedText API
 * 使用 Kimi 验证成功的方法
 */

const videoId = '7xTGNNLPyMI';

async function fetchYouTubeTimedText() {
  console.log('\n' + '='.repeat(60));
  console.log('🎯 测试 YouTube TimedText API (Kimi 方法)');
  console.log('📹 视频 ID:', videoId);
  console.log('='.repeat(60) + '\n');

  const allSegments = [];
  let pageCount = 0;
  let nextStart = 0;
  const maxPages = 50;

  // 尝试多种语言
  const languages = ['en', 'en-US', 'en-GB'];
  
  for (const lang of languages) {
    console.log(`🔄 尝试语言: ${lang}\n`);
    
    try {
      allSegments.length = 0;
      pageCount = 0;
      nextStart = 0;

      while (pageCount < maxPages) {
        pageCount++;
        
        const url = nextStart === 0
          ? `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`
          : `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3&start=${nextStart}`;
        
        console.log(`📄 第 ${pageCount} 页...`);

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Referer': `https://www.youtube.com/watch?v=${videoId}`
          }
        });

        if (!response.ok) {
          console.log(`   ❌ HTTP ${response.status}\n`);
          if (response.status === 404) {
            console.log(`⚠️  语言 ${lang} 没有字幕\n`);
            break;
          }
          throw new Error(`HTTP ${response.status}`);
        }

        const text = await response.text();
        
        if (!text || text.trim().length === 0) {
          console.log(`   ✓ 空响应，翻页结束\n`);
          break;
        }

        const data = JSON.parse(text);
        const events = data.events || [];
        
        if (events.length === 0) {
          console.log(`   ✓ 无内容，翻页结束\n`);
          break;
        }

        let segmentsInPage = 0;
        for (const event of events) {
          if (event.segs) {
            const text = event.segs.map(seg => seg.utf8 || '').join('');
            if (text.trim()) {
              allSegments.push({
                text: text.trim(),
                start: event.tStartMs / 1000,
                duration: (event.dDurationMs || 0) / 1000
              });
              segmentsInPage++;
              nextStart = event.tStartMs / 1000 + 0.01;
            }
          }
        }

        console.log(`   ✓ 获取 ${segmentsInPage} 段\n`);

        if (segmentsInPage < 10) {
          console.log(`   ✓ 段落数少，可能已到末尾\n`);
          break;
        }
      }

      if (allSegments.length > 0) {
        const lastSegment = allSegments[allSegments.length - 1];
        const totalMinutes = Math.floor(lastSegment.start / 60);
        const totalSeconds = Math.floor(lastSegment.start % 60);
        const totalWords = allSegments.reduce((sum, seg) => 
          sum + seg.text.split(/\s+/).length, 0
        );

        console.log('='.repeat(60));
        console.log('✅ 成功获取完整字幕！');
        console.log('='.repeat(60));
        console.log(`   语言: ${lang}`);
        console.log(`   总页数: ${pageCount}`);
        console.log(`   总段数: ${allSegments.length}`);
        console.log(`   时长: ${totalMinutes}:${String(totalSeconds).padStart(2, '0')}`);
        console.log(`   总字数: ${totalWords}`);
        console.log('='.repeat(60) + '\n');

        // 显示前 10 段
        console.log('📄 前 10 段预览:\n');
        allSegments.slice(0, 10).forEach((seg, i) => {
          const mins = Math.floor(seg.start / 60);
          const secs = Math.floor(seg.start % 60);
          const time = `${mins}:${String(secs).padStart(2, '0')}`;
          console.log(`${String(i + 1).padStart(3, ' ')}. [${time}] ${seg.text}`);
        });

        // 显示最后 10 段
        console.log('\n📄 最后 10 段预览:\n');
        allSegments.slice(-10).forEach((seg, i) => {
          const mins = Math.floor(seg.start / 60);
          const secs = Math.floor(seg.start % 60);
          const time = `${mins}:${String(secs).padStart(2, '0')}`;
          const index = allSegments.length - 10 + i + 1;
          console.log(`${String(index).padStart(3, ' ')}. [${time}] ${seg.text}`);
        });

        console.log('\n' + '='.repeat(60));
        console.log('✅ 测试成功！方法验证通过！');
        console.log('='.repeat(60) + '\n');

        return allSegments;
      }

    } catch (error) {
      console.error(`❌ 语言 ${lang} 失败:`, error.message, '\n');
      continue;
    }
  }

  throw new Error('所有语言都失败');
}

// 运行测试
fetchYouTubeTimedText()
  .then(() => {
    console.log('🎉 完成！');
  })
  .catch(error => {
    console.error('💥 测试失败:', error.message);
  });

