const fetch = require('node-fetch');

async function testDetailedChatbot() {
  console.log('🧪 Testing Chatbot với nhiều câu hỏi...\n');
  
  const questions = [
    'Xin chào',
    'Có sách về lập trình không?',
    'Sách nào bán chạy nhất?',
    'Có khuyến mãi gì không?',
    'Cho tôi xem sách giảm giá',
    'Thông tin liên hệ',
    'Chính sách đổi trả như thế nào?'
  ];
  
  try {
    // Create session first
    const sessionResponse = await fetch('http://localhost:5000/chat/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    const sessionData = await sessionResponse.json();
    console.log('✅ Session created:', sessionData.sessionId, '\n');
    console.log('='.repeat(70) + '\n');
    
    // Ask questions
    for (const question of questions) {
      console.log(`❓ Câu hỏi: "${question}"`);
      
      const response = await fetch('http://localhost:5000/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: question,
          sessionId: sessionData.sessionId
        })
      });
      
      const data = await response.json();
      console.log(`\n💬 Trả lời (${data.mode}):`);
      console.log(data.response);
      console.log('\n' + '='.repeat(70) + '\n');
      
      // Wait a bit between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Check conversation history
    console.log('📝 Checking conversation history...\n');
    const historyResponse = await fetch(`http://localhost:5000/chat/${sessionData.sessionId}`);
    const historyData = await historyResponse.json();
    console.log(`Số tin nhắn trong database: ${historyData.messages.length}`);
    
    if (historyData.messages.length > 0) {
      console.log('\n✅ Lịch sử cuộc trò chuyện:');
      historyData.messages.forEach((msg, idx) => {
        console.log(`  ${idx + 1}. [${msg.role}]: ${msg.content.substring(0, 50)}...`);
      });
    } else {
      console.log('\n⚠️  Chưa có tin nhắn nào được lưu vào database');
    }
    
    console.log('\n✅ Test hoàn tất!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDetailedChatbot();
