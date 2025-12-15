import { genFunctionWithValidation, genGrid, evaluate } from './dist/grid/grid.js';

console.log('Testing with small grid to force more trivial results...\n');

// Use a very small grid with small values
const smallGrid = [[1, 2], [3, 4]];

// Generate many functions with this small grid to increase chance of trivial results
let totalReattempts = 0;
let functionsWithReattempts = 0;

for (let i = 0; i < 20; i++) {
  const func = genFunctionWithValidation(1, 2); // Simple functions, small grid
  const result = evaluate(smallGrid, func);
  
  console.log(`Function ${i + 1}:`);
  console.log(`  Expression: ${func.expression}`);
  console.log(`  Result: ${result}`);
  console.log(`  Reattempts: ${func.metadata.reattempts}`);
  
  if (func.metadata.reattempts > 0) {
    functionsWithReattempts++;
    totalReattempts += func.metadata.reattempts;
  }
  console.log('');
}

console.log(`Summary: ${functionsWithReattempts}/${20} functions needed reattempts`);
console.log(`Total reattempts across all functions: ${totalReattempts}`);
