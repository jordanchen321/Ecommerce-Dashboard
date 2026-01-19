/**
 * Formula evaluator with order of operations support
 * Supports: +, -, *, /, parentheses, and column references
 */

interface Product {
  [key: string]: any
}

/**
 * Evaluates a formula expression for a given product
 * @param formula - Formula string (e.g., "price * quantity", "(price - discount) * quantity")
 * @param product - Product object to get values from
 * @param availableColumns - List of available column field names
 * @returns Calculated result or null if error
 */
export function evaluateFormula(
  formula: string,
  product: Product,
  availableColumns: string[]
): number | null {
  try {
    // Replace column names with their values
    let expression = formula.trim()
    
    // Get all column names from available columns (should already be filtered to numeric only)
    // But we'll double-check here for safety
    const columnNames = availableColumns.filter(col => 
      col !== 'actions' && col !== 'totalValue'
    )
    
    // First, check which columns are actually referenced in the formula
    const referencedColumns: string[] = []
    const sortedColumns = columnNames.sort((a, b) => b.length - a.length)
    
    for (const colName of sortedColumns) {
      const regex = new RegExp(`\\b${escapeRegex(colName)}\\b`, 'gi')
      if (regex.test(expression)) {
        referencedColumns.push(colName)
      }
    }
    
    // Check if all referenced columns have valid values
    // If any referenced column is missing/empty/null, return null (empty)
    for (const colName of referencedColumns) {
      const value = product[colName]
      
      // Check if value is missing, null, undefined, or empty string
      if (value === undefined || value === null || value === '') {
        return null // Return null to indicate empty (not an error, just missing data)
      }
      
      // For string values, check if they're valid numbers
      if (typeof value === 'string') {
        const parsed = parseFloat(value)
        if (isNaN(parsed)) {
          return null // Invalid number string, treat as empty
        }
      }
    }
    
    // All referenced columns have values, proceed with calculation
    // Replace column names with their numeric values
    for (const colName of sortedColumns) {
      const value = product[colName]
      let numValue: number
      
      if (value === undefined || value === null) {
        numValue = 0
      } else if (typeof value === 'number') {
        numValue = value
      } else if (typeof value === 'string') {
        numValue = parseFloat(value) || 0
      } else {
        numValue = 0
      }
      
      // Replace column name with its value (case-insensitive, word boundary aware)
      // Use regex to match whole words only
      const regex = new RegExp(`\\b${escapeRegex(colName)}\\b`, 'gi')
      expression = expression.replace(regex, numValue.toString())
    }
    
    // Validate expression contains only numbers, operators, spaces, and parentheses
    const validPattern = /^[\d\s+\-*/().]+$/
    if (!validPattern.test(expression)) {
      console.warn(`[Formula] Invalid characters in expression: ${expression}`)
      return null
    }
    
    // Evaluate the expression safely
    // Using Function constructor is safer than eval for this use case
    try {
      // Remove all spaces
      expression = expression.replace(/\s+/g, '')
      
      // Use a safe evaluation method
      const result = evaluateExpression(expression)
      return typeof result === 'number' && !isNaN(result) ? result : null
    } catch (error) {
      console.warn(`[Formula] Evaluation error:`, error)
      return null
    }
  } catch (error) {
    console.error(`[Formula] Formula evaluation failed:`, error)
    return null
  }
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Evaluate a mathematical expression with proper order of operations
 * Supports: +, -, *, /, parentheses
 * Order: Parentheses > Multiplication/Division > Addition/Subtraction
 */
function evaluateExpression(expr: string): number {
  // Remove all spaces
  expr = expr.replace(/\s+/g, '')
  
  // Handle parentheses first (innermost first)
  while (expr.includes('(')) {
    const start = expr.lastIndexOf('(')
    const end = expr.indexOf(')', start)
    
    if (end === -1) {
      throw new Error('Mismatched parentheses')
    }
    
    const innerExpr = expr.substring(start + 1, end)
    const innerResult = evaluateSimpleExpression(innerExpr)
    expr = expr.substring(0, start) + innerResult.toString() + expr.substring(end + 1)
  }
  
  // Evaluate the remaining expression
  return evaluateSimpleExpression(expr)
}

/**
 * Evaluate expression without parentheses
 * Order: Multiplication/Division first (left to right), then Addition/Subtraction (left to right)
 */
function evaluateSimpleExpression(expr: string): number {
  if (!expr) return 0
  
  // Remove all spaces
  expr = expr.replace(/\s+/g, '')
  
  // Handle negative numbers at the start
  if (expr.startsWith('-')) {
    expr = '0' + expr
  }
  
  // Parse into tokens (numbers and operators)
  const tokens: (number | string)[] = []
  let current = ''
  
  for (let i = 0; i < expr.length; i++) {
    const char = expr[i]
    if (char === '+' || char === '-' || char === '*' || char === '/') {
      if (current) {
        tokens.push(parseFloat(current))
        current = ''
      }
      tokens.push(char)
    } else if (char === '.' || (char >= '0' && char <= '9')) {
      current += char
    } else {
      throw new Error(`Invalid character: ${char}`)
    }
  }
  
  if (current) {
    tokens.push(parseFloat(current))
  }
  
  // Handle multiplication and division first (left to right)
  let i = 0
  while (i < tokens.length) {
    if (tokens[i] === '*' || tokens[i] === '/') {
      const left = tokens[i - 1] as number
      const right = tokens[i + 1] as number
      const op = tokens[i] as string
      
      if (typeof left !== 'number' || typeof right !== 'number') {
        throw new Error('Invalid expression')
      }
      
      let result: number
      if (op === '*') {
        result = left * right
      } else {
        if (right === 0) throw new Error('Division by zero')
        result = left / right
      }
      
      // Replace the three tokens with the result
      tokens.splice(i - 1, 3, result)
      i-- // Stay at the same position since we replaced tokens
    } else {
      i++
    }
  }
  
  // Handle addition and subtraction (left to right)
  let result = tokens[0] as number
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i] as string
    const num = tokens[i + 1] as number
    
    if (typeof num !== 'number') {
      throw new Error('Invalid expression')
    }
    
    if (op === '+') {
      result += num
    } else if (op === '-') {
      result -= num
    } else {
      throw new Error(`Unexpected operator: ${op}`)
    }
  }
  
  return result
}
