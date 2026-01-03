import { redis } from './src/config/redis.js';
import { SessionService } from './src/services/session.service.js';

async function testSessionCreation() {
  try {
    console.log('🚀 Testing session creation...');
    
    // Initialize Redis connection
    await redis.initialize();
    
    // Clear existing active sessions to start fresh
    const redisClient = redis.getClient();
    await redisClient.del('filter:sessions:active');
    console.log('🗑️  Cleared existing active sessions');
    
    // Verify it's empty
    let activeSessions = await redisClient.hgetall('filter:sessions:active');
    console.log('📊 Active sessions before creation:', Object.keys(activeSessions).length, 'entries');
    
    // Create a test session (simulating login)
    const sessionId = await SessionService.createSession({
      userId: 'test_user_login_123',
      email: 'logintest@example.com',
      name: 'Login Test User',
      ip: '192.168.1.55',
      userAgent: 'Test Login Browser/2.0',
    });
    
    console.log('✅ Session created with ID:', sessionId);
    
    // Check if active sessions was populated
    activeSessions = await redisClient.hgetall('filter:sessions:active');
    console.log('📊 Active sessions after creation:', Object.keys(activeSessions).length, 'entries');
    
    for (const [sid, data] of Object.entries(activeSessions)) {
      console.log(`  📋 ${sid}: ${data}`);
    }
    
    // Verify our session is there
    if (activeSessions[sessionId]) {
      console.log('✅ SUCCESS: Session found in active sessions!');
      const sessionData = JSON.parse(activeSessions[sessionId]);
      console.log('   📄 Session data:', sessionData);
    } else {
      console.log('❌ FAILURE: Session NOT found in active sessions');
    }
    
    // Also check the full session data
    const fullSessionData = await SessionService.getSession(sessionId);
    console.log('📋 Full session data from SessionService:');
    console.log(JSON.stringify(fullSessionData, null, 2));
    
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await redis.close();
    console.log('🔌 Redis connection closed');
  }
}

testSessionCreation();