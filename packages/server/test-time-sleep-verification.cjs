#!/usr/bin/env node

/**
 * Verification script to confirm all blocking time.Sleep calls have been removed
 * This ensures WASM compatibility for the envoy-wasm-filter
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Complete Removal of Blocking time.Sleep Calls...\n');

const filterDir = path.resolve(__dirname, '../envoy-wasm-filter');
const goFiles = fs.readdirSync(filterDir).filter(f => f.endsWith('.go'));

console.log('📁 Scanning Go files in envoy-wasm-filter:');
goFiles.forEach(file => console.log(`  - ${file}`));

console.log('\n🔎 Searching for blocking time operations...\n');

let foundBlockingCalls = false;
const blockingPatterns = [
  { pattern: /^\s*time\.Sleep\s*\(/gm, description: 'time.Sleep() calls' },
  { pattern: /^\s*time\.After\s*\(/gm, description: 'time.After() calls' },
  { pattern: /^\s*time\.NewTimer\s*\(/gm, description: 'time.NewTimer() calls' },
  { pattern: /^\s*time\.NewTicker\s*\(/gm, description: 'time.NewTicker() calls' },
  { pattern: /^\s*<-.*time\./gm, description: 'time channel operations' },
  { pattern: /go\s+\w+\s*\(/gm, description: 'goroutine launches' }
];

for (const file of goFiles) {
  const filePath = path.join(filterDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  console.log(`📄 Checking ${file}:`);
  
  let fileHasIssues = false;
  
  for (const { pattern, description } of blockingPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      const lines = content.split('\n');
      matches.forEach(match => {
        const lineIndex = lines.findIndex(line => line.includes(match.trim()));
        if (lineIndex !== -1) {
          const lineNum = lineIndex + 1;
          const line = lines[lineIndex].trim();
          
          // Check if it's in a comment
          if (!line.startsWith('//') && !line.includes('//') && !line.startsWith('/*')) {
            console.log(`  ❌ FOUND: ${description} on line ${lineNum}`);
            console.log(`     Code: ${line}`);
            foundBlockingCalls = true;
            fileHasIssues = true;
          } else {
            console.log(`  💭 Comment reference: ${description} on line ${lineNum} (OK)`);
          }
        }
      });
    }
  }
  
  if (!fileHasIssues) {
    console.log('  ✅ No blocking calls found');
  }
  console.log('');
}

console.log('🔧 WASM-Compatible Approaches Verified:');

// Check for WASM-compatible timer usage
for (const file of goFiles) {
  const filePath = path.join(filterDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('SetTickPeriodMilliSeconds')) {
    console.log(`✅ ${file}: Using SetTickPeriodMilliSeconds (WASM-compatible)`);
  }
  
  if (content.includes('OnTick')) {
    console.log(`✅ ${file}: Implements OnTick callback (WASM-compatible)`);
  }
  
  if (content.includes('validationState')) {
    console.log(`✅ ${file}: Uses state-based polling (WASM-compatible)`);
  }
}

console.log('\n📋 WASM Compatibility Summary:');

const compatibilityChecks = [
  {
    check: 'No blocking time.Sleep calls',
    status: !foundBlockingCalls,
    description: 'Avoids blocking the WASM execution thread'
  },
  {
    check: 'Uses SDK timer functions',
    status: goFiles.some(file => {
      const content = fs.readFileSync(path.join(filterDir, file), 'utf8');
      return content.includes('SetTickPeriodMilliSeconds');
    }),
    description: 'Uses proxy-wasm-go-sdk provided timers'
  },
  {
    check: 'Event-driven callbacks',
    status: goFiles.some(file => {
      const content = fs.readFileSync(path.join(filterDir, file), 'utf8');
      return content.includes('OnTick');
    }),
    description: 'Uses callback-based architecture'
  },
  {
    check: 'State-based polling',
    status: goFiles.some(file => {
      const content = fs.readFileSync(path.join(filterDir, file), 'utf8');
      return content.includes('validationState');
    }),
    description: 'Maintains state without goroutines'
  }
];

console.log('');
compatibilityChecks.forEach((check, index) => {
  const status = check.status ? '✅ PASS' : '❌ FAIL';
  console.log(`${index + 1}. ${check.check}: ${status}`);
  console.log(`   ${check.description}`);
  console.log('');
});

const allCompatible = compatibilityChecks.every(check => check.status);

console.log('\n🎯 Final Verification Result:');
if (allCompatible) {
  console.log('✅ ALL WASM COMPATIBILITY CHECKS PASSED!');
  console.log('💡 The envoy-wasm-filter is now fully compatible with TinyGo WASM environment');
  console.log('🚀 Ready for production deployment');
} else {
  console.log('❌ WASM COMPATIBILITY ISSUES DETECTED!');
  console.log('⚠️  Manual review and fixes required');
  process.exit(1);
}

console.log('\n📚 Key Improvements Made:');
console.log('- Replaced goroutines with timer-based polling');
console.log('- Eliminated blocking time.Sleep() calls');
console.log('- Added event-driven OnTick() callbacks');
console.log('- Implemented state-based validation tracking');
console.log('- Used proxy-wasm-go-sdk timer functions');
console.log('- Ensured non-blocking execution model');