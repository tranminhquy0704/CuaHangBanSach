require('dotenv').config();
const fetch = require('node-fetch');

async function testChatbot() {
  console.log('🧪 Testing Chatbot with OpenRouter...\n');
  
  // Test 1: Simple greeting
  console.log('Test 1: Chào hỏi');
  console.log('================');
  await testMessage('xin chào');
  
  console.log('\n---\n');
  
  // Test 2: Ask about books
  console.log('Test 2: Hỏi về sách');
  console.log('================');
  await testMessage('có sách thể loại gì');
  
  console.log('\n---\n');
  
  // Test 3: Ask about policy
  console.log('Test 3: Hỏi chính sách');
  console.log('================');
  await testMessage('shop có ship miễn phí không');
}

async function testMessage(message) {
  try {
    console.log(`📤 Câu hỏi: "${message}"`);
    
    const startTime = Date.now();
    
    const response = await fetch('http://localhost:5000/api/chatbot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        conversationHistory: []
      })
    });
    
    const data = await response.json();
    const endTime = Date.now();
    
    console.log(`⏱️  Thời gian: ${endTime - startTime}ms`);
    console.log(`📥 Trả lời (${data.mode || 'unknown'} mode):`);
    console.log(data.response);
    
    if (data.error) {
      console.log('❌ Error:', data.error);
    }
    
    return data;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return null;
  }
}

// Check environment
console.log('🔧 Environment Check:');
console.log('- OpenRouter API Key:', process.env.OPENROUTER_API_KEY ? '✅ Configured' : '❌ Missing');
console.log('- OpenRouter Model:', process.env.OPENROUTER_MODEL || 'Default (gpt-4o-mini)');
console.log('- OpenAI API Key:', process.env.OPENAI_API_KEY ? '✅ Configured' : '⚠️  Not set');
console.log('\n');

// Run tests
testChatbot().then(() => {
  console.log('\n✅ Tests completed!');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Tests failed:', err);
  process.exit(1);
});
