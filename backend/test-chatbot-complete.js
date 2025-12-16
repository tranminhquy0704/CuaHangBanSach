const fetch = require('node-fetch');

async function testChatbot() {
  console.log('🧪 Testing Chatbot API...\n');
  
  try {
    // Test 1: Simple message without session
    console.log('📝 Test 1: Simple message');
    const response1 = await fetch('http://localhost:5000/api/chatbot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Xin chào, bạn có sách gì hay không?'
      })
    });
    
    const data1 = await response1.json();
    console.log('Status:', response1.status);
    console.log('Response:', JSON.stringify(data1, null, 2));
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Test 2: Create session and send message
    console.log('📝 Test 2: Create session');
    const sessionResponse = await fetch('http://localhost:5000/chat/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });
    
    const sessionData = await sessionResponse.json();
    console.log('Session created:', sessionData);
    
    if (sessionData.sessionId) {
      console.log('\n📝 Test 3: Send message with session');
      const response2 = await fetch('http://localhost:5000/api/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Tôi muốn tìm sách về lập trình',
          sessionId: sessionData.sessionId
        })
      });
      
      const data2 = await response2.json();
      console.log('Status:', response2.status);
      console.log('Response:', JSON.stringify(data2, null, 2));
      
      // Test 4: Get conversation history
      console.log('\n📝 Test 4: Get conversation history');
      const historyResponse = await fetch(`http://localhost:5000/chat/${sessionData.sessionId}`);
      const historyData = await historyResponse.json();
      console.log('History:', JSON.stringify(historyData, null, 2));
    }
    
    console.log('\n✅ All tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testChatbot();
