import { beforeEach, describe, expect, it } from 'vitest'
import { Ripple } from '../utils/ripple'
import { Utils } from '../utils/utils'
import { Math1 } from './math1'

describe('Math1', () => {
  let math1: Math1
  let utils: Utils

  beforeEach(() => {
    math1 = new Math1()
    utils = new Utils()
  })

  describe('init', () => {
    it('should initialize cuboidId', () => {
      math1.init(42)
      expect(math1.cuboidId).toBe(42)
    })

    it('should update cuboidId when called multiple times', () => {
      math1.init(10)
      expect(math1.cuboidId).toBe(10)
      math1.init(20)
      expect(math1.cuboidId).toBe(20)
    })
  })

  describe('createL3', () => {
    it('should create L3 ripple with three values', () => {
      const result = math1.createL3('divide', 'x', '5')

      expect(result.count()).toBe(4)
      expect(result.s(0)).toBe('l3')
      expect(result.s(1)).toBe('divide')
      expect(result.s(2)).toBe('x')
      expect(result.s(3)).toBe('5')
    })

    it('should handle empty strings', () => {
      const result = math1.createL3('', '', '')

      expect(result.count()).toBe(4)
      expect(result.s(0)).toBe('l3')
      expect(result.s(1)).toBe('')
      expect(result.s(2)).toBe('')
      expect(result.s(3)).toBe('')
    })

    it('should handle numeric strings', () => {
      const result = math1.createL3('add', '10', '20')

      expect(result.s(0)).toBe('l3')
      expect(result.s(1)).toBe('add')
      expect(result.s(2)).toBe('10')
      expect(result.s(3)).toBe('20')
    })
  })

  describe('calculate', () => {
    it('should process l3 function', () => {
      math1.init(100)
      const function1 = math1.createL3('divide', 'x', '10')
      const result = math1.calculate(function1)

      expect(result.count()).toBe(1)
      expect(result.s(0)).toBe('110')
    })

    it('should return empty ripple for unknown operator', () => {
      const unknownFunction = new Ripple()
      unknownFunction.add('unknown')
      unknownFunction.add('test')

      const result = math1.calculate(unknownFunction)
      expect(result.count()).toBe(0)
    })

    it('should handle complex tokenization', () => {
      const complexFunction = new Ripple()
      complexFunction.addStrings(['l3', 'divide', 'variable', '25'])

      math1.init(75)
      const result = math1.calculate(complexFunction)
      expect(result.s(0)).toBe('100')
    })
  })

  describe('l3', () => {
    it('should process divide operation', () => {
      math1.init(50)
      const divideFunction = new Ripple()
      divideFunction.addStrings(['l3', 'divide', 'y', '30'])

      const result = math1.l3(divideFunction)
      expect(result.count()).toBe(1)
      expect(result.s(0)).toBe('80')
    })

    it('should return empty ripple for unsupported operation', () => {
      const unsupportedFunction = new Ripple()
      unsupportedFunction.addStrings(['l3', 'multiply', 'z', '10'])

      const result = math1.l3(unsupportedFunction)
      expect(result.count()).toBe(0)
    })
  })

  describe('bwDiv', () => {
    it('should return empty ripple for divide operation', () => {
      const divFunction = new Ripple()
      divFunction.addStrings(['l3', 'divide', 'x', '5'])

      const result = math1.bwDiv(divFunction)
      expect(result.count()).toBe(0)
    })

    it('should return empty ripple for other operations', () => {
      const otherFunction = new Ripple()
      otherFunction.addStrings(['l3', 'add', 'x', '5'])

      const result = math1.bwDiv(otherFunction)
      expect(result.count()).toBe(0)
    })
  })

  describe('div', () => {
    it('should add operand to cuboidId', () => {
      math1.init(100)
      const divFunction = new Ripple()
      divFunction.addStrings(['l3', 'divide', 'x', '50'])

      const result = math1.div(divFunction)
      expect(result.count()).toBe(1)
      expect(result.s(0)).toBe('150')
    })

    it('should handle negative operands', () => {
      math1.init(100)
      const divFunction = new Ripple()
      divFunction.addStrings(['l3', 'divide', 'x', '-30'])

      const result = math1.div(divFunction)
      expect(result.s(0)).toBe('70')
    })

    it('should handle zero operand', () => {
      math1.init(42)
      const divFunction = new Ripple()
      divFunction.addStrings(['l3', 'divide', 'x', '0'])

      const result = math1.div(divFunction)
      expect(result.s(0)).toBe('42')
    })

    it('should handle decimal operands by flooring', () => {
      math1.init(100)
      const divFunction = new Ripple()
      divFunction.addStrings(['l3', 'divide', 'x', '25.7'])

      const result = math1.div(divFunction)
      expect(result.s(0)).toBe('125')
    })
  })

  describe('deriveX', () => {
    it('should derive X from Y and function', () => {
      const Y = new Ripple()
      Y.add('150')

      const functionRipple = new Ripple()
      functionRipple.addStrings(['l3', 'divide', 'x', '50'])

      const result = math1.deriveX(Y, functionRipple)
      expect(result.count()).toBe(1)
      expect(result.s(0)).toBe('100')
    })

    it('should handle negative results', () => {
      const Y = new Ripple()
      Y.add('30')

      const functionRipple = new Ripple()
      functionRipple.addStrings(['l3', 'divide', 'x', '50'])

      const result = math1.deriveX(Y, functionRipple)
      expect(result.s(0)).toBe('-20')
    })

    it('should handle zero Y value', () => {
      const Y = new Ripple()
      Y.add('0')

      const functionRipple = new Ripple()
      functionRipple.addStrings(['l3', 'divide', 'x', '25'])

      const result = math1.deriveX(Y, functionRipple)
      expect(result.s(0)).toBe('-25')
    })

    it('should handle complex function strings', () => {
      const Y = new Ripple()
      Y.add('200')

      const complexFunction = new Ripple()
      complexFunction.add('l3')
      complexFunction.add('divide')
      complexFunction.add('variable_name')
      complexFunction.add('75')

      const result = math1.deriveX(Y, complexFunction)
      expect(result.s(0)).toBe('125')
    })
  })

  describe('integration tests', () => {
    it('should perform round-trip calculation and derivation', () => {
      math1.init(100)

      const function1 = math1.createL3('divide', 'x', '50')
      const Y = math1.calculate(function1)
      expect(Y.s(0)).toBe('150')

      const derivedX = math1.deriveX(Y, function1)
      expect(derivedX.s(0)).toBe('100')
    })

    it('should handle chain of operations', () => {
      math1.init(25)

      const func1 = math1.createL3('divide', 'x', '15')
      const result1 = math1.calculate(func1)
      expect(result1.s(0)).toBe('40')

      math1.init(parseInt(result1.s(0)))
      const func2 = math1.createL3('divide', 'y', '10')
      const result2 = math1.calculate(func2)
      expect(result2.s(0)).toBe('50')
    })
  })
})
