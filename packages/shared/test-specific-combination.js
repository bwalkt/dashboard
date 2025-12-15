import { genFunction, evaluate, genGrid } from './dist/grid/grid.js';

console.log('Testing specific combinations pattern that was failing...\n');

// Generate functions until we find one with the specific pattern
let found = false;
let attempts = 0;
const maxAttempts = 100;

while (!found && attempts < maxAttempts) {
  attempts++;
  const func = genFunction(3, 5); // complexity 3 often has this pattern
  
  if (func.expression.includes('combinations(floor(abs(x)+abs(y)), floor(abs(y)))') ||
      func.expression.includes('combinations(floor(abs(x) + abs(y)), floor(abs(y)))')) {
    
    console.log(`Found the pattern after ${attempts} attempts!`);
    console.log(`Expression: ${func.expression}`);
    
    // Generate a grid and evaluate
    const grid = genGrid(5);
    const xVal = grid[func.xCell.row][func.xCell.col];
    const yVal = grid[func.yCell.row][func.yCell.col];
    
    console.log(`x = ${xVal} (at grid[${func.xCell.row}][${func.xCell.col}])`);
    console.log(`y = ${yVal} (at grid[${func.yCell.row}][${func.yCell.col}])`);
    console.log(`n = floor(abs(${xVal}) + abs(${yVal})) = ${Math.floor(Math.abs(xVal) + Math.abs(yVal))}`);
    console.log(`k = floor(abs(${yVal})) = ${Math.floor(Math.abs(yVal))}`);
    
    const result = evaluate(grid, func);
    console.log(`Result: ${result}`);
    
    // Check if it's correctly returning Infinity for large values
    const n = Math.floor(Math.abs(xVal) + Math.abs(yVal));
    const k = Math.floor(Math.abs(yVal));
    
    if (n > 1000 && k > 10 && k < n - 10) {
      if (result === Infinity || result === '∞') {
        console.log('✅ CORRECT: Returns Infinity for large combination that would overflow');
      } else if (result === 1) {
        console.log('❌ BUG: Returns 1 (likely due to truncation to combinations(1000, 1000))');
      } else {
        console.log('⚠️ Unexpected result:', result);
      }
    }
    
    found = true;
  }
}

if (!found) {
  console.log(`Pattern not found after ${maxAttempts} attempts. This is expected as it's randomly generated.`);
}
