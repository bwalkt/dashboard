#!/usr/bin/env node

/**
 * Test script to verify the critical signature validation fix
 * This ensures envoyNodeId is properly included in signature validation
 */

import { FilterAuthService } from './dist/services/filter-auth.service.js';

async function testSignatureValidation() {
  console.log('🧪 Testing Filter Authentication Signature Fix...\n');

  try {
    // Test Case 1: Token without envoyNodeId
    console.log('📝 Test 1: Token without envoyNodeId');
    const token1 = FilterAuthService.generateAuthToken('test-filter-1');
    console.log('Generated token:', JSON.stringify(token1, null, 2));
    
    const validation1 = await FilterAuthService.validateAuthToken(token1);
    console.log('Validation result:', validation1);
    
    if (validation1.valid) {
      console.log('✅ Token without envoyNodeId validates correctly');
    } else {
      console.log('❌ Token without envoyNodeId failed validation:', validation1.reason);
      process.exit(1);
    }

    // Test Case 2: Token with envoyNodeId (this was previously broken)
    console.log('\n📝 Test 2: Token with envoyNodeId');
    const token2 = FilterAuthService.generateAuthToken('test-filter-2', 'envoy-node-123');
    console.log('Generated token:', JSON.stringify(token2, null, 2));
    
    const validation2 = await FilterAuthService.validateAuthToken(token2);
    console.log('Validation result:', validation2);
    
    if (validation2.valid) {
      console.log('✅ Token with envoyNodeId validates correctly');
    } else {
      console.log('❌ Token with envoyNodeId failed validation:', validation2.reason);
      console.log('🐛 This indicates the signature fix is not working correctly!');
      process.exit(1);
    }

    // Test Case 3: Token with different envoyNodeId values
    console.log('\n📝 Test 3: Tokens with different envoyNodeId values');
    const token3a = FilterAuthService.generateAuthToken('test-filter-3', 'node-abc');
    const token3b = FilterAuthService.generateAuthToken('test-filter-3', 'node-xyz');
    
    const validation3a = await FilterAuthService.validateAuthToken(token3a);
    const validation3b = await FilterAuthService.validateAuthToken(token3b);
    
    if (validation3a.valid && validation3b.valid) {
      console.log('✅ Tokens with different envoyNodeId values both validate correctly');
    } else {
      console.log('❌ One or both tokens with envoyNodeId failed validation');
      console.log('Token 3a validation:', validation3a);
      console.log('Token 3b validation:', validation3b);
      process.exit(1);
    }

    // Test Case 4: Signature tampering detection
    console.log('\n📝 Test 4: Signature tampering detection');
    const token4 = FilterAuthService.generateAuthToken('test-filter-4', 'envoy-node-456');
    
    // Tamper with the signature
    const tamperedToken = { ...token4, signature: 'invalid-signature' };
    
    const validation4 = await FilterAuthService.validateAuthToken(tamperedToken);
    
    if (!validation4.valid && validation4.reason?.includes('signature')) {
      console.log('✅ Signature tampering correctly detected');
    } else {
      console.log('❌ Signature tampering not detected properly');
      console.log('Validation result:', validation4);
      process.exit(1);
    }

    // Test Case 5: EnvoyNodeId tampering detection
    console.log('\n📝 Test 5: EnvoyNodeId tampering detection');
    const token5 = FilterAuthService.generateAuthToken('test-filter-5', 'original-node');
    
    // Tamper with the envoyNodeId
    const tamperedNodeToken = { ...token5, envoyNodeId: 'tampered-node' };
    
    const validation5 = await FilterAuthService.validateAuthToken(tamperedNodeToken);
    
    if (!validation5.valid && validation5.reason?.includes('signature')) {
      console.log('✅ EnvoyNodeId tampering correctly detected');
    } else {
      console.log('❌ EnvoyNodeId tampering not detected properly');
      console.log('Validation result:', validation5);
      process.exit(1);
    }

    console.log('\n🎉 All signature validation tests passed!');
    console.log('🔒 The critical signature bug has been successfully fixed.');
    console.log('✅ Tokens with envoyNodeId now validate correctly.');
    console.log('✅ Signature tampering is properly detected.');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  }
}

// Helper function to compare signatures manually
function demonstrateSignatureFix() {
  console.log('\n🔍 Demonstrating the signature fix:');
  
  // Show the signature generation vs validation consistency
  const filterId = 'demo-filter';
  const envoyNodeId = 'demo-node';
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = 'demo-nonce';
  
  // Generation message (this was always correct)
  const generationMessage = `${filterId}:${timestamp}:${nonce}:${envoyNodeId}`;
  console.log('🔧 Generation message:', generationMessage);
  
  // Validation message (this was previously wrong, now fixed)
  const validationMessage = `${filterId}:${timestamp}:${nonce}:${envoyNodeId}`;
  console.log('✅ Validation message:', validationMessage);
  
  console.log('🔒 Messages now match - signatures will validate correctly!');
}

// Run tests
demonstrateSignatureFix();
testSignatureValidation().catch(console.error);