export class Ripple {
  private rippleData: string[] = []
  private tokenSet: Set<string> = new Set()

  add(s: string): void {
    this.rippleData.push(s)
    this.tokenSet.add(s)
  }

  addStrings(strings: string[]): void {
    for (const str of strings) {
      this.add(str)
    }
  }

  addIfUnique(s: string): void {
    if (!this.tokenSet.has(s)) {
      this.rippleData.push(s)
      this.tokenSet.add(s)
    }
  }

  count(): number {
    return this.rippleData.length
  }

  s(index: number): string {
    return this.rippleData[index]
  }

  updateAt(index: number, s: string): void {
    const oldValue = this.rippleData[index]
    this.rippleData[index] = s
    // Update the Set if needed
    if (oldValue && !this.rippleData.includes(oldValue)) {
      this.tokenSet.delete(oldValue)
    }
    this.tokenSet.add(s)
  }

  getLeaf(): string {
    return this.rippleData[this.rippleData.length - 1]
  }

  isEqual(r: Ripple): boolean {
    if (r.count() !== this.count()) {
      return false
    }

    for (let i = 0; i < r.count(); i++) {
      if (r.s(i) !== this.s(i)) {
        return false
      }
    }

    return true
  }

  isTokenFound(s: string): boolean {
    return this.tokenSet.has(s)
  }

  getTokenIndex(s: string): number {
    for (let i = 0; i < this.rippleData.length; i++) {
      if (this.rippleData[i] === s) {
        return i
      }
    }
    return -1
  }

  addMissingTokens(ripple: Ripple): void {
    for (let i = 0; i < ripple.count(); i++) {
      const token = ripple.s(i)
      if (!this.tokenSet.has(token)) {
        this.rippleData.push(token)
        this.tokenSet.add(token)
      }
    }
  }

  appendRipple(r: Ripple): void {
    for (let i = 0; i < r.count(); i++) {
      this.add(r.s(i))
    }
  }

  leftShift(index: number): Ripple {
    const result = new Ripple()
    for (let j = index; j < this.rippleData.length; j++) {
      result.add(this.rippleData[j])
    }
    return result
  }

  getTokenIndexFromRight(token: string): number {
    for (let i = this.rippleData.length - 1; i >= 0; i--) {
      if (this.rippleData[i] === token) {
        return i
      }
    }
    return -1
  }

  rightShift(index: number): Ripple {
    const result = new Ripple()
    if (index === 0) {
      result.appendRipple(this)
    } else {
      for (let j = 0; j < index; j++) {
        result.add(this.rippleData[j])
      }
    }
    return result
  }

  toString(): string {
    return this.rippleData.join(' ')
  }

  copy(): Ripple {
    const result = new Ripple()
    // Directly copy internal state for efficiency
    result.rippleData = [...this.rippleData]
    result.tokenSet = new Set(this.tokenSet)
    return result
  }

  getTokens(): string[] {
    return [...this.rippleData]
  }
}

export class Ripples {
  private ripplesData: Ripple[] = []

  add(ripple: Ripple): void {
    this.ripplesData.push(ripple)
  }

  removeAt(index: number): void {
    this.ripplesData.splice(index, 1)
  }

  count(): number {
    return this.ripplesData.length
  }

  r(index: number): Ripple {
    return this.ripplesData[index]
  }

  leftShiftEachRipple(index: number): Ripples {
    const result = new Ripples()
    for (const ripple of this.ripplesData) {
      const shiftedRipple = ripple.leftShift(index)
      result.add(shiftedRipple)
    }
    return result
  }

  findRipple(r: Ripple): number {
    for (let i = 0; i < this.ripplesData.length; i++) {
      if (this.ripplesData[i].isEqual(r)) {
        return i
      }
    }
    return -1
  }

  rippleByToken(token: string): number {
    for (let i = 0; i < this.ripplesData.length; i++) {
      const index = this.ripplesData[i].getTokenIndex(token)
      if (index !== -1) {
        return i
      }
    }
    return -1
  }

  append(ripples: Ripples): void {
    for (let i = 0; i < ripples.count(); i++) {
      this.add(ripples.r(i))
    }
  }

  appendNotExists(ripples: Ripples): void {
    for (let i = 0; i < ripples.count(); i++) {
      if (this.findRipple(ripples.r(i)) === -1) {
        this.add(ripples.r(i))
      }
    }
  }

  maxWidth(): number {
    let max = 0
    for (const ripple of this.ripplesData) {
      if (ripple.count() > max) {
        max = ripple.count()
      }
    }
    return max
  }

  copy(): Ripples {
    const result = new Ripples()
    for (const ripple of this.ripplesData) {
      result.add(ripple)
    }
    return result
  }

  toStrings(): string[] {
    const result: string[] = []
    for (const ripple of this.ripplesData) {
      result.push(ripple.toString())
    }
    return result
  }

  toTextStrings(): string[] {
    const result: string[] = []
    const lineDelimiter = '\n'

    for (const ripple of this.ripplesData) {
      const str = ripple.toString() + lineDelimiter
      result.push(str)
    }
    return result
  }
}
