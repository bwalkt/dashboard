import { genFunctionWithValidation, genGrid, evaluate } from './dist/grid/grid.js';

console.log('Testing reattempts feature...\n');

// Generate some functions and show reattempt stats
for (let i = 0; i < 10; i++) {
  const func = genFunctionWithValidation(2, 3); // Small grid, complexity 2
  const grid = genGrid(3);
  const result = evaluate(grid, func);
  
  const x = grid[func.xCell.row][func.xCell.col];
  const y = grid[func.yCell.row][func.yCell.col];
  
  console.log(`Function ${i + 1}:`);
  console.log(`  Expression: ${func.expression}`);
  console.log(`  x = ${x} (grid[${func.xCell.row}][${func.xCell.col}]), y = ${y} (grid[${func.yCell.row}][${func.yCell.col}])`);
  console.log(`  Result: ${result}`);
  console.log(`  Reattempts: ${func.metadata.reattempts}`);
  
  // Check if cells are different
  const sameCells = func.xCell.row === func.yCell.row && func.xCell.col === func.yCell.col;
  console.log(`  Different cells: ${!sameCells ? '✅' : '❌'}`);
  
  // Check if result is non-trivial
  const isTrivial = result === 0 || result === 1 || !isFinite(Number(result));
  console.log(`  Non-trivial result: ${!isTrivial ? '✅' : '❌'}`);
  console.log('');
}
