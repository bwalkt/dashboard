export class LinearAlgebra {
  private roundResult(value: number, decimals: number = 3): number {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)
  }

  eigenvalues(matrix: number[][]): number[] | string {
    const n = matrix.length
    if (n === 0) return 'empty matrix'
    if (n !== matrix[0].length) return 'not square matrix'
    
    if (n === 2) {
      // For 2x2 matrix, use analytical solution
      const a = matrix[0][0]
      const b = matrix[0][1]
      const c = matrix[1][0]
      const d = matrix[1][1]
      
      const trace = a + d
      const det = a * d - b * c
      
      const discriminant = trace * trace - 4 * det
      if (discriminant < 0) {
        // Complex eigenvalues
        return []
      }
      
      const sqrtDisc = Math.sqrt(discriminant)
      return [
        this.roundResult((trace + sqrtDisc) / 2),
        this.roundResult((trace - sqrtDisc) / 2)
      ]
    }
    
    // For larger matrices, use power iteration for dominant eigenvalue
    // This is a simplified implementation
    const maxIterations = 100
    let vector = new Array(n).fill(1)
    let eigenvalue = 0
    
    for (let iter = 0; iter < maxIterations; iter++) {
      const newVector = this.matrixVectorMultiply(matrix, vector)
      const norm = Math.sqrt(newVector.reduce((sum, val) => sum + val * val, 0))
      
      if (norm === 0) break
      
      vector = newVector.map(val => val / norm)
      eigenvalue = this.dotProduct(vector, this.matrixVectorMultiply(matrix, vector))
    }
    
    return [this.roundResult(eigenvalue)]
  }

  private matrixVectorMultiply(matrix: number[][], vector: number[]): number[] {
    const result: number[] = []
    for (let i = 0; i < matrix.length; i++) {
      let sum = 0
      for (let j = 0; j < vector.length; j++) {
        sum += matrix[i][j] * vector[j]
      }
      result.push(sum)
    }
    return result
  }

  private dotProduct(a: number[], b: number[]): number {
    return a.reduce((sum, val, i) => sum + val * b[i], 0)
  }

  svd(matrix: number[][]): { U: number[][], S: number[], V: number[][] } | string {
    const m = matrix.length
    if (m === 0) return 'empty matrix'
    const n = matrix[0].length
    
    // Calculate A^T * A
    const AtA = this.matrixMultiply(this.matrixTranspose(matrix), matrix)
    
    if (typeof AtA === 'string') return AtA
    
    // Get eigenvalues of A^T * A (these are sigma^2)
    const eigenvals = this.eigenvalues(AtA)
    
    if (typeof eigenvals === 'string') return eigenvals
    
    // Singular values are square roots of eigenvalues
    const S: number[] = []
    for (const eigenval of eigenvals) {
      if (eigenval >= 0) {
        S.push(this.roundResult(Math.sqrt(eigenval)))
      }
    }
    
    return 'svd not implemented'
  }

  private matrixMultiply(a: number[][], b: number[][]): number[][] | string {
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
        result[i][j] = sum
      }
    }
    return result
  }

  private matrixTranspose(matrix: number[][]): number[][] {
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

  qrDecomposition(matrix: number[][]): { Q: number[][], R: number[][] } | string {
    const m = matrix.length
    if (m === 0) return 'empty matrix'
    const n = matrix[0].length
    
    // Gram-Schmidt process
    const Q: number[][] = []
    const R: number[][] = []
    
    // Initialize R as zero matrix
    for (let i = 0; i < n; i++) {
      R[i] = new Array(n).fill(0)
    }
    
    for (let j = 0; j < n; j++) {
      // Extract column j
      let v: number[] = []
      for (let i = 0; i < m; i++) {
        v.push(matrix[i][j])
      }
      
      // Orthogonalize against previous columns
      for (let i = 0; i < j; i++) {
        const dot = this.dotProduct(Q[i], v)
        R[i][j] = dot
        
        for (let k = 0; k < m; k++) {
          v[k] -= dot * Q[i][k]
        }
      }
      
      // Normalize
      const norm = Math.sqrt(v.reduce((sum, val) => sum + val * val, 0))
      R[j][j] = norm
      
      if (norm > 1e-10) {
        Q[j] = v.map(val => this.roundResult(val / norm))
      } else {
        Q[j] = new Array(m).fill(0)
      }
    }
    
    // Transpose Q to get correct orientation
    const QTransposed: number[][] = []
    for (let i = 0; i < m; i++) {
      QTransposed[i] = []
      for (let j = 0; j < n; j++) {
        QTransposed[i][j] = Q[j] ? Q[j][i] : 0
      }
    }
    
    return { Q: QTransposed, R }
  }

  luDecomposition(matrix: number[][]): { L: number[][], U: number[][], P: number[][] } | string {
    const n = matrix.length
    if (n === 0) return 'empty matrix'
    if (n !== matrix[0].length) return 'not square matrix'
    
    // Initialize matrices
    const L: number[][] = []
    const U: number[][] = []
    const P: number[][] = []
    
    // Initialize P as identity matrix
    for (let i = 0; i < n; i++) {
      P[i] = new Array(n).fill(0)
      P[i][i] = 1
      L[i] = new Array(n).fill(0)
      U[i] = [...matrix[i]]
    }
    
    // Gaussian elimination with partial pivoting
    for (let k = 0; k < n - 1; k++) {
      // Find pivot
      let pivot = k
      for (let i = k + 1; i < n; i++) {
        if (Math.abs(U[i][k]) > Math.abs(U[pivot][k])) {
          pivot = i
        }
      }
      
      // Swap rows in U and P
      if (pivot !== k) {
        const tempU = U[k]
        U[k] = U[pivot]
        U[pivot] = tempU
        
        const tempP = P[k]
        P[k] = P[pivot]
        P[pivot] = tempP
        
        // Swap already computed parts of L
        for (let j = 0; j < k; j++) {
          const temp = L[k][j]
          L[k][j] = L[pivot][j]
          L[pivot][j] = temp
        }
      }
      
      if (Math.abs(U[k][k]) < 1e-12) {
        return 'singular matrix'
      }
      
      // Compute L and U
      for (let i = k + 1; i < n; i++) {
        L[i][k] = U[i][k] / U[k][k]
        for (let j = k + 1; j < n; j++) {
          U[i][j] -= L[i][k] * U[k][j]
        }
        U[i][k] = 0
      }
    }
    
    // Set diagonal of L to 1
    for (let i = 0; i < n; i++) {
      L[i][i] = 1
    }
    
    return { L, U, P }
  }

  choleskyDecomposition(matrix: number[][]): number[][] | string {
    const n = matrix.length
    if (n === 0) return 'empty matrix'
    if (n !== matrix[0].length) return 'not square matrix'
    
    // Check if matrix is symmetric
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (Math.abs(matrix[i][j] - matrix[j][i]) > 1e-10) {
          return 'not symmetric matrix'
        }
      }
    }
    
    const L: number[][] = []
    for (let i = 0; i < n; i++) {
      L[i] = new Array(n).fill(0)
    }
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = 0
        
        if (i === j) {
          for (let k = 0; k < j; k++) {
            sum += L[j][k] * L[j][k]
          }
          const value = matrix[j][j] - sum
          if (value < 0) {
            return 'not positive definite'
          }
          L[j][j] = this.roundResult(Math.sqrt(value))
        } else {
          for (let k = 0; k < j; k++) {
            sum += L[i][k] * L[j][k]
          }
          L[i][j] = this.roundResult((matrix[i][j] - sum) / L[j][j])
        }
      }
    }
    
    return L
  }

  norm(matrix: number[][], type: 'frobenius' | '1' | '2' | 'inf' = 'frobenius'): number {
    if (matrix.length === 0) return 0
    
    switch (type) {
      case 'frobenius':
        let sum = 0
        for (const row of matrix) {
          for (const val of row) {
            sum += val * val
          }
        }
        return this.roundResult(Math.sqrt(sum))
        
      case '1':
        // Maximum absolute column sum
        let maxColSum = 0
        for (let j = 0; j < matrix[0].length; j++) {
          let colSum = 0
          for (let i = 0; i < matrix.length; i++) {
            colSum += Math.abs(matrix[i][j])
          }
          maxColSum = Math.max(maxColSum, colSum)
        }
        return this.roundResult(maxColSum)
        
      case 'inf':
        // Maximum absolute row sum
        let maxRowSum = 0
        for (const row of matrix) {
          const rowSum = row.reduce((sum, val) => sum + Math.abs(val), 0)
          maxRowSum = Math.max(maxRowSum, rowSum)
        }
        return this.roundResult(maxRowSum)
        
      case '2':
        // Spectral norm (largest singular value)
        const AtA = this.matrixMultiply(this.matrixTranspose(matrix), matrix)
        if (typeof AtA === 'string') return 0
        
        const eigenvals = this.eigenvalues(AtA)
        if (typeof eigenvals === 'string') return 0
        
        const maxEigenval = Math.max(...eigenvals)
        return this.roundResult(Math.sqrt(maxEigenval))
        
      default:
        return 0
    }
  }

  solveLinearSystem(A: number[][], b: number[]): number[] | string {
    const n = A.length
    if (n === 0) return 'empty matrix'
    if (n !== A[0].length) return 'not square matrix'
    if (b.length !== n) return 'dimension mismatch'
    
    // Use Gaussian elimination with partial pivoting
    const augmented: number[][] = []
    for (let i = 0; i < n; i++) {
      augmented[i] = [...A[i], b[i]]
    }
    
    // Forward elimination
    for (let k = 0; k < n; k++) {
      // Find pivot
      let pivot = k
      for (let i = k + 1; i < n; i++) {
        if (Math.abs(augmented[i][k]) > Math.abs(augmented[pivot][k])) {
          pivot = i
        }
      }
      
      if (Math.abs(augmented[pivot][k]) < 1e-10) {
        return 'singular matrix'
      }
      
      // Swap rows
      if (pivot !== k) {
        [augmented[k], augmented[pivot]] = [augmented[pivot], augmented[k]]
      }
      
      // Eliminate column
      for (let i = k + 1; i < n; i++) {
        const factor = augmented[i][k] / augmented[k][k]
        for (let j = k; j <= n; j++) {
          augmented[i][j] -= factor * augmented[k][j]
        }
      }
    }
    
    // Back substitution
    const x: number[] = new Array(n)
    for (let i = n - 1; i >= 0; i--) {
      x[i] = augmented[i][n]
      for (let j = i + 1; j < n; j++) {
        x[i] -= augmented[i][j] * x[j]
      }
      x[i] = this.roundResult(x[i] / augmented[i][i])
    }
    
    return x
  }
}