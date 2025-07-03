import { createTask, Schema, getExecutionRecordType } from '../index'

describe('Task execution log record', () => {
  describe('Task name in execution record', () => {
    it('should include task name in safeRun execution record when task has a name', async () => {
    // Create a schema
      const schema = new Schema({
        value: Schema.number()
      })

      // Create a task with a name
      const task = createTask({
        name: 'test-multiplication-task',
        description: 'A task that multiplies input by 2',
        schema,
        boundaries: {
          multiply: async (value: number) => value * 2
        },
        fn: async ({ value }, { multiply }) => {
          const result = await multiply(value)
          return { result }
        }
      })

      // Run the task with safeRun
      const [result, error, record] = await task.safeRun({ value: 5 })

      // Verify the execution was successful
      expect(error).toBeNull()
      expect(result).toEqual({ result: 10 })

      // Verify the task name is included in the record
      expect(record.taskName).toBe('test-multiplication-task')
      expect(record.input).toEqual({ value: 5 })
      expect(record.output).toEqual({ result: 10 })
    })

    it('should include undefined task name when task has no name', async () => {
    // Create a schema
      const schema = new Schema({
        value: Schema.number()
      })

      // Create a task without a name
      const task = createTask({
        schema,
        boundaries: {},
        fn: async ({ value }) => {
          return { result: value * 3 }
        }
      })

      // Run the task with safeRun
      const [result, error, record] = await task.safeRun({ value: 4 })

      // Verify the execution was successful
      expect(error).toBeNull()
      expect(result).toEqual({ result: 12 })

      // Verify the task name is undefined in the record
      expect(record.taskName).toBeUndefined()
      expect(record.input).toEqual({ value: 4 })
      expect(record.output).toEqual({ result: 12 })
    })

    it('should include task name in error execution records', async () => {
    // Create a schema
      const schema = new Schema({
        value: Schema.number()
      })

      // Create a task that will throw an error
      const task = createTask({
        name: 'error-task',
        schema,
        boundaries: {},
        fn: async ({ value }) => {
          if (value < 0) {
            throw new Error('Value cannot be negative')
          }
          return { result: value }
        }
      })

      // Run the task with a value that will cause an error
      const [result, error, record] = await task.safeRun({ value: -1 })

      // Verify the execution failed as expected
      expect(result).toBeNull()
      expect(error).not.toBeNull()
      expect(error?.message).toBe('Value cannot be negative')

      // Verify the task name is included in the error record
      expect(record.taskName).toBe('error-task')
      expect(record.input).toEqual({ value: -1 })
      expect(record.error).toBe('Value cannot be negative')
      expect(record.output).toBeUndefined()
    })

    it('should include task name in safeReplay execution record', async () => {
    // Create a schema
      const schema = new Schema({
        value: Schema.number()
      })

      // Create a task with boundaries
      const task = createTask({
        name: 'replay-test-task',
        schema,
        boundaries: {
          fetchData: async (value: number) => value * 2
        },
        fn: async ({ value }, { fetchData }) => {
          const result = await fetchData(value)
          return { result }
        }
      })

      // First, run the task normally to get an execution record
      const [, , originalRecord] = await task.safeRun({ value: 3 })

      // Now replay the task
      const [replayResult, replayError, replayRecord] = await task.safeReplay(
        originalRecord,
        { boundaries: { fetchData: 'replay' } }
      )

      // Verify the replay was successful
      expect(replayError).toBeNull()
      expect(replayResult).toEqual({ result: 6 })

      // Verify the task name is included in the replay record
      expect(replayRecord.taskName).toBe('replay-test-task')
      expect(replayRecord.input).toEqual({ value: 3 })
      expect(replayRecord.output).toEqual({ result: 6 })
    })
  })

  describe('Type computation in execution record', () => {
    it('should have type "success" when task completes successfully', async () => {
      const schema = new Schema({
        value: Schema.number()
      })

      const task = createTask({
        name: 'success-task',
        schema,
        boundaries: {},
        fn: async ({ value }) => {
          return { result: value * 2 }
        }
      })

      const [result, error, record] = await task.safeRun({ value: 5 })

      expect(error).toBeNull()
      expect(result).toEqual({ result: 10 })
      expect(record.type).toBe('success')
      expect(record.output).toEqual({ result: 10 })
      expect(record.error).toBeUndefined()
    })

    it('should have type "error" when task throws an error', async () => {
      const schema = new Schema({
        value: Schema.number()
      })

      const task = createTask({
        name: 'error-task',
        schema,
        boundaries: {},
        fn: async ({ value }) => {
          if (value < 0) {
            throw new Error('Value cannot be negative')
          }
          return { result: value }
        }
      })

      const [result, error, record] = await task.safeRun({ value: -1 })

      expect(result).toBeNull()
      expect(error).not.toBeNull()
      expect(record.type).toBe('error')
      expect(record.error).toBe('Value cannot be negative')
      expect(record.output).toBeUndefined()
    })

    it('should have type "pending" when neither output nor error is set', async () => {
      // This tests the getExecutionRecordType utility function directly
      const partialRecord = {
        input: { value: 1 },
        boundaries: {},
        taskName: 'test'
      }

      const type = getExecutionRecordType(partialRecord)
      expect(type).toBe('pending')
    })
  })

  describe('Context in execution record', () => {
    it('should include context when provided to safeRun', async () => {
      const schema = new Schema({
        value: Schema.number()
      })

      const task = createTask({
        name: 'context-task',
        schema,
        boundaries: {},
        fn: async ({ value }) => {
          return { result: value * 2 }
        }
      })

      const context = { userId: 'user123', requestId: 'req456' }
      const [result, error, record] = await task.safeRun({ value: 5 }, context)

      expect(error).toBeNull()
      expect(result).toEqual({ result: 10 })
      expect(record.metadata).toEqual(context)
      expect(record.taskName).toBe('context-task')
    })

    it('should handle undefined context gracefully', async () => {
      const schema = new Schema({
        value: Schema.number()
      })

      const task = createTask({
        name: 'no-context-task',
        schema,
        boundaries: {},
        fn: async ({ value }) => {
          return { result: value * 2 }
        }
      })

      const [result, error, record] = await task.safeRun({ value: 5 })

      expect(error).toBeNull()
      expect(result).toEqual({ result: 10 })
      expect(record.metadata).toEqual({})
    })
  })
})
