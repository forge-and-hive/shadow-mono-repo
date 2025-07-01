// TASK: fingerprint
// Run this task with:
// forge task:run task:fingerprint --descriptorName task-name

import { createTask } from '@forgehive/task'
import { Schema } from '@forgehive/schema'
import * as ts from 'typescript'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

import { load as loadConf } from '../conf/load'

interface TaskFingerprint {
  name: string
  description?: string
  location: {
    file: string
    line: number
    column: number
  }
  inputSchema: {
    type: string
    properties: Record<string, any>
  }
  outputType: {
    type: string
    properties?: Record<string, any>
  }
  boundaries: string[]
  hash: string
}

// Simplified interface for filesystem output (excludes name, location, hash)
interface TaskFingerprintOutput {
  description?: string
  inputSchema: {
    type: string
    properties: Record<string, any>
  }
  outputType: {
    type: string
    properties?: Record<string, any>
  }
  boundaries: string[]
}

interface FingerprintAnalysis {
  taskFingerprint: TaskFingerprintOutput
}

const description = 'Analyze a specific task and generate detailed fingerprint without bundling'

const schema = new Schema({
  descriptorName: Schema.string()
})

const boundaries = {
  getCwd: async (): Promise<string> => {
    return process.cwd()
  },
  loadConf: loadConf.asBoundary(),
  readFile: async (filePath: string): Promise<string> => {
    return fs.readFile(filePath, 'utf-8')
  },
  writeFile: async (filePath: string, content: string): Promise<void> => {
    return fs.writeFile(filePath, content)
  },
  ensureForgeFolder: async (): Promise<string> => {
    const forgePath = path.join(os.homedir(), '.forge')
    try {
      await fs.access(forgePath)
    } catch {
      await fs.mkdir(forgePath, { recursive: true })
    }
    return forgePath
  }
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

// Enhanced TypeScript analysis for single task file
function analyzeTaskFile(sourceCode: string, filePath: string, expectedTaskName: string): TaskFingerprint | null {
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceCode,
    ts.ScriptTarget.Latest,
    true
  )

  let taskFingerprint: TaskFingerprint | null = null
  let schemaNode: ts.Expression | null = null
  let boundariesNode: ts.Expression | null = null

  // First pass: find schema and boundaries variable declarations
  function findVariables(node: ts.Node) {
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
  function findCreateTask(node: ts.Node) {
    // Look for createTask calls
    if (ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'createTask') {

      const taskName = extractTaskName(node, sourceFile) || expectedTaskName
      if (taskName === expectedTaskName || expectedTaskName === 'unknown') {
        taskFingerprint = analyzeCreateTaskCall(node, sourceFile, filePath, taskName, schemaNode, boundariesNode)
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
          if (taskName === expectedTaskName || expectedTaskName === 'unknown') {
            taskFingerprint = analyzeCreateTaskCall(decl.initializer, sourceFile, filePath, taskName, schemaNode, boundariesNode)
          }
        }
      })
    }

    ts.forEachChild(node, findCreateTask)
  }

  // Execute both passes
  findVariables(sourceFile)
  findCreateTask(sourceFile)

  return taskFingerprint
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

    // Use pre-found schema or fall back to argument analysis
    let inputSchema = { type: 'object', properties: {} }
    if (schemaNode) {
      inputSchema = analyzeSchemaArg(schemaNode, sourceFile)
    } else if (args[0]) {
      inputSchema = analyzeSchemaArg(args[0], sourceFile)
    }

    // Use pre-found boundaries or fall back to argument analysis - simplified to just names
    let boundaries: string[] = []
    if (boundariesNode) {
      boundaries = analyzeBoundariesArg(boundariesNode, sourceFile)
    } else if (args[1]) {
      boundaries = analyzeBoundariesArg(args[1], sourceFile)
    }

    // Extract function output type with better detection
    let outputType: any = { type: 'unknown' }
    const functionArg = args[2]

    if (functionArg) {
      if (ts.isFunctionExpression(functionArg) || ts.isArrowFunction(functionArg)) {
        // Better return type extraction
        if (functionArg.type) {
          const typeString = cleanTypeString(functionArg.type.getText(sourceFile))
          outputType = { type: typeString }
        } else {
          // Try to infer from return statements with better object analysis
          outputType = inferDetailedReturnType(functionArg, sourceFile)
        }
      }
    }

    // Generate hash from task signature
    const hashInput = `${taskName}:${JSON.stringify(inputSchema)}:${JSON.stringify(boundaries)}`
    const hash = generateHash(hashInput)

    return {
      name: taskName,
      description: undefined,
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
function inferDetailedReturnType(func: ts.FunctionExpression | ts.ArrowFunction, _sourceFile: ts.SourceFile): any {
  let returnType: any = { type: 'unknown' }

  function visitReturnStatements(node: ts.Node) {
    if (ts.isReturnStatement(node) && node.expression) {
      if (ts.isObjectLiteralExpression(node.expression)) {
        // Analyze object literal properties
        const properties: Record<string, any> = {}
        node.expression.properties.forEach(prop => {
          if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
            // Handle explicit property assignments: { propName: value }
            const propName = prop.name.text
            let propType = 'any'

            // Try to infer property type from the initializer
            if (ts.isStringLiteral(prop.initializer)) {
              propType = 'string'
            } else if (ts.isNumericLiteral(prop.initializer)) {
              propType = 'number'
            } else if (prop.initializer.kind === ts.SyntaxKind.TrueKeyword ||
                       prop.initializer.kind === ts.SyntaxKind.FalseKeyword) {
              propType = 'boolean'
            } else if (ts.isIdentifier(prop.initializer)) {
              // Variable reference - try to infer from name
              const varName = prop.initializer.text
              propType = inferTypeFromVariableName(varName)
            } else if (ts.isPropertyAccessExpression(prop.initializer)) {
              // Property access like response.handler
              propType = 'any'
            }

            properties[propName] = { type: propType }
          } else if (ts.isShorthandPropertyAssignment(prop)) {
            // Handle shorthand properties: { propName } (equivalent to { propName: propName })
            const propName = prop.name.text
            const propType = inferTypeFromVariableName(propName)
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
        const varType = inferTypeFromVariableName(node.expression.text)
        returnType = { type: varType }
      }
    }
    ts.forEachChild(node, visitReturnStatements)
  }

  if (func.body) {
    visitReturnStatements(func.body)
  }

  return returnType
}

// Helper function to infer types from variable names
function inferTypeFromVariableName(varName: string): string {
  // Common patterns for type inference based on variable names
  if (varName.includes('path') || varName.includes('Path') ||
      varName.includes('name') || varName.includes('Name') ||
      varName.includes('descriptor') || varName.includes('Descriptor') ||
      varName.includes('fileName') || varName.includes('handler') ||
      varName.includes('url') || varName.includes('id') ||
      varName.includes('uuid') || varName.includes('token')) {
    return 'string'
  } else if (varName.includes('count') || varName.includes('Count') ||
             varName.includes('size') || varName.includes('Size') ||
             varName.includes('length') || varName.includes('Length') ||
             varName.includes('index') || varName.includes('Index')) {
    return 'number'
  } else if (varName.includes('is') || varName.includes('has') ||
             varName.includes('can') || varName.includes('should') ||
             varName.includes('enabled') || varName.includes('success')) {
    return 'boolean'
  } else if (varName.includes('config') || varName.includes('Config') ||
             varName.includes('options') || varName.includes('Options') ||
             varName.includes('data') || varName.includes('result') ||
             varName.includes('response') || varName.includes('error')) {
    return 'any'
  }

  return 'any'
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

function analyzeSchemaArg(node: ts.Expression, sourceFile: ts.SourceFile): any {
  if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'Schema') {
    const arg = node.arguments?.[0]
    if (arg && ts.isObjectLiteralExpression(arg)) {
      const properties: Record<string, any> = {}
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

function analyzeSchemaProp(node: ts.Expression, _sourceFile: ts.SourceFile): any {
  // Analyze Schema.string(), Schema.number(), etc.
  if (ts.isCallExpression(node)) {
    if (ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === 'Schema') {

      const methodName = node.expression.name.text
      let baseType: any = { type: getSchemaTypeFromMethod(methodName) }

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

function analyzeBoundariesArg(node: ts.Expression, _sourceFile: ts.SourceFile): string[] {
  const boundaries: string[] = []

  // Handle variable references (e.g., when boundaries is defined as const boundaries = ...)
  if (ts.isIdentifier(node) && node.text === 'boundaries') {
    // This case is now handled by pre-finding the boundaries node
    return []
  }

  if (ts.isObjectLiteralExpression(node)) {
    node.properties.forEach(prop => {
      if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
        const boundaryName = prop.name.text
        boundaries.push(boundaryName)
      }
    })
  }

  return boundaries
}

export const fingerprint = createTask(
  schema,
  boundaries,
  async function ({ descriptorName }, {
    getCwd,
    loadConf,
    readFile,
    writeFile,
    ensureForgeFolder
  }) {
    const cwd = await getCwd()
    const forgeJson = await loadConf({})

    const taskDescriptor = forgeJson.tasks[descriptorName as keyof typeof forgeJson.tasks]

    if (taskDescriptor === undefined) {
      throw new Error(`Task '${descriptorName}' is not defined in forge.json`)
    }

    const filePath = path.join(cwd, taskDescriptor.path)
    const forgePath = await ensureForgeFolder()
    const fingerprintFile = path.join(forgePath, `${descriptorName}.task-fingerprint.json`)

    console.log(`Analyzing task: ${descriptorName}`)
    console.log(`Task file: ${filePath}`)

    // Read and analyze the task file
    const sourceCode = await readFile(filePath)
    const taskFingerprint = analyzeTaskFile(sourceCode, filePath, taskDescriptor.handler)

    if (!taskFingerprint) {
      throw new Error('Could not extract fingerprint from task file: ' + filePath)
    }

    // Create simplified output without name, location, hash
    const fingerprintOutput: TaskFingerprintOutput = {
      description: taskFingerprint.description,
      inputSchema: taskFingerprint.inputSchema,
      outputType: taskFingerprint.outputType,
      boundaries: taskFingerprint.boundaries
    }

    // Create analysis result - clean output without extra fields
    const analysis: FingerprintAnalysis = {
      taskFingerprint: fingerprintOutput
    }

    // Write fingerprint to file
    await writeFile(fingerprintFile, JSON.stringify(analysis, null, 2))

    console.log('Task fingerprint generated successfully')
    console.log(`Name: ${taskFingerprint.name}`)
    console.log(`Input properties: ${Object.keys(taskFingerprint.inputSchema.properties).join(', ')}`)
    console.log(`Boundaries: ${taskFingerprint.boundaries.join(', ')}`)
    console.log(`Hash: ${taskFingerprint.hash}`)
    console.log(`Fingerprint saved to: ${fingerprintFile}`)

    return {
      taskName: taskFingerprint.name,
      fingerprint: fingerprintOutput,
      fingerprintFile,
      hash: taskFingerprint.hash,
      analysis: {
        inputSchemaProps: Object.keys(taskFingerprint.inputSchema.properties),
        boundaryCount: taskFingerprint.boundaries.length,
        hasDescription: !!taskFingerprint.description,
        outputType: taskFingerprint.outputType.type
      }
    }
  }
)

fingerprint.setDescription(description)
