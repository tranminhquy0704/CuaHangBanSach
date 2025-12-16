require('dotenv').config();
const mysql = require('mysql2');

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'shopbansach',
});

db.connect((err) => {
  if (err) {
    console.error('❌ Database connection error:', err);
    process.exit(1);
  }
  
  console.log('✅ Connected to database:', process.env.DB_NAME || 'shopbansach');
  
  // Check if chat tables exist
  const checkTables = `
    SELECT TABLE_NAME 
    FROM information_schema.tables 
    WHERE table_schema = ? 
    AND TABLE_NAME IN ('conversations', 'chat_messages')
  `;
  
  db.query(checkTables, [process.env.DB_NAME || 'shopbansach'], (err, rows) => {
    if (err) {
      console.error('❌ Error checking tables:', err);
      db.end();
      return;
    }
    
    console.log('\n📊 Chat Tables Status:');
    const foundTables = rows.map(r => r.TABLE_NAME);
    console.log('Found tables:', foundTables);
    
    if (!foundTables.includes('conversations')) {
      console.log('⚠️  Table "conversations" NOT FOUND');
    } else {
      console.log('✅ Table "conversations" exists');
    }
    
    if (!foundTables.includes('chat_messages')) {
      console.log('⚠️  Table "chat_messages" NOT FOUND');
    } else {
      console.log('✅ Table "chat_messages" exists');
    }
    
    // Count records
    if (foundTables.includes('conversations')) {
      db.query('SELECT COUNT(*) as count FROM conversations', (err, rows) => {
        if (!err) {
          console.log(`📝 Conversations count: ${rows[0].count}`);
        }
        
        if (foundTables.includes('chat_messages')) {
          db.query('SELECT COUNT(*) as count FROM chat_messages', (err, rows) => {
            if (!err) {
              console.log(`💬 Chat messages count: ${rows[0].count}`);
            }
            
            // Check OpenAI config
            console.log('\n🔑 OpenAI Configuration:');
            console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Set (length: ' + process.env.OPENAI_API_KEY.length + ')' : '❌ Not set');
            console.log('OPENAI_MODEL:', process.env.OPENAI_MODEL || 'gpt-3.5-turbo (default)');
            console.log('OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? '✅ Set' : '❌ Not set');
            
            db.end();
            console.log('\n✅ Test completed!');
          });
        } else {
          db.end();
          console.log('\n⚠️  Test completed with warnings!');
        }
      });
    } else {
      db.end();
      console.log('\n⚠️  Test completed with warnings!');
    }
  });
});
