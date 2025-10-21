import { Ripple } from '../utils/ripple'
import { Utils } from '../utils/utils'

export class Math1 {
  private utils: Utils = new Utils()
  public cuboidId: number = 0

  init(cuboidId: number): void {
    this.cuboidId = cuboidId
  }

  createL3(v1: string, v2: string, v3: string): Ripple {
    const result = new Ripple()
    result.add('l3')
    result.add(v1)
    result.add(v2)
    result.add(v3)
    return result
  }

  calculate(functionRipple: Ripple): Ripple {
    const fnString = functionRipple.toString()
    const parsedFunction = this.utils.tokenizeAndRipple(fnString)

    const operator = parsedFunction.s(0)

    let result = new Ripple()
    switch (operator) {
      case 'l3':
        result = this.l3(parsedFunction)
        break
      default:
        break
    }
    return result
  }

  l3(functionRipple: Ripple): Ripple {
    const operator = functionRipple.s(1)
    let result = new Ripple()

    switch (operator) {
      case 'divide':
        result = this.div(functionRipple)
        break
      default:
        break
    }
    return result
  }

  bwDiv(functionRipple: Ripple): Ripple {
    const operator = functionRipple.s(1)
    const result = new Ripple()

    switch (operator) {
      case 'divide':
        break
      default:
        break
    }
    return result
  }

  div(functionRipple: Ripple): Ripple {
    const result = new Ripple()
    const operand = this.utils.convertToInt(functionRipple.s(3))
    const intResult = this.cuboidId + operand
    result.add(intResult.toString())
    return result
  }

  deriveX(Y: Ripple, functionRipple: Ripple): Ripple {
    const result = new Ripple()
    const fnString = functionRipple.toString()
    const parsedFunction = this.utils.tokenizeAndRipple(fnString)
    const yInt = this.utils.convertToInt(Y.s(0))
    const operand = this.utils.convertToInt(parsedFunction.s(3))
    const cuboidId = yInt - operand
    result.add(cuboidId.toString())
    return result
  }
}
