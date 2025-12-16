import { evaluate, genFunctionWithValidation, genGrid } from './dist/grid/grid.js'

// Generate a function that has reattempts
for (let i = 0; i < 10; i++) {
  const func = genFunctionWithValidation(1, 2)

  if (func.metadata.reattempts > 0) {
    console.log('Found function with reattempts!')
    console.log(`Expression: ${func.expression}`)
    console.log(`Reattempts: ${func.metadata.reattempts}`)
    console.log(`ID: ${func.id}`)

    // Now let's test the CLI display logic
    console.log('\nCLI display check:')
    console.log(`  x = grid[${func.xCell.row}][${func.xCell.col}], y = grid[${func.yCell.row}][${func.yCell.col}]`)
    if (func.metadata.reattempts > 0) {
      console.log(`  ♻️  Reattempts: ${func.metadata.reattempts} (avoided trivial results)`)
    }
    break
  }
}
