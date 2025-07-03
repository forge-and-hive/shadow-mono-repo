# Task Fingerprinting System Specification

## Overview

This specification describes a build-time code generation system that extracts comprehensive type information ("fingerprints") from TypeScript tasks during the esbuild bundling process. The system provides complete introspection capabilities for tasks created with the `@forgehive/task` library.

## Problem Statement

Currently, TypeScript task functions created with `createTask` have limited runtime introspection capabilities. We need a way to:

1. Extract complete type information about task inputs, outputs, and boundaries
2. Generate comprehensive task fingerprints during build time
3. Provide zero-runtime-overhead type introspection
4. Enable tooling, documentation generation, and runtime validation
5. Detect changes in task interfaces through hash-based fingerprinting

## Architecture

### Core Components

1. **esbuild Plugin**: `taskFingerprintPlugin` - Analyzes TypeScript AST during bundling
2. **Type Extractor**: Processes `createTask` calls and extracts type information
3. **Fingerprint Generator**: Creates comprehensive task metadata
4. **Bundle Task**: Enhanced version of existing bundle creation with fingerprinting

### Data Flow

```
TypeScript Source Files
    ↓
esbuild Plugin (AST Analysis)
    ↓
Task Discovery & Type Extraction
    ↓
Fingerprint Generation
    ↓
JSON Output + Bundle Creation
```

## Technical Requirements

### Dependencies

```typescript
import * as esbuild from 'esbuild'
import * as ts from 'typescript'
import * as fs from 'fs'
import * as path from 'path'
```

### Core Interfaces

#### TaskFingerprint
```typescript
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
  outputType: string
  boundaries: Record<string, {
    inputTypes: string[]
    outputType: string
    signature: string
  }>
  functionSource: string
  hash: string
  metadata: {
    extractedAt: string
    version: string
  }
}
```

#### FingerprintResult
```typescript
interface FingerprintResult {
  tasks: TaskFingerprint[]
  buildInfo: {
    entryPoint: string
    outputFile: string
    fingerprintsFile?: string
    totalTasks: number
    buildTimestamp: string
  }
}
```

## Implementation Specification

### 1. esbuild Plugin (`taskFingerprintPlugin`)

**Purpose**: Integrate TypeScript AST analysis into the esbuild bundling process

**Key Functions**:
- `onLoad`: Analyze `.ts` files for `createTask` calls
- `onEnd`: Generate and write fingerprint JSON file
- Handle TypeScript compiler integration
- Extract comprehensive type information

**Configuration**:
```typescript
interface PluginOptions {
  tsConfigPath: string      // Path to tsconfig.json
  outputPath?: string       // Output file for fingerprints
}
```

### 2. Task Discovery Algorithm

**Detection Pattern**: Look for these patterns in TypeScript AST:
```typescript
// Direct calls
createTask(schema, boundaries, fn)

// Exported assignments
export const taskName = createTask(schema, boundaries, fn)
```

**AST Node Types to Process**:
- `ts.CallExpression` with identifier "createTask"
- `ts.VariableStatement` with exported createTask assignments

### 3. Type Extraction Specifications

#### Schema Analysis
- Detect `new Schema({ ... })` patterns
- Extract property definitions and types
- Handle Schema methods: `.string()`, `.number()`, `.boolean()`, `.optional()`, `.default()`
- Generate JSON Schema-compatible output

#### Boundary Analysis
- Extract function signatures from boundary object
- Parse parameter types and return types
- Handle async functions and Promise return types
- Truncate function source for readability (200 chars max)

#### Return Type Analysis
- Extract TypeScript return type annotations
- Parse Promise wrapper types
- Infer types from return statements when annotations missing
- Handle complex object return types

### 4. Hash Generation Algorithm

```typescript
function generateHash(input: string): string {
  // Simple hash function for change detection
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}
```

**Hash Input**: Combination of task name, function source, and input schema

## Task Configuration Schema

### Enhanced Bundle Task Schema
```typescript
const schema = new Schema({
  entryPoint: Schema.string(),
  outputFile: Schema.string(),
  generateFingerprints: Schema.boolean().optional().default(true),
  fingerprintsOutputFile: Schema.string().optional(),
  tsConfigPath: Schema.string().optional().default('tsconfig.json')
})
```

### Boundaries
```typescript
const boundaries = {
  readFile: async (filePath: string): Promise<string> => { /* fs.readFile */ },
  writeFile: async (filePath: string, content: string): Promise<void> => { /* fs.writeFile */ },
  findTsFiles: async (dir: string): Promise<string[]> => { /* glob search */ }
}
```

## Output Specifications

### Generated Fingerprint File Structure

