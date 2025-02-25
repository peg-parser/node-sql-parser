import { exprToSQL } from './expr'
import { valuesToSQL } from './insert'
import { commonOptionConnector, hasVal, identifierToSql, literalToSQL, toUpper } from './util'

function unnestToSQL(unnestExpr) {
  const { type, as, expr, with_offset: withOffset } = unnestExpr
  const result = [
    `${toUpper(type)}(${expr && exprToSQL(expr) || ''})`,
    commonOptionConnector('AS', identifierToSql, as),
    commonOptionConnector(
      toUpper(withOffset && withOffset.keyword),
      identifierToSql,
      withOffset && withOffset.as
    ),
  ]
  return result.filter(hasVal).join(' ')
}

function tableToSQL(tableInfo) {
  if (toUpper(tableInfo.type) === 'UNNEST') return unnestToSQL(tableInfo)
  const { table, db, as, expr, schema, tablesample } = tableInfo
  const database = identifierToSql(db)
  const schemaStr = identifierToSql(schema)
  let tableName = table && identifierToSql(table)
  if (expr && expr.type === 'values') {
    const { parentheses, values } = expr
    const valueSQL = [parentheses && '(', '', parentheses && ')']
    valueSQL[1] = `${commonOptionConnector('VALUES', valuesToSQL, values)}`
    tableName = valueSQL.filter(hasVal).join('')
  }
  if (expr && expr.type !== 'values') tableName = exprToSQL(expr)
  const str = [database, schemaStr, tableName].filter(hasVal).join('.')
  const result = [str]
  if (tablesample) {
    const tableSampleSQL = [
      'TABLESAMPLE',
      exprToSQL(tablesample.expr),
      literalToSQL(tablesample.repeatable),
    ].filter(hasVal).join(' ')
    result.push(tableSampleSQL)
  }
  if (as) result.push('AS', identifierToSql(as))
  return result.join(' ')
}

/**
 * @param {Array} tables
 * @return {string}
 */
function tablesToSQL(tables) {
  const baseTable = tables[0]
  const clauses = []
  if (baseTable.type === 'dual') return 'DUAL'
  clauses.push(tableToSQL(baseTable))
  for (let i = 1; i < tables.length; ++i) {
    const joinExpr = tables[i]
    const { on, using, join } = joinExpr
    const str = []
    str.push(join ? ` ${join}` : ',')
    str.push(tableToSQL(joinExpr))
    str.push(commonOptionConnector('ON', exprToSQL, on))
    if (using) str.push(`USING (${using.map(identifierToSql).join(', ')})`)
    clauses.push(str.filter(hasVal).join(' '))
  }
  return clauses.filter(hasVal).join('')
}

function tableOptionToSQL(tableOption) {
  const { keyword, symbol, value } = tableOption
  const sql = [keyword.toUpperCase()]
  if (symbol) sql.push(symbol)
  sql.push(value)
  return sql.join(' ')
}

export {
  tablesToSQL,
  tableOptionToSQL,
  tableToSQL,
  unnestToSQL,
}
