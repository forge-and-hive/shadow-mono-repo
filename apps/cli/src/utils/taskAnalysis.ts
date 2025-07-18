import * as ts from 'typescript'

interface TaskLocation {
  file: string
  line: number
  column: number
}

interface SchemaProperty {
  type: string
  optional?: boolean
  default?: string
}

interface InputSchema {
  type: string
  properties: Record<string, SchemaProperty>
}

interface OutputType {
  type: string
  properties?: Record<string, SchemaProperty>
}

interface TaskFingerprint {
  name: string
  description?: string
  location: TaskLocation
  inputSchema: InputSchema
  outputType: OutputType
  boundaries: string[]
  hash: string
}

// Simplified interface for filesystem output (excludes name, location, hash)
export interface TaskFingerprintOutput {
  description?: string
  inputSchema: InputSchema
  outputType: OutputType
  boundaries: string[]
}

// Hash generation function
function generateHash(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}

// TypeScript AST analysis function
function extractTaskFingerprints(sourceCode: string, filePath: string): TaskFingerprint[] {
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceCode,
    ts.ScriptTarget.Latest,
    true
  )

  const fingerprints: TaskFingerprint[] = []
  let schemaNode: ts.Expression | null = null
  let boundariesNode: ts.Expression | null = null

  // First pass: find schema and boundaries variable declarations
  function findVariables(node: ts.Node): void {
    if (ts.isVariableStatement(node)) {
      node.declarationList.declarations.forEach(decl => {
        if (ts.isIdentifier(decl.name)) {
          if (decl.name.text === 'schema' && decl.initializer) {
            schemaNode = decl.initializer
          } else if (decl.name.text === 'boundaries' && decl.initializer) {
            boundariesNode = decl.initializer
          }
        }
      })
    }
    ts.forEachChild(node, findVariables)
  }

  // Second pass: find createTask calls
  function findCreateTask(node: ts.Node): void {
    // Look for createTask calls
    if (ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'createTask') {

      const taskName = extractTaskName(node, sourceFile)
      if (taskName) {
        const fingerprint = analyzeCreateTaskCall(node, sourceFile, filePath, taskName, schemaNode, boundariesNode)
        if (fingerprint) {
          fingerprints.push(fingerprint)
        }
      }
    }

    // Look for exported createTask assignments
    if (ts.isVariableStatement(node) && node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
      node.declarationList.declarations.forEach(decl => {
        if (ts.isVariableDeclaration(decl) &&
          decl.initializer &&
          ts.isCallExpression(decl.initializer) &&
          ts.isIdentifier(decl.initializer.expression) &&
          decl.initializer.expression.text === 'createTask') {

          const taskName = ts.isIdentifier(decl.name) ? decl.name.text : 'unknown'
          const fingerprint = analyzeCreateTaskCall(decl.initializer, sourceFile, filePath, taskName, schemaNode, boundariesNode)
          if (fingerprint) {
            fingerprints.push(fingerprint)
          }
        }
      })
    }

    ts.forEachChild(node, findCreateTask)
  }

  // Execute both passes
  findVariables(sourceFile)
  findCreateTask(sourceFile)

  return fingerprints
}

function extractTaskName(node: ts.CallExpression, _sourceFile: ts.SourceFile): string | null {
  // Try to find the task name from variable assignment or export
  let parent = node.parent
  while (parent) {
    if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
      return parent.name.text
    }
    parent = parent.parent
  }
  return null
}

