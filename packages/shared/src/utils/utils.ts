import { Ripple, Ripples } from './ripple'

export class Utils {
  tokenize(s: string): string[] {
    const tokens: string[] = []
    let currentToken = ''

    for (let i = 0; i < s.length; i++) {
      const c = s[i]

      if (c !== ' ') {
        currentToken += c
      } else {
        if (currentToken !== '') {
          tokens.push(currentToken)
          currentToken = ''
        }
      }
    }

    if (currentToken !== '') {
      tokens.push(currentToken)
    }

    return tokens
  }

  convertToInt(s: string | null): number {
    if (s === null || s === undefined) {
      return 0
    }
    const num = parseFloat(s)
    return Math.floor(num)
  }

  stringToRipple(s: string): Ripple {
    const ripple = new Ripple()
    ripple.add(s)
    return ripple
  }

  tokenizeAndRipple(s: string): Ripple {
    const tokens = this.tokenize(s)
    const ripple = new Ripple()

    for (const token of tokens) {
      ripple.add(token)
    }

    return ripple
  }

  searchInRipplesList(list: Ripples[], token: string): Ripples {
    const result = new Ripples()

    for (let i = 0; i < list.length; i++) {
      const index = list[i].rippleByToken(token)
      if (index !== -1) {
        const ripple = new Ripple()
        ripple.add(i.toString())
        ripple.add(index.toString())
        result.add(ripple)
      }
    }

    return result
  }

  extractRipples(list: Ripples[], indexes: Ripples): Ripples {
    const result = new Ripples()

    for (let i = 0; i < indexes.count(); i++) {
      const ripplesIndex = this.convertToInt(indexes.r(i).s(0))
      const rippleIndex = this.convertToInt(indexes.r(i).s(1))
      const ripple = list[ripplesIndex].r(rippleIndex)
      result.add(ripple)
    }

    return result
  }

  messageRipples2(ripples: Ripples): void {
    let message = ''
    for (let i = 0; i < ripples.count(); i++) {
      message += ripples.r(i).toString()
      message += '\n'
    }
    console.log(message)
  }

  messageRipples(ripples: Ripples): void {
    let message = ''
    for (let i = 0; i < ripples.count(); i++) {
      message += ripples.r(i).toString()
      message += ' || '
    }
    console.log(message)
  }

  ripplesToString(ripples: Ripples): string {
    let result = ''
    for (let i = 0; i < ripples.count(); i++) {
      result += ripples.r(i).toString()
      result += ' || '
    }
    return result
  }

  messageListOfRipples(ripplesList: Ripples[]): void {
    for (const ripples of ripplesList) {
      this.messageRipples(ripples)
    }
  }

  rippleToRipples(ripple: Ripple): Ripples {
    const ripples = new Ripples()
    ripples.add(ripple)
    return ripples
  }

  ripplesToRipple(ripples: Ripples): Ripple {
    const ripple = new Ripple()
    for (let i = 0; i < ripples.count(); i++) {
      ripple.appendRipple(ripples.r(i))
    }
    return ripple
  }

  messageListOfRipples2(ripplesList: Ripples[]): void {
    let message = ''
    for (const ripples of ripplesList) {
      message += this.ripplesToString(ripples)
      message += '\n'
    }
    console.log(message)
  }

  listOfRipplesToRipples(ripplesList: Ripples[]): Ripples {
    const result = new Ripples()
    for (const ripples of ripplesList) {
      result.append(ripples)
    }
    return result
  }
}
