// Test script cho Chatbot API
// Chạy: node test-chatbot-api.js

const testChatbot = async () => {
    try {
        console.log('🤖 Testing Chatbot API...\n');

        const testMessages = [
            'Xin chào',
            'Tìm sách văn học',
            'Khuyến mãi hôm nay',
            'Chính sách đổi trả',
        ];

        for (const message of testMessages) {
            console.log(`📤 User: ${message}`);
            
            const response = await fetch('http://localhost:5000/api/chatbot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log(`🤖 Bot (${data.mode}): ${data.response}\n`);
            
            // Delay giữa các request
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log('✅ Test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('\n💡 Đảm bảo backend đang chạy: cd backend && npm start');
    }
};

testChatbot();
