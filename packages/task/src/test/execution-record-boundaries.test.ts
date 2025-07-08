import { createTask, Schema } from '../index'

describe('execution-record-boundaries', () => {
  describe('setMetadata boundary', () => {
    it('should add metadata to execution record when setMetadata is called', async () => {
      // Create a schema
      const schema = new Schema({
        value: Schema.number()
      })

      // Create a task that uses setMetadata
      const task = createTask({
        name: 'metadata-test-task',
        schema,
        boundaries: {
          multiply: async (value: number) => value * 2
        },
        fn: async ({ value }, { multiply, setMetadata }) => {
          await setMetadata('userId', '12345')
          await setMetadata('executionType', 'background')

          const result = await multiply(value)
          return { result }
        }
      })

      // Run the task with safeRun
      const [result, error, record] = await task.safeRun({ value: 5 })

      // Verify the execution was successful
      expect(error).toBeNull()
      expect(result).toEqual({ result: 10 })

      // Verify the metadata is included in the record
      expect(record.metadata).toEqual({
        userId: '12345',
        executionType: 'background'
      })

      // Verify the task name and other fields are correct
      expect(record.taskName).toBe('metadata-test-task')
      expect(record.input).toEqual({ value: 5 })
      expect(record.output).toEqual({ result: 10 })
      expect(record.type).toBe('success')
    })

    it('should not include setMetadata calls in boundary logs', async () => {
      // Create a schema
      const schema = new Schema({
        value: Schema.number()
      })

      // Create a task that uses setMetadata and other boundaries
      const task = createTask({
        name: 'boundary-log-test',
        schema,
        boundaries: {
          multiply: async (value: number) => value * 2,
          fetchData: async (data: string) => `fetched-${data}`
        },
        fn: async ({ value }, { multiply, fetchData, setMetadata }) => {
          await setMetadata('step', 'start')

          const multiplied = await multiply(value)
          await setMetadata('step', 'multiplied')

          const fetched = await fetchData('test')
          await setMetadata('step', 'completed')

          return { multiplied, fetched }
        }
      })

      // Run the task with safeRun
      const [result, error, record] = await task.safeRun({ value: 3 })

      // Verify the execution was successful
      expect(error).toBeNull()
      expect(result).toEqual({ multiplied: 6, fetched: 'fetched-test' })

      // Verify the metadata is updated to the final value
      expect(record.metadata).toEqual({
        step: 'completed'
      })

      // Verify that only the actual boundaries appear in the logs
      expect(record.boundaries).toHaveProperty('multiply')
      expect(record.boundaries).toHaveProperty('fetchData')
      expect(record.boundaries).not.toHaveProperty('setMetadata')

      // Verify the boundary logs contain the expected calls
      expect(record.boundaries.multiply).toHaveLength(1)
      expect(record.boundaries.multiply[0]).toEqual({
        input: [3],
        output: 6
      })

      expect(record.boundaries.fetchData).toHaveLength(1)
      expect(record.boundaries.fetchData[0]).toEqual({
        input: ['test'],
        output: 'fetched-test'
      })
    })

    it('should preserve metadata in error scenarios', async () => {
      // Create a schema
      const schema = new Schema({
        value: Schema.number()
      })

      // Create a task that sets metadata before throwing an error
      const task = createTask({
        name: 'error-metadata-test',
        schema,
        boundaries: {},
        fn: async ({ value }, { setMetadata }) => {
          await setMetadata('errorContext', 'validation')
          await setMetadata('userId', '67890')

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

      // Verify the metadata is preserved in the error record
      expect(record.metadata).toEqual({
        errorContext: 'validation',
        userId: '67890'
      })

      // Verify other record fields
      expect(record.taskName).toBe('error-metadata-test')
      expect(record.input).toEqual({ value: -1 })
      expect(record.error).toBe('Value cannot be negative')
      expect(record.type).toBe('error')
    })

    it('should preserve existing metadata when adding new metadata', async () => {
      // Create a schema
      const schema = new Schema({
        value: Schema.number()
      })

      // Create a task that uses setMetadata
      const task = createTask({
        name: 'preserve-metadata-test',
        schema,
        boundaries: {},
        fn: async ({ value }, { setMetadata }) => {
          await setMetadata('step1', 'completed')
          await setMetadata('step2', 'in-progress')
          await setMetadata('step1', 'updated') // Overwrite step1

          return { result: value * 2 }
        }
      })

      // Run the task with initial metadata context
      const [result, error, record] = await task.safeRun({ value: 4 })

      // Verify the execution was successful
      expect(error).toBeNull()
      expect(result).toEqual({ result: 8 })

      // Verify the metadata contains the final values
      expect(record.metadata).toEqual({
        step1: 'updated',
        step2: 'in-progress'
      })
    })

    it('should work with setMetadata in safeReplay', async () => {
      // Create a schema
      const schema = new Schema({
        value: Schema.number()
      })

      // Use a counter to ensure different values between original and replay
      let executionCounter = 0

      // Create a task with boundaries and metadata
      const task = createTask({
        name: 'replay-metadata-test',
        schema,
        boundaries: {
          fetchData: async (value: number) => value * 3
        },
        fn: async ({ value }, { fetchData, setMetadata }) => {
          executionCounter++
          await setMetadata('replayTest', 'true')
          await setMetadata('executionNumber', executionCounter.toString())

          const result = await fetchData(value)
          return { result }
        }
      })

      // First, run the task normally to get an execution record
      const [, , originalRecord] = await task.safeRun({ value: 2 })

      // Verify original metadata was set
      expect(originalRecord.metadata).toHaveProperty('replayTest', 'true')
      expect(originalRecord.metadata).toHaveProperty('executionNumber', '1')

      // Now replay the task
      const [replayResult, replayError, replayRecord] = await task.safeReplay(
        originalRecord,
        { boundaries: { fetchData: 'replay' } }
      )

      // Verify the replay was successful
      expect(replayError).toBeNull()
      expect(replayResult).toEqual({ result: 6 })

      // Verify that the replay has its own metadata (setMetadata was called again)
      expect(replayRecord.metadata).toHaveProperty('replayTest', 'true')
      expect(replayRecord.metadata).toHaveProperty('executionNumber', '2')

      // The execution numbers should be different since setMetadata was called again
      expect(replayRecord.metadata?.executionNumber).not.toBe(originalRecord.metadata?.executionNumber)
      expect(originalRecord.metadata?.executionNumber).toBe('1')
      expect(replayRecord.metadata?.executionNumber).toBe('2')
    })

    it('should handle empty metadata gracefully', async () => {
      // Create a schema
      const schema = new Schema({
        value: Schema.number()
      })

      // Create a task that doesn't use setMetadata
      const task = createTask({
        name: 'no-metadata-test',
        schema,
        boundaries: {
          multiply: async (value: number) => value * 2
        },
        fn: async ({ value }, { multiply }) => {
          const result = await multiply(value)
          return { result }
        }
      })

      // Run the task without using setMetadata
      const [result, error, record] = await task.safeRun({ value: 7 })

      // Verify the execution was successful
      expect(error).toBeNull()
      expect(result).toEqual({ result: 14 })

      // Verify the metadata is empty but defined
      expect(record.metadata).toEqual({})
    })
  })
})