function analyzeCreateTaskCall(
  node: ts.CallExpression,
  sourceFile: ts.SourceFile,
  filePath: string,
  taskName: string,
  schemaNode: ts.Expression | null = null,
  boundariesNode: ts.Expression | null = null
): TaskFingerprint | null {
  try {
    const position = sourceFile.getLineAndCharacterOfPosition(node.getStart())
    const args = node.arguments

    // Analyze createTask({ schema, boundaries, fn }) structure
    let inputSchema: InputSchema = { type: 'object', properties: {} }
    let boundaries: string[] = []
    let boundaryTypes: Map<string, string> = new Map()

    if (args[0] && ts.isObjectLiteralExpression(args[0])) {
      const schemaProperty = args[0].properties.find(prop => 
        ts.isPropertyAssignment(prop) && 
        ts.isIdentifier(prop.name) && 
        prop.name.text === 'schema'
      )
      const boundariesProperty = args[0].properties.find(prop => 
        ts.isPropertyAssignment(prop) && 
        ts.isIdentifier(prop.name) && 
        prop.name.text === 'boundaries'
      )

      if (schemaNode) {
        inputSchema = analyzeSchemaArg(schemaNode, sourceFile)
      } else if (schemaProperty && ts.isPropertyAssignment(schemaProperty)) {
        inputSchema = analyzeSchemaArg(schemaProperty.initializer, sourceFile)
      }

      if (boundariesNode) {
        const boundaryInfo = analyzeBoundariesWithTypes(boundariesNode, sourceFile)
        boundaries = boundaryInfo.names
        boundaryTypes = boundaryInfo.types
      } else if (boundariesProperty && ts.isPropertyAssignment(boundariesProperty)) {
        const boundaryInfo = analyzeBoundariesWithTypes(boundariesProperty.initializer, sourceFile)
        boundaries = boundaryInfo.names
        boundaryTypes = boundaryInfo.types
      }
    }

    // Extract function output type with better detection
    let outputType: OutputType = { type: 'unknown' }
    let functionArg: ts.Expression | undefined

    // Extract function from createTask({ fn }) structure
    if (args[0] && ts.isObjectLiteralExpression(args[0])) {
      const fnProperty = args[0].properties.find(prop => 
        ts.isPropertyAssignment(prop) && 
        ts.isIdentifier(prop.name) && 
        prop.name.text === 'fn'
      )
      if (fnProperty && ts.isPropertyAssignment(fnProperty)) {
        functionArg = fnProperty.initializer
      }
    }

    if (functionArg) {
      if (ts.isFunctionExpression(functionArg) || ts.isArrowFunction(functionArg)) {
        // Better return type extraction
        if (functionArg.type) {
          const typeString = cleanTypeString(functionArg.type.getText(sourceFile))
          outputType = { type: typeString }
        } else {
          // Try to infer from return statements with boundary type information
          outputType = inferDetailedReturnType(functionArg, sourceFile, boundaryTypes)
        }
      }
    }

    // Generate hash from task signature
    const hashInput = `${taskName}:${JSON.stringify(inputSchema)}:${JSON.stringify(boundaries)}`
    const hash = generateHash(hashInput)

    return {
      name: taskName,
      location: {
        file: filePath,
        line: position.line + 1,
        column: position.character + 1
      },
      inputSchema,
      outputType,
      boundaries,
      hash
    }
  } catch (error) {
    console.warn(`Failed to analyze createTask call for ${taskName}:`, error)
    return null
  }
}

// Enhanced return type inference with detailed object analysis
function inferDetailedReturnType(func: ts.FunctionExpression | ts.ArrowFunction, sourceFile: ts.SourceFile, boundaryTypes: Map<string, string> = new Map()): OutputType {
  let returnType: OutputType = { type: 'unknown' }

  // First, collect variable declarations and their types within the function
  const variableTypes = new Map<string, string>()

  function collectVariableDeclarations(node: ts.Node): void {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const varName = node.name.text
      const varType = inferTypeFromExpression(node.initializer, sourceFile, variableTypes, boundaryTypes)
      variableTypes.set(varName, varType)
    }
    ts.forEachChild(node, collectVariableDeclarations)
  }

  function visitReturnStatements(node: ts.Node): void {
    if (ts.isReturnStatement(node) && node.expression) {
      if (ts.isObjectLiteralExpression(node.expression)) {
        // Analyze object literal properties
        const properties: Record<string, SchemaProperty> = {}
        node.expression.properties.forEach(prop => {
          if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
            // Handle explicit property assignments: { propName: value }
            const propName = prop.name.text
            const propType = inferTypeFromExpression(prop.initializer, sourceFile, variableTypes, boundaryTypes)
            properties[propName] = { type: propType }
          } else if (ts.isShorthandPropertyAssignment(prop)) {
            // Handle shorthand properties: { propName } (equivalent to { propName: propName })
            const propName = prop.name.text
            const propType = variableTypes.get(propName) || inferTypeFromIdentifier(prop.name.text, boundaryTypes)
            properties[propName] = { type: propType }
          }
        })

        if (Object.keys(properties).length > 0) {
          returnType = {
            type: 'object',
            properties
          }
        } else {
          returnType = { type: 'object' }
        }
      } else if (ts.isStringLiteral(node.expression)) {
        returnType = { type: 'string' }
      } else if (ts.isNumericLiteral(node.expression)) {
        returnType = { type: 'number' }
      } else if (node.expression.kind === ts.SyntaxKind.TrueKeyword ||
        node.expression.kind === ts.SyntaxKind.FalseKeyword) {
        returnType = { type: 'boolean' }
      } else if (ts.isIdentifier(node.expression)) {
        // Single variable return
        const varType = variableTypes.get(node.expression.text) || inferTypeFromIdentifier(node.expression.text, boundaryTypes)
        returnType = { type: varType }
      }
    }
    ts.forEachChild(node, visitReturnStatements)
  }

  if (func.body) {
    // First pass: collect variable declarations
    collectVariableDeclarations(func.body)
    // Second pass: analyze return statements
    visitReturnStatements(func.body)
  }

  return returnType
}

