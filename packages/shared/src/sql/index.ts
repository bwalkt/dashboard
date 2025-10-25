// https://github.com/felixfbecker/node-sql-template-strings

export class SQLStatement {
  strings: string[]
  values?: any[]
  bind?: any[]
  name?: string

  constructor(strings: string[], values: any[]) {
    this.strings = strings
    this.values = values
  }

  /** Returns the SQL Statement for Sequelize */
  get query(): string {
    return this.bind ? this.text : this.sql
  }

  /** Returns the SQL Statement for node-postgres */
  get text(): string {
    return this.strings.reduce((prev, curr, i) => prev + '$' + i + curr)
  }

  /** Returns the SQL Statement for mysql */
  get sql(): string {
    return this.strings.join('?')
  }

  append(statement: SQLStatement | string): this {
    if (statement instanceof SQLStatement) {
      this.strings[this.strings.length - 1] += statement.strings[0]
      this.strings.push(...statement.strings.slice(1))
      const list = this.values || this.bind
      if (list) {
        list.push(...statement.values || [])
      }
    } else {
      this.strings[this.strings.length - 1] += statement
    }
    return this
  }

  /**
   * Use a prepared statement with Sequelize.
   * Makes `query` return a query with `$n` syntax instead of `?` and switches the `values` key name to `bind`
   */
  useBind(value: boolean = true): this {
    if (value && !this.bind) {
      this.bind = this.values
      delete this.values
    } else if (!value && this.bind) {
      this.values = this.bind
      delete this.bind
    }
    return this
  }

  setName(name: string): this {
    this.name = name
    return this
  }
}

export function SQL(strings: TemplateStringsArray | string[], ...values: any[]): SQLStatement {
  return new SQLStatement([...strings], values)
}

export default SQL
