import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Ripple, Ripples } from './ripple.js'
import { Utils } from './utils.js'

describe('Utils', () => {
  let utils: Utils

  beforeEach(() => {
    utils = new Utils()
  })

  describe('tokenize', () => {
    it('should tokenize string by spaces', () => {
      const result = utils.tokenize('hello world test')
      expect(result).toEqual(['hello', 'world', 'test'])
    })

    it('should handle multiple spaces', () => {
      const result = utils.tokenize('hello   world    test')
      expect(result).toEqual(['hello', 'world', 'test'])
    })

    it('should handle leading and trailing spaces', () => {
      const result = utils.tokenize('  hello world  ')
      expect(result).toEqual(['hello', 'world'])
    })

    it('should handle single word', () => {
      const result = utils.tokenize('hello')
      expect(result).toEqual(['hello'])
    })

    it('should handle empty string', () => {
      const result = utils.tokenize('')
      expect(result).toEqual([])
    })

    it('should handle only spaces', () => {
      const result = utils.tokenize('   ')
      expect(result).toEqual([])
    })
  })

  describe('convertToInt', () => {
    it('should convert string to integer', () => {
      expect(utils.convertToInt('42')).toBe(42)
      expect(utils.convertToInt('42.7')).toBe(42)
      expect(utils.convertToInt('42.2')).toBe(42)
    })

    it('should handle negative numbers', () => {
      expect(utils.convertToInt('-42')).toBe(-42)
      expect(utils.convertToInt('-42.7')).toBe(-43)
    })

    it('should return 0 for null', () => {
      expect(utils.convertToInt(null)).toBe(0)
    })

    it('should handle invalid strings', () => {
      expect(utils.convertToInt('abc')).toBeNaN()
    })

    it('should handle zero', () => {
      expect(utils.convertToInt('0')).toBe(0)
    })
  })

  describe('stringToRipple', () => {
    it('should create ripple from string', () => {
      const ripple = utils.stringToRipple('test')
      expect(ripple.count()).toBe(1)
      expect(ripple.s(0)).toBe('test')
    })
  })

  describe('tokenizeAndRipple', () => {
    it('should tokenize and create ripple', () => {
      const ripple = utils.tokenizeAndRipple('hello world test')
      expect(ripple.count()).toBe(3)
      expect(ripple.s(0)).toBe('hello')
      expect(ripple.s(1)).toBe('world')
      expect(ripple.s(2)).toBe('test')
    })

    it('should handle empty string', () => {
      const ripple = utils.tokenizeAndRipple('')
      expect(ripple.count()).toBe(0)
    })
  })

  describe('searchInRipplesList', () => {
    it('should find token in ripples list', () => {
      const ripples1 = new Ripples()
      const ripples2 = new Ripples()
      const r1 = new Ripple()
      const r2 = new Ripple()
      const r3 = new Ripple()

      r1.addStrings(['apple', 'banana'])
      r2.addStrings(['cherry', 'date'])
      r3.addStrings(['elderberry', 'fig'])

      ripples1.add(r1)
      ripples1.add(r2)
      ripples2.add(r3)

      const list = [ripples1, ripples2]
      const result = utils.searchInRipplesList(list, 'cherry')

      expect(result.count()).toBe(1)
      expect(result.r(0).s(0)).toBe('0')
      expect(result.r(0).s(1)).toBe('1')
    })

    it('should return empty ripples if token not found', () => {
      const ripples1 = new Ripples()
      const r1 = new Ripple()
      r1.addStrings(['apple', 'banana'])
      ripples1.add(r1)

      const list = [ripples1]
      const result = utils.searchInRipplesList(list, 'grape')

      expect(result.count()).toBe(0)
    })
  })

  describe('extractRipples', () => {
    it('should extract ripples based on indexes', () => {
      const ripples1 = new Ripples()
      const ripples2 = new Ripples()
      const r1 = new Ripple()
      const r2 = new Ripple()
      const r3 = new Ripple()

      r1.add('first')
      r2.add('second')
      r3.add('third')

      ripples1.add(r1)
      ripples1.add(r2)
      ripples2.add(r3)

      const list = [ripples1, ripples2]

      const indexes = new Ripples()
      const index1 = new Ripple()
      const index2 = new Ripple()
      index1.addStrings(['0', '1'])
      index2.addStrings(['1', '0'])
      indexes.add(index1)
      indexes.add(index2)

      const result = utils.extractRipples(list, indexes)
      expect(result.count()).toBe(2)
      expect(result.r(0).s(0)).toBe('second')
      expect(result.r(1).s(0)).toBe('third')
    })
  })

  describe('message functions', () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    })

    afterEach(() => {
      consoleSpy.mockRestore()
    })

    it('messageRipples2 should log ripples with newlines', () => {
      const ripples = new Ripples()
      const r1 = new Ripple()
      const r2 = new Ripple()
      r1.addStrings(['hello', 'world'])
      r2.addStrings(['foo', 'bar'])
      ripples.add(r1)
      ripples.add(r2)

      utils.messageRipples2(ripples)
      expect(consoleSpy).toHaveBeenCalledWith('hello world\nfoo bar\n')
    })

    it('messageRipples should log ripples with separators', () => {
      const ripples = new Ripples()
      const r1 = new Ripple()
      const r2 = new Ripple()
      r1.addStrings(['hello', 'world'])
      r2.addStrings(['foo', 'bar'])
      ripples.add(r1)
      ripples.add(r2)

      utils.messageRipples(ripples)
      expect(consoleSpy).toHaveBeenCalledWith('hello world || foo bar || ')
    })

    it('messageListOfRipples should log each ripples', () => {
      const ripples1 = new Ripples()
      const ripples2 = new Ripples()
      const r1 = new Ripple()
      const r2 = new Ripple()
      r1.add('first')
      r2.add('second')
      ripples1.add(r1)
      ripples2.add(r2)

      utils.messageListOfRipples([ripples1, ripples2])
      expect(consoleSpy).toHaveBeenCalledTimes(2)
    })

    it('messageListOfRipples2 should log all ripples with newlines', () => {
      const ripples1 = new Ripples()
      const ripples2 = new Ripples()
      const r1 = new Ripple()
      const r2 = new Ripple()
      r1.add('first')
      r2.add('second')
      ripples1.add(r1)
      ripples2.add(r2)

      utils.messageListOfRipples2([ripples1, ripples2])
      expect(consoleSpy).toHaveBeenCalledWith('first || \nsecond || \n')
    })
  })

  describe('ripplesToString', () => {
    it('should convert ripples to string', () => {
      const ripples = new Ripples()
      const r1 = new Ripple()
      const r2 = new Ripple()
      r1.addStrings(['hello', 'world'])
      r2.addStrings(['foo', 'bar'])
      ripples.add(r1)
      ripples.add(r2)

      const result = utils.ripplesToString(ripples)
      expect(result).toBe('hello world || foo bar || ')
    })
  })

  describe('rippleToRipples', () => {
    it('should convert ripple to ripples', () => {
      const ripple = new Ripple()
      ripple.addStrings(['test', 'data'])

      const ripples = utils.rippleToRipples(ripple)
      expect(ripples.count()).toBe(1)
      expect(ripples.r(0)).toBe(ripple)
    })
  })

  describe('ripplesToRipple', () => {
    it('should merge ripples into single ripple', () => {
      const ripples = new Ripples()
      const r1 = new Ripple()
      const r2 = new Ripple()
      r1.addStrings(['hello', 'world'])
      r2.addStrings(['foo', 'bar'])
      ripples.add(r1)
      ripples.add(r2)

      const result = utils.ripplesToRipple(ripples)
      expect(result.count()).toBe(4)
      expect(result.s(0)).toBe('hello')
      expect(result.s(1)).toBe('world')
      expect(result.s(2)).toBe('foo')
      expect(result.s(3)).toBe('bar')
    })
  })

  describe('listOfRipplesToRipples', () => {
    it('should combine list of ripples into single ripples', () => {
      const ripples1 = new Ripples()
      const ripples2 = new Ripples()
      const r1 = new Ripple()
      const r2 = new Ripple()
      const r3 = new Ripple()

      r1.add('first')
      r2.add('second')
      r3.add('third')

      ripples1.add(r1)
      ripples1.add(r2)
      ripples2.add(r3)

      const result = utils.listOfRipplesToRipples([ripples1, ripples2])
      expect(result.count()).toBe(3)
      expect(result.r(0).s(0)).toBe('first')
      expect(result.r(1).s(0)).toBe('second')
      expect(result.r(2).s(0)).toBe('third')
    })
  })
})
