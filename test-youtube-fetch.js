// 测试脚本：验证能否获取 YouTube 字幕
const https = require('https');

const videoId = '7xTGNNLPyMI';

console.log('🎬 测试视频:', videoId);
console.log('🔗 URL: https://www.youtube.com/watch?v=' + videoId);
console.log('\n' + '='.repeat(60));

// 方法1: 不指定语言，让 YouTube 返回默认字幕
console.log('\n📝 方法1: 不指定语言（自动选择）');
const url1 = `https://www.youtube.com/api/timedtext?v=${videoId}&fmt=json3`;
console.log('URL:', url1);

https.get(url1, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json',
  }
}, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      try {
        const json = JSON.parse(data);
        if (json.events && json.events.length > 0) {
          const segments = json.events.filter(e => e.segs && e.segs.length > 0);
          console.log(`✅ 成功！获取到 ${segments.length} 段字幕`);
          console.log('\n前3段内容：');
          segments.slice(0, 3).forEach((event, i) => {
            const text = event.segs.map(s => s.utf8 || '').join('').trim();
            const time = (event.tStartMs / 1000).toFixed(2);
            console.log(`  ${i + 1}. [${time}s] ${text}`);
          });
        } else {
          console.log('❌ 响应中没有字幕数据');
        }
      } catch (e) {
        console.log('❌ JSON 解析失败:', e.message);
        console.log('响应内容:', data.substring(0, 200));
      }
    } else {
      console.log(`❌ HTTP ${res.statusCode}`);
      console.log('响应:', data.substring(0, 200));
    }
    
    // 方法2: 明确指定英文
    console.log('\n' + '='.repeat(60));
    console.log('\n📝 方法2: 明确指定英文 (lang=en)');
    const url2 = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`;
    console.log('URL:', url2);
    
    https.get(url2, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      }
    }, (res2) => {
      let data2 = '';
      
      res2.on('data', (chunk) => {
        data2 += chunk;
      });
      
      res2.on('end', () => {
        if (res2.statusCode === 200) {
          try {
            const json = JSON.parse(data2);
            if (json.events && json.events.length > 0) {
              const segments = json.events.filter(e => e.segs && e.segs.length > 0);
              console.log(`✅ 成功！获取到 ${segments.length} 段字幕`);
              console.log('\n前3段内容：');
              segments.slice(0, 3).forEach((event, i) => {
                const text = event.segs.map(s => s.utf8 || '').join('').trim();
                const time = (event.tStartMs / 1000).toFixed(2);
                console.log(`  ${i + 1}. [${time}s] ${text}`);
              });
            } else {
              console.log('❌ 响应中没有字幕数据');
            }
          } catch (e) {
            console.log('❌ JSON 解析失败:', e.message);
            console.log('响应内容:', data2.substring(0, 200));
          }
        } else {
          console.log(`❌ HTTP ${res2.statusCode}`);
          console.log('响应:', data2.substring(0, 200));
        }
        
        // 方法3: 使用 youtube-transcript 库
        console.log('\n' + '='.repeat(60));
        console.log('\n📝 方法3: youtube-transcript 库');
        
        (async () => {
          try {
            const { YoutubeTranscript } = require('youtube-transcript');
            const transcript = await YoutubeTranscript.fetchTranscript(videoId);
            console.log(`✅ 成功！获取到 ${transcript.length} 段字幕`);
            console.log('\n前3段内容：');
            transcript.slice(0, 3).forEach((item, i) => {
              const time = (item.offset / 1000).toFixed(2);
              console.log(`  ${i + 1}. [${time}s] ${item.text}`);
            });
            console.log('\n' + '='.repeat(60));
            console.log('✅ 测试完成！');
          } catch (error) {
            console.log('❌ 库方法失败:', error.message);
            console.log('\n' + '='.repeat(60));
            console.log('❌ 所有方法都失败了');
          }
        })();
      });
    }).on('error', (e) => {
      console.log('❌ 请求失败:', e.message);
    });
  });
}).on('error', (e) => {
  console.log('❌ 请求失败:', e.message);
});

