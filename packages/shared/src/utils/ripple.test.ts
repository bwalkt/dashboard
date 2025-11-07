import { beforeEach, describe, expect, it } from 'vitest'
import { Ripple, Ripples } from './ripple.js'

describe('Ripple', () => {
  let ripple: Ripple

  beforeEach(() => {
    ripple = new Ripple()
  })

  describe('add and basic operations', () => {
    it('should add a string to ripple', () => {
      ripple.add('test')
      expect(ripple.count()).toBe(1)
      expect(ripple.s(0)).toBe('test')
    })

    it('should add multiple strings', () => {
      ripple.addStrings(['one', 'two', 'three'])
      expect(ripple.count()).toBe(3)
      expect(ripple.s(0)).toBe('one')
      expect(ripple.s(1)).toBe('two')
      expect(ripple.s(2)).toBe('three')
    })

    it('should add unique strings only when using addIfUnique', () => {
      ripple.add('test')
      ripple.addIfUnique('test')
      ripple.addIfUnique('new')
      expect(ripple.count()).toBe(2)
      expect(ripple.s(0)).toBe('test')
      expect(ripple.s(1)).toBe('new')
    })

    it('should allow duplicate strings with regular add', () => {
      ripple.add('test')
      ripple.add('test')
      expect(ripple.count()).toBe(2)
    })
  })

  describe('updateAt', () => {
    it('should update value at specific index', () => {
      ripple.addStrings(['one', 'two', 'three'])
      ripple.updateAt(1, 'updated')
      expect(ripple.s(1)).toBe('updated')
      expect(ripple.count()).toBe(3)
    })

    it('should update tokenSet when updating values', () => {
      ripple.add('unique')
      ripple.updateAt(0, 'changed')
      expect(ripple.isTokenFound('changed')).toBe(true)
      expect(ripple.isTokenFound('unique')).toBe(false)
    })
  })

  describe('getLeaf', () => {
    it('should return the last element', () => {
      ripple.addStrings(['first', 'middle', 'last'])
      expect(ripple.getLeaf()).toBe('last')
    })
  })

  describe('isEqual', () => {
    it('should return true for equal ripples', () => {
      const ripple2 = new Ripple()
      ripple.addStrings(['a', 'b', 'c'])
      ripple2.addStrings(['a', 'b', 'c'])
      expect(ripple.isEqual(ripple2)).toBe(true)
    })

    it('should return false for different ripples', () => {
      const ripple2 = new Ripple()
      ripple.addStrings(['a', 'b', 'c'])
      ripple2.addStrings(['a', 'b', 'd'])
      expect(ripple.isEqual(ripple2)).toBe(false)
    })

    it('should return false for different lengths', () => {
      const ripple2 = new Ripple()
      ripple.addStrings(['a', 'b'])
      ripple2.addStrings(['a', 'b', 'c'])
      expect(ripple.isEqual(ripple2)).toBe(false)
    })
  })

  describe('token operations', () => {
    it('should find tokens correctly', () => {
      ripple.addStrings(['apple', 'banana', 'cherry'])
      expect(ripple.isTokenFound('banana')).toBe(true)
      expect(ripple.isTokenFound('grape')).toBe(false)
    })

    it('should return correct token index', () => {
      ripple.addStrings(['apple', 'banana', 'cherry'])
      expect(ripple.getTokenIndex('banana')).toBe(1)
      expect(ripple.getTokenIndex('grape')).toBe(-1)
    })

    it('should return correct token index from right', () => {
      ripple.addStrings(['apple', 'banana', 'apple', 'cherry'])
      expect(ripple.getTokenIndexFromRight('apple')).toBe(2)
    })

    it('should add missing tokens from another ripple', () => {
      const ripple2 = new Ripple()
      ripple.addStrings(['a', 'b'])
      ripple2.addStrings(['b', 'c', 'd'])
      ripple.addMissingTokens(ripple2)
      expect(ripple.count()).toBe(4)
      expect(ripple.isTokenFound('c')).toBe(true)
      expect(ripple.isTokenFound('d')).toBe(true)
    })
  })

  describe('append operations', () => {
    it('should append another ripple', () => {
      const ripple2 = new Ripple()
      ripple.add('first')
      ripple2.addStrings(['second', 'third'])
      ripple.appendRipple(ripple2)
      expect(ripple.count()).toBe(3)
      expect(ripple.s(1)).toBe('second')
    })
  })

  describe('shift operations', () => {
    it('should perform left shift correctly', () => {
      ripple.addStrings(['a', 'b', 'c', 'd'])
      const shifted = ripple.leftShift(2)
      expect(shifted.count()).toBe(2)
      expect(shifted.s(0)).toBe('c')
      expect(shifted.s(1)).toBe('d')
    })

    it('should perform right shift correctly', () => {
      ripple.addStrings(['a', 'b', 'c', 'd'])
      const shifted = ripple.rightShift(2)
      expect(shifted.count()).toBe(2)
      expect(shifted.s(0)).toBe('a')
      expect(shifted.s(1)).toBe('b')
    })

    it('should return full ripple when right shift with 0', () => {
      ripple.addStrings(['a', 'b', 'c'])
      const shifted = ripple.rightShift(0)
      expect(shifted.count()).toBe(3)
      expect(shifted.isEqual(ripple)).toBe(true)
    })
  })

  describe('toString and copy', () => {
    it('should convert to string with spaces', () => {
      ripple.addStrings(['hello', 'world', 'test'])
      expect(ripple.toString()).toBe('hello world test')
    })

    it('should create a deep copy', () => {
      ripple.addStrings(['a', 'b', 'c'])
      const copy = ripple.copy()
      copy.add('d')
      expect(ripple.count()).toBe(3)
      expect(copy.count()).toBe(4)
    })

    it('should return tokens array', () => {
      ripple.addStrings(['a', 'b', 'c'])
      const tokens = ripple.getTokens()
      expect(tokens).toEqual(['a', 'b', 'c'])
      tokens.push('d')
      expect(ripple.count()).toBe(3)
    })
  })
})

