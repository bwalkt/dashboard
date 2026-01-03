import { redis } from './dist/config/redis.js';
import { ChallengeService } from './dist/services/challenge.service.js';

async function testGridChallenges() {
  try {
    console.log('🚀 Testing grid-based challenge system...');
    
    // Initialize Redis connection
    await redis.initialize();
    
    const testUserId = '019b824c-d634-7de6-bee3-c0ccd6e45873'; // Real UUID from database
    
    // Clear existing challenges for test user
    await ChallengeService.clearUserChallenges(testUserId);
    console.log('🗑️  Cleared existing challenges for test user');
    
    // Test: Create grid-based challenges for user
    console.log('\n📝 Test: Creating grid-based challenges...');
    console.log('Testing with real user UUID and database grid data');
    
    const challenges = await ChallengeService.createChallenges({
      userId: testUserId,
      count: 3 // Create 3 challenges
    });
    
    console.log(`✅ Created ${challenges.length} grid-based challenges`);
    challenges.forEach((c, i) => {
      console.log(`\n  ${i + 1}. ID: ${c.id}`);
      console.log(`     Function: ${c.func}`);
      console.log(`     Answer: ${c.answer}`);
      console.log(`     Created at: ${new Date(c.c_at).toISOString()}`);
    });
    
    // Test Redis structure
    console.log('\n📝 Test: Checking Redis structure for grid challenges...');
    const redisClient = redis.getClient();
    const keys = await redisClient.keys(`next_funcs:${testUserId}:*`);
    console.log(`Found ${keys.length} keys in Redis for grid challenges`);
    
    // Get next challenge and verify it's a grid-based function
    console.log('\n📝 Test: Getting next grid challenge...');
    const nextChallenge = await ChallengeService.getNextChallenge(testUserId);
    if (nextChallenge) {
      console.log('✅ Next grid challenge:');
      console.log('   ID:', nextChallenge.id);
      console.log('   Function:', nextChallenge.func);
      console.log('   Answer:', nextChallenge.answer);
      
      // Check if it's a complex function (not simple math)
      const isComplexFunction = nextChallenge.func.includes('(') || 
                               nextChallenge.func.includes('[') ||
                               nextChallenge.func.length > 20;
      console.log('   Is Complex Function:', isComplexFunction ? 'Yes' : 'No (fallback)');
    }
    
    console.log('\n✅ Grid challenge tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  } finally {
    await redis.close();
    console.log('🔌 Redis connection closed');
  }
}

testGridChallenges();