// Helper function to infer type from any expression
function inferTypeFromExpression(expr: ts.Expression, sourceFile: ts.SourceFile, variableTypes: Map<string, string>, boundaryTypes: Map<string, string> = new Map()): string {
  if (ts.isStringLiteral(expr)) {
    return 'string'
  } else if (ts.isNumericLiteral(expr)) {
    return 'number'
  } else if (expr.kind === ts.SyntaxKind.TrueKeyword || expr.kind === ts.SyntaxKind.FalseKeyword) {
    return 'boolean'
  } else if (ts.isArrayLiteralExpression(expr)) {
    return 'array'
  } else if (ts.isObjectLiteralExpression(expr)) {
    return 'object'
  } else if (ts.isIdentifier(expr)) {
    // Check if we know the type from variable declarations
    return variableTypes.get(expr.text) || inferTypeFromIdentifier(expr.text, boundaryTypes)
  } else if (ts.isCallExpression(expr)) {
    // Handle method calls like array.reduce(), boundary calls, etc.
    if (ts.isPropertyAccessExpression(expr.expression)) {
      const methodName = expr.expression.name.text
      if (methodName === 'reduce') {
        // For reduce, infer type from initial value (second argument)
        if (expr.arguments.length > 1) {
          const initialValue = expr.arguments[1]
          return inferTypeFromExpression(initialValue, sourceFile, variableTypes, boundaryTypes)
        }
        return 'number'  // Common case for reduce operations
      } else if (methodName === 'map' || methodName === 'filter') {
        // These typically return arrays
        return 'array'
      } else if (methodName === 'join' || methodName === 'toString') {
        // These return strings
        return 'string'
      } else if (methodName === 'length' || methodName === 'indexOf' || methodName === 'findIndex') {
        // These return numbers
        return 'number'
      }
    } else if (ts.isIdentifier(expr.expression)) {
      // Direct function calls - could be boundary functions
      const functionName = expr.expression.text
      const boundaryType = boundaryTypes.get(functionName)
      if (boundaryType) {
        return boundaryType
      }
      return 'unknown'
    }
    return 'unknown'
  } else if (ts.isAwaitExpression(expr)) {
    // Handle await expressions - analyze the awaited expression
    return inferTypeFromExpression(expr.expression, sourceFile, variableTypes, boundaryTypes)
  } else if (ts.isPropertyAccessExpression(expr)) {
    // Handle property access like obj.prop
    return 'unknown'
  }

  return 'unknown'
}



// Clean up type strings (remove Promise wrappers for boundaries)
function cleanTypeString(typeString: string): string {
  // Remove Promise wrapper for boundary functions
  const promiseMatch = typeString.match(/Promise<(.+)>/)
  if (promiseMatch) {
    return promiseMatch[1]
  }
  return typeString
}

function analyzeSchemaArg(node: ts.Expression, sourceFile: ts.SourceFile): InputSchema {
  // Handle variable references (e.g., when schema is defined as const schema = ...)
  if (ts.isIdentifier(node) && node.text === 'schema') {
    // This case is now handled by pre-finding the schema node
    return { type: 'object', properties: {} }
  }

  // Handle direct Schema constructor calls
  if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'Schema') {
    const arg = node.arguments?.[0]
    if (arg && ts.isObjectLiteralExpression(arg)) {
      const properties: Record<string, SchemaProperty> = {}
      arg.properties.forEach(prop => {
        if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
          const propName = prop.name.text
          const propValue = analyzeSchemaProp(prop.initializer, sourceFile)
          properties[propName] = propValue
        }
      })
      return { type: 'object', properties }
    }
  }
  return { type: 'object', properties: {} }
}

