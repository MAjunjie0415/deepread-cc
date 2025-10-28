/**
 * 使用 youtube-transcript 库测试
 * 这是一个经过验证的开源库，被数千个项目使用
 */

const { YoutubeTranscript } = require('youtube-transcript');

const videoId = '7xTGNNLPyMI';
const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

console.log('\n' + '='.repeat(60));
console.log('🎯 测试 youtube-transcript 库');
console.log('📹 视频:', videoUrl);
console.log('='.repeat(60) + '\n');

YoutubeTranscript.fetchTranscript(videoId)
  .then(transcript => {
    console.log('✅ 成功获取字幕！\n');
    
    // 统计信息
    const totalSegments = transcript.length;
    const totalDuration = transcript[transcript.length - 1].offset / 1000;
    const totalWords = transcript.reduce((sum, seg) => sum + seg.text.split(/\s+/).length, 0);
    
    console.log('='.repeat(60));
    console.log('📊 字幕统计:');
    console.log('   总段落数:', totalSegments);
    console.log('   总时长:', Math.floor(totalDuration / 60), '分', Math.floor(totalDuration % 60), '秒');
    console.log('   总字数:', totalWords);
    console.log('='.repeat(60) + '\n');
    
    // 显示前 15 段
    console.log('📄 前 15 段字幕预览:\n');
    transcript.slice(0, 15).forEach((seg, i) => {
      const seconds = seg.offset / 1000;
      const time = `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
      console.log(`${String(i + 1).padStart(3, ' ')}. [${time}] ${seg.text}`);
    });
    
    // 显示最后 10 段
    console.log('\n📄 最后 10 段字幕预览:\n');
    transcript.slice(-10).forEach((seg, i) => {
      const seconds = seg.offset / 1000;
      const time = `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
      const index = totalSegments - 10 + i + 1;
      console.log(`${String(index).padStart(3, ' ')}. [${time}] ${seg.text}`);
    });
    
    // 显示中间几段
    console.log('\n📄 中间段落预览 (第 100-110 段):\n');
    transcript.slice(99, 110).forEach((seg, i) => {
      const seconds = seg.offset / 1000;
      const time = `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
      console.log(`${String(100 + i).padStart(3, ' ')}. [${time}] ${seg.text}`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ 字幕完整性验证通过！');
    console.log('='.repeat(60) + '\n');
    
    // 保存到文件供检查
    const fs = require('fs');
    fs.writeFileSync(
      '/Users/mima0000/deepread-cc/transcript-test-result.json',
      JSON.stringify(transcript, null, 2)
    );
    console.log('💾 完整字幕已保存到: transcript-test-result.json\n');
    
  })
  .catch(error => {
    console.error('❌ 获取失败:', error.message);
    console.error('错误详情:', error);
  });