describe('Ripples', () => {
  let ripples: Ripples

  beforeEach(() => {
    ripples = new Ripples()
  })

  describe('basic operations', () => {
    it('should add ripple', () => {
      const ripple = new Ripple()
      ripple.add('test')
      ripples.add(ripple)
      expect(ripples.count()).toBe(1)
      expect(ripples.r(0)).toBe(ripple)
    })

    it('should remove ripple at index', () => {
      const r1 = new Ripple()
      const r2 = new Ripple()
      r1.add('first')
      r2.add('second')
      ripples.add(r1)
      ripples.add(r2)
      ripples.removeAt(0)
      expect(ripples.count()).toBe(1)
      expect(ripples.r(0).s(0)).toBe('second')
    })
  })

  describe('shift operations', () => {
    it('should left shift each ripple', () => {
      const r1 = new Ripple()
      const r2 = new Ripple()
      r1.addStrings(['a', 'b', 'c'])
      r2.addStrings(['x', 'y', 'z'])
      ripples.add(r1)
      ripples.add(r2)

      const shifted = ripples.leftShiftEachRipple(1)
      expect(shifted.count()).toBe(2)
      expect(shifted.r(0).s(0)).toBe('b')
      expect(shifted.r(1).s(0)).toBe('y')
    })
  })

  describe('find operations', () => {
    it('should find ripple by equality', () => {
      const r1 = new Ripple()
      const r2 = new Ripple()
      const r3 = new Ripple()
      r1.addStrings(['a', 'b'])
      r2.addStrings(['c', 'd'])
      r3.addStrings(['a', 'b'])

      ripples.add(r1)
      ripples.add(r2)

      expect(ripples.findRipple(r3)).toBe(0)
      expect(ripples.findRipple(r2)).toBe(1)
    })

    it('should find ripple by token', () => {
      const r1 = new Ripple()
      const r2 = new Ripple()
      r1.addStrings(['apple', 'banana'])
      r2.addStrings(['cherry', 'date'])

      ripples.add(r1)
      ripples.add(r2)

      expect(ripples.rippleByToken('banana')).toBe(0)
      expect(ripples.rippleByToken('cherry')).toBe(1)
      expect(ripples.rippleByToken('grape')).toBe(-1)
    })
  })

  describe('append operations', () => {
    it('should append another ripples', () => {
      const ripples2 = new Ripples()
      const r1 = new Ripple()
      const r2 = new Ripple()
      r1.add('first')
      r2.add('second')

      ripples.add(r1)
      ripples2.add(r2)
      ripples.append(ripples2)

      expect(ripples.count()).toBe(2)
      expect(ripples.r(1).s(0)).toBe('second')
    })

    it('should append only non-existing ripples', () => {
      const ripples2 = new Ripples()
      const r1 = new Ripple()
      const r2 = new Ripple()
      const r3 = new Ripple()
      r1.addStrings(['a', 'b'])
      r2.addStrings(['a', 'b'])
      r3.addStrings(['c', 'd'])

      ripples.add(r1)
      ripples2.add(r2)
      ripples2.add(r3)
      ripples.appendNotExists(ripples2)

      expect(ripples.count()).toBe(2)
    })
  })

  describe('width and conversion', () => {
    it('should return max width', () => {
      const r1 = new Ripple()
      const r2 = new Ripple()
      r1.addStrings(['a', 'b'])
      r2.addStrings(['x', 'y', 'z'])

      ripples.add(r1)
      ripples.add(r2)

      expect(ripples.maxWidth()).toBe(3)
    })

    it('should copy ripples', () => {
      const r1 = new Ripple()
      r1.add('test')
      ripples.add(r1)

      const copy = ripples.copy()
      const r2 = new Ripple()
      r2.add('new')
      copy.add(r2)

      expect(ripples.count()).toBe(1)
      expect(copy.count()).toBe(2)
    })

    it('should convert to strings array', () => {
      const r1 = new Ripple()
      const r2 = new Ripple()
      r1.addStrings(['hello', 'world'])
      r2.addStrings(['foo', 'bar'])

      ripples.add(r1)
      ripples.add(r2)

      const strings = ripples.toStrings()
      expect(strings).toEqual(['hello world', 'foo bar'])
    })

    it('should convert to text strings with newlines', () => {
      const r1 = new Ripple()
      const r2 = new Ripple()
      r1.addStrings(['line', 'one'])
      r2.addStrings(['line', 'two'])

      ripples.add(r1)
      ripples.add(r2)

      const textStrings = ripples.toTextStrings()
      expect(textStrings[0]).toBe('line one\n')
      expect(textStrings[1]).toBe('line two\n')
    })
  })
})