```json
{
  "tasks": [
    {
      "name": "getPrice",
      "description": "Fetches stock price for a given ticker",
      "location": {
        "file": "src/tasks/price.ts",
        "line": 15,
        "column": 23
      },
      "inputSchema": {
        "type": "object",
        "properties": {
          "ticker": { "type": "string" }
        }
      },
      "outputType": "Promise<{ ticker: string, price: number }>",
      "boundaries": {
        "fetchStockPrice": {
          "inputTypes": ["string"],
          "outputType": "Promise<{ price: number }>",
          "signature": "async (ticker: string): Promise<{ price: number }> => {...}"
        }
      },
      "functionSource": "async function ({ ticker }, { fetchStockPrice }) { ... }",
      "hash": "abc123def",
      "metadata": {
        "extractedAt": "2025-01-01T12:00:00.000Z",
        "version": "1.0.0"
      }
    }
  ],
  "buildInfo": {
    "entryPoint": "src/index.ts",
    "outputFile": "dist/bundle.js",
    "fingerprintsFile": "dist/bundle.fingerprints.json",
    "totalTasks": 5,
    "buildTimestamp": "2025-01-01T12:00:00.000Z"
  }
}
```

### Task Return Value
```typescript
{
  outputFile: string,
  fingerprintsFile?: string,
  errors: number,
  warnings: number,
  taskFingerprints?: {
    totalTasks: number,
    tasks: Array<{
      name: string,
      inputType: string,
      outputType: string,
      boundaryCount: number,
      hash: string
    }>
  }
}
```

## Usage Patterns

### CLI Integration
```bash
# Generate bundle with fingerprints
shadow-cli bundle:createWithFingerprints \
  --entryPoint src/index.ts \
  --outputFile dist/bundle.js

# Custom fingerprints location
shadow-cli bundle:createWithFingerprints \
  --entryPoint src/index.ts \
  --outputFile dist/bundle.js \
  --fingerprintsOutputFile dist/task-types.json

# Disable fingerprints
shadow-cli bundle:createWithFingerprints \
  --entryPoint src/index.ts \
  --outputFile dist/bundle.js \
  --generateFingerprints false
```

### Programmatic Usage
```typescript
import { createWithFingerprints } from './create-with-fingerprints'

const result = await createWithFingerprints.run({
  entryPoint: 'src/index.ts',
  outputFile: 'dist/bundle.js',
  generateFingerprints: true
})

console.log(`Generated ${result.taskFingerprints?.totalTasks} task fingerprints`)
```

## Error Handling

### Plugin Error Scenarios
1. **TypeScript Parsing Errors**: Log warning, continue processing other files
2. **Invalid createTask Calls**: Skip malformed calls, log warnings
3. **File System Errors**: Fail gracefully, provide meaningful error messages
4. **TypeScript Compiler Issues**: Use fallback type extraction methods

### Graceful Degradation
- If TypeScript analysis fails, include raw source code snippets
- Provide partial fingerprints when complete type information unavailable
- Continue build process even if fingerprint generation fails

## Performance Considerations

### Optimization Strategies
1. **File Filtering**: Only analyze files containing "createTask"
2. **Caching**: Avoid re-processing identical files
3. **Lazy Loading**: Import TypeScript compiler only when needed
4. **Parallel Processing**: Process multiple files concurrently where possible

### Memory Management
- Limit function source code storage (truncate long functions)
- Clean up TypeScript compiler instances after use
- Stream large file operations when possible

## Testing Strategy

### Unit Tests Required
1. **AST Parsing**: Test extraction from various createTask patterns
2. **Type Analysis**: Verify schema, boundary, and return type extraction
3. **Hash Generation**: Ensure consistent hash generation
4. **Plugin Integration**: Test esbuild plugin lifecycle

### Integration Tests
1. **End-to-End**: Full bundle creation with fingerprint generation
2. **Real Projects**: Test against actual task codebases
3. **Error Scenarios**: Verify graceful handling of malformed code

### Test Data Requirements
```typescript
// Sample task for testing
export const testTask = createTask(
  new Schema({
    input: Schema.string(),
    count: Schema.number().optional()
  }),
  {
    apiCall: async (data: string): Promise<{ result: number }> => ({ result: 42 })
  },
  async function ({ input, count }, { apiCall }): Promise<{ output: string }> {
    const { result } = await apiCall(input)
    return { output: `${input}-${result}` }
  }
)
```

## Future Enhancements

### Planned Features
1. **Watch Mode**: Incremental fingerprint updates during development
2. **Validation**: Runtime validation using generated fingerprints
3. **Documentation**: Auto-generate API docs from fingerprints
4. **IDE Integration**: TypeScript language service plugin
5. **Diff Detection**: Compare fingerprints across versions

### Extension Points
1. **Custom Extractors**: Plugin system for custom type extraction
2. **Output Formats**: Support for different output formats (YAML, XML)
3. **Integration Hooks**: Webhooks for fingerprint updates
4. **Analysis Tools**: CLI tools for fingerprint analysis and comparison

## Implementation Checklist

- [ ] Implement `taskFingerprintPlugin` esbuild plugin
- [ ] Create TypeScript AST analysis functions
- [ ] Implement schema extraction logic
- [ ] Implement boundary analysis logic
- [ ] Implement return type extraction
- [ ] Create hash generation function
- [ ] Implement enhanced bundle task
- [ ] Add error handling and logging
- [ ] Write comprehensive tests
- [ ] Create CLI integration
- [ ] Generate documentation
- [ ] Performance optimization
- [ ] Add configuration validation

This specification provides a complete blueprint for implementing a sophisticated task fingerprinting system that operates at build time and provides comprehensive type introspection capabilities for TypeScript tasks.