// TASK: errors
// Run this task with:
// forge task:run test:errors

import { createTask } from '@forgehive/task'
import { Schema } from '@forgehive/schema'

const name = 'test:errors'
const description = 'Test task with intentional errors for error collection testing'

// This should work fine - no schema errors expected
const schema = new Schema({
  testParam: Schema.string(),
  optionalParam: Schema.number().optional()
})

// This will cause boundary analysis issues - intentional malformed boundary
const boundaries = {
  workingBoundary: async (input: { data: string }): Promise<{ result: string }> => {
    return { result: input.data.toUpperCase() }
  },
  // This boundary has a problematic signature that might cause analysis issues
  problematicBoundary: async (param1: string, param2: number, param3: boolean): Promise<string> => {
    return `${param1}-${param2}-${param3}`
  },
  // This boundary has a syntax error - missing implementation
  brokenBoundary: async (input: { value: string }): Promise<{ output: string }> => {
    // Missing return statement - this will cause runtime issues but not parsing errors
    throw new Error('Intentionally broken boundary')
  }
}

export const errors = createTask({
  name,
  description,
  schema,
  boundaries,
  fn: async function ({ testParam, optionalParam }, { workingBoundary, problematicBoundary }) {
    // Test the working boundary
    const result1 = await workingBoundary({ data: testParam })
    
    // Test the problematic boundary (this should work at runtime but might cause fingerprint analysis issues)
    const result2 = await problematicBoundary(testParam, optionalParam || 42, true)
    
    // Return a properly structured response
    return {
      workingResult: result1.result,
      problematicResult: result2,
      processed: true
    }
  }
})

