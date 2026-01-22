import { evaluate } from './dist/grid/grid.js'

// Test the problematic case
const grid = [
  [0, 0, 0],
  [0, 0, 31052],
  [0, 3901, 0],
]
const func = {
  expression: 'combinations(floor(abs(x)+abs(y)), floor(abs(y)))',
  xCell: { row: 2, col: 1 },
  yCell: { row: 1, col: 2 },
}

console.log('Testing combinations with large numbers:')
console.log('x = 3901, y = 31052')
console.log('Expression: combinations(floor(abs(x)+abs(y)), floor(abs(y)))')
console.log('Which evaluates to: combinations(34953, 31052)')

const result = evaluate(grid, func)
console.log('\nResult:', result)

if (result === Infinity) {
  console.log('✅ CORRECT: Result is Infinity (number too large to compute)')
} else if (result === 1) {
  console.log('❌ INCORRECT: Result is 1 (this was the bug - truncation to combinations(1000,1000))')
} else {
  console.log('Result:', result)
}

// Test a few more edge cases
console.log('\n--- Additional test cases ---')

// Test case where k=0 (should be 1)
const test1 = evaluate([[1000000, 0]], {
  expression: 'combinations(x, y)',
  xCell: { row: 0, col: 0 },
  yCell: { row: 0, col: 1 },
})
console.log('combinations(1000000, 0) =', test1, '(should be 1)')

// Test case where k=n (should be 1)
const test2 = evaluate([[5000, 5000]], {
  expression: 'combinations(x, y)',
  xCell: { row: 0, col: 0 },
  yCell: { row: 0, col: 1 },
})
console.log('combinations(5000, 5000) =', test2, '(should be 1)')

// Test case with large n and small k (should compute correctly)
const test3 = evaluate([[10000, 3]], {
  expression: 'combinations(x, y)',
  xCell: { row: 0, col: 0 },
  yCell: { row: 0, col: 1 },
})
console.log('combinations(10000, 3) =', test3, '(should be 166616670000)')

// Test case with n > 1000 and k in middle range (should be Infinity)
const test4 = evaluate([[2000, 1000]], {
  expression: 'combinations(x, y)',
  xCell: { row: 0, col: 0 },
  yCell: { row: 0, col: 1 },
})
console.log('combinations(2000, 1000) =', test4, '(should be Infinity - too large)')