// Enhanced schema property analysis
function analyzeSchemaProp(node: ts.Expression, _sourceFile: ts.SourceFile): SchemaProperty {
  // Analyze Schema.string(), Schema.number(), etc.
  if (ts.isCallExpression(node)) {
    if (ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === 'Schema') {

      const methodName = node.expression.name.text
      let baseType: SchemaProperty = { type: getSchemaTypeFromMethod(methodName) }

      // Check for chained methods like .optional() or .default()
      let current = node
      while (current.parent && ts.isCallExpression(current.parent)) {
        current = current.parent
        if (ts.isPropertyAccessExpression(current.expression)) {
          const chainedMethod = current.expression.name.text
          if (chainedMethod === 'optional') {
            baseType = { ...baseType, optional: true }
          } else if (chainedMethod === 'default' && current.arguments[0]) {
            baseType = { ...baseType, default: current.arguments[0].getText() }
          }
        }
      }

      return baseType
    }
  }
  return { type: 'unknown' }
}

function getSchemaTypeFromMethod(methodName: string): string {
  const typeMap: Record<string, string> = {
    string: 'string',
    number: 'number',
    boolean: 'boolean',
    array: 'array',
    object: 'object'
  }
  return typeMap[methodName] || 'unknown'
}


// Enhanced boundary analysis that extracts both names and return types
function analyzeBoundariesWithTypes(node: ts.Expression, sourceFile: ts.SourceFile): { names: string[], types: Map<string, string> } {
  const names: string[] = []
  const types = new Map<string, string>()

  if (ts.isObjectLiteralExpression(node)) {
    node.properties.forEach(prop => {
      if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
        const boundaryName = prop.name.text
        names.push(boundaryName)

        // Try to analyze the boundary function to extract return type
        if (ts.isArrowFunction(prop.initializer) || ts.isFunctionExpression(prop.initializer)) {
          const returnType = analyzeBoundaryReturnType(prop.initializer, sourceFile)
          types.set(boundaryName, returnType)
        }
      }
    })
  }

  return { names, types }
}

// Helper function to infer type from variable names using TypeScript compiler analysis
function inferTypeFromIdentifier(identifierText: string, boundaryTypes: Map<string, string>): string {
  // Check boundary types first
  if (boundaryTypes.has(identifierText)) {
    return boundaryTypes.get(identifierText) || 'unknown'
  }
  
  // Use TypeScript's built-in type inference instead of hardcoded patterns
  // For now, return unknown and let the compiler handle it
  return 'unknown'
}

// Analyze boundary function return type
function analyzeBoundaryReturnType(func: ts.ArrowFunction | ts.FunctionExpression, sourceFile: ts.SourceFile): string {
  // Check if function has explicit return type annotation
  if (func.type) {
    const typeText = func.type.getText(sourceFile)
    // Handle Promise<T> types - extract T
    const promiseMatch = typeText.match(/Promise<(.+)>/)
    if (promiseMatch) {
      const innerType = promiseMatch[1]
      // Parse common type patterns using TypeScript's type analysis
      if (innerType.includes('[]') || innerType.includes('Array<')) {
        return 'array'
      } else if (innerType === 'string') {
        return 'string'
      } else if (innerType === 'number') {
        return 'number'
      } else if (innerType === 'boolean') {
        return 'boolean'
      } else if (innerType.includes('{') || innerType.includes('object')) {
        return 'object'
      }
    }
    return cleanTypeString(typeText)
  }

  // If no explicit type, try to infer from return statements
  if (func.body) {
    const returnType = inferDetailedReturnType(func, sourceFile, new Map())
    return returnType.type
  }

  return 'unknown'
}

// Export the core analysis function for reuse
export function analyzeTaskFile(sourceCode: string, filePath: string, _expectedTaskName?: string): TaskFingerprintOutput | null {
  const taskFingerprint = extractTaskFingerprints(sourceCode, filePath)[0]
  if (!taskFingerprint) {
    return null
  }

  // Return simplified output without name, location, hash
  return {
    description: taskFingerprint.description,
    inputSchema: taskFingerprint.inputSchema,
    outputType: taskFingerprint.outputType,
    boundaries: taskFingerprint.boundaries
  }
}
