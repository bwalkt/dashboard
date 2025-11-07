export class MatrixOperations {
  private roundResult(value: number, decimals: number = 3): number {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)
  }

  matrixMultiply(a: number[][], b: number[][]): number[][] | string {
    const m = a.length
    if (m === 0) return 'empty matrix'
    const n = b[0]?.length || 0
    const p = b.length
    
    if (p !== a[0].length) {
      return `dimension mismatch: ${a[0].length} != ${p}`
    }
    
    const result: number[][] = []
    for (let i = 0; i < m; i++) {
      result[i] = []
      for (let j = 0; j < n; j++) {
        let sum = 0
        for (let k = 0; k < p; k++) {
          sum += a[i][k] * b[k][j]
        }
        result[i][j] = this.roundResult(sum)
      }
    }
    return result
  }

  matrixTranspose(matrix: number[][]): number[][] {
    if (matrix.length === 0) return []
    const rows = matrix.length
    const cols = matrix[0].length
    const result: number[][] = []
    
    for (let j = 0; j < cols; j++) {
      result[j] = []
      for (let i = 0; i < rows; i++) {
        result[j][i] = matrix[i][j]
      }
    }
    return result
  }

  matrixDeterminant(matrix: number[][]): number | string {
    const n = matrix.length
    if (n === 0) return 'empty matrix'
    if (n !== matrix[0].length) return 'not square matrix'
    
    if (n === 1) return matrix[0][0]
    if (n === 2) {
      return this.roundResult(matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0])
    }
    
    let det = 0
    for (let j = 0; j < n; j++) {
      const minor = this.getMinor(matrix, 0, j)
      const cofactor = Math.pow(-1, j) * matrix[0][j]
      const minorDet = this.matrixDeterminant(minor)
      if (typeof minorDet === 'number') {
        det += cofactor * minorDet
      }
    }
    return this.roundResult(det)
  }

  private getMinor(matrix: number[][], row: number, col: number): number[][] {
    const minor: number[][] = []
    for (let i = 0; i < matrix.length; i++) {
      if (i === row) continue
      const minorRow: number[] = []
      for (let j = 0; j < matrix[i].length; j++) {
        if (j === col) continue
        minorRow.push(matrix[i][j])
      }
      minor.push(minorRow)
    }
    return minor
  }

  matrixInverse(matrix: number[][]): number[][] | string {
    const n = matrix.length
    if (n === 0) return 'empty matrix'
    if (n !== matrix[0].length) return 'not square matrix'
    
    const det = this.matrixDeterminant(matrix)
    if (typeof det === 'string' || Math.abs(det) < 1e-10) {
      return 'singular matrix'
    }
    
    if (n === 2) {
      return [
        [this.roundResult(matrix[1][1] / det), this.roundResult(-matrix[0][1] / det)],
        [this.roundResult(-matrix[1][0] / det), this.roundResult(matrix[0][0] / det)]
      ]
    }
    
    const adjugate: number[][] = []
    for (let i = 0; i < n; i++) {
      adjugate[i] = []
      for (let j = 0; j < n; j++) {
        const minor = this.getMinor(matrix, j, i)
        const cofactor = Math.pow(-1, i + j) * (this.matrixDeterminant(minor) as number)
        adjugate[i][j] = this.roundResult(cofactor / det)
      }
    }
    return adjugate
  }

  matrixAdd(a: number[][], b: number[][]): number[][] | string {
    if (a.length !== b.length || (a[0] && b[0] && a[0].length !== b[0].length)) {
      return 'dimension mismatch'
    }
    
    return a.map((row, i) => 
      row.map((val, j) => this.roundResult(val + b[i][j]))
    )
  }

  matrixSubtract(a: number[][], b: number[][]): number[][] | string {
    if (a.length !== b.length || (a[0] && b[0] && a[0].length !== b[0].length)) {
      return 'dimension mismatch'
    }
    
    return a.map((row, i) => 
      row.map((val, j) => this.roundResult(val - b[i][j]))
    )
  }

  matrixScale(matrix: number[][], scalar: number): number[][] {
    return matrix.map(row => 
      row.map(val => this.roundResult(val * scalar))
    )
  }

  matrixTrace(matrix: number[][]): number | string {
    const n = matrix.length
    if (n === 0) return 'empty matrix'
    if (n !== matrix[0].length) return 'not square matrix'
    
    let trace = 0
    for (let i = 0; i < n; i++) {
      trace += matrix[i][i]
    }
    return this.roundResult(trace)
  }

  matrixRank(matrix: number[][]): number {
    if (matrix.length === 0 || matrix[0].length === 0) return 0
    
    const m = matrix.length
    const n = matrix[0].length
    const copy = matrix.map(row => [...row])
    let rank = 0
    
    for (let col = 0; col < n && rank < m; col++) {
      let pivot = rank
      for (let row = rank + 1; row < m; row++) {
        if (Math.abs(copy[row][col]) > Math.abs(copy[pivot][col])) {
          pivot = row
        }
      }
      
      if (Math.abs(copy[pivot][col]) < 1e-10) continue
      
      if (pivot !== rank) {
        [copy[pivot], copy[rank]] = [copy[rank], copy[pivot]]
      }
      
      for (let row = rank + 1; row < m; row++) {
        const factor = copy[row][col] / copy[rank][col]
        for (let k = col; k < n; k++) {
          copy[row][k] -= factor * copy[rank][k]
        }
      }
      
      rank++
    }
    
    return rank
  }
}