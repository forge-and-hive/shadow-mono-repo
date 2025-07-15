import { createTask, validateMetric, createMetric } from '../index'
import { Schema } from '@forgehive/schema'

describe('Metrics Collection Tests', () => {
  describe('setMetrics boundary functionality and validation', () => {
    it('should validate metrics with correct structure', () => {
      const validMetric = { type: 'business', name: 'user_count', value: 42 }
      expect(validateMetric(validMetric)).toBe(true)

      const performanceMetric = { type: 'performance', name: 'response_time', value: 150.5 }
      expect(validateMetric(performanceMetric)).toBe(true)

      const errorMetric = { type: 'error', name: 'failed_requests', value: 0 }
      expect(validateMetric(errorMetric)).toBe(true)
    })

    it('should reject invalid metric structures', () => {
      expect(validateMetric(null)).toBe(false)
      expect(validateMetric(undefined)).toBe(false)
      expect(validateMetric({})).toBe(false)
      expect(validateMetric({ type: 'business' })).toBe(false) // missing name and value
      expect(validateMetric({ name: 'test', value: 1 })).toBe(false) // missing type
      expect(validateMetric({ type: 'business', name: 'test' })).toBe(false) // missing value
    })

    it('should reject metrics with invalid types', () => {
      expect(validateMetric({ type: '', name: 'test', value: 1 })).toBe(false) // empty type
      expect(validateMetric({ type: 123, name: 'test', value: 1 })).toBe(false) // numeric type
      expect(validateMetric({ type: 'business', name: '', value: 1 })).toBe(false) // empty name
      expect(validateMetric({ type: 'business', name: 123, value: 1 })).toBe(false) // numeric name
      expect(validateMetric({ type: 'business', name: 'test', value: 'not-a-number' })).toBe(false) // string value
      expect(validateMetric({ type: 'business', name: 'test', value: NaN })).toBe(false) // NaN value
      expect(validateMetric({ type: 'business', name: 'test', value: Infinity })).toBe(false) // Infinity value
    })

    it('should create valid metrics using createMetric helper', () => {
      const metric = createMetric('performance', 'api_response_time', 250)
      expect(metric).toEqual({
        type: 'performance',
        name: 'api_response_time',
        value: 250
      })
      expect(validateMetric(metric)).toBe(true)
    })

    it('should throw error when creating metric with invalid data', () => {
      expect(() => createMetric('', 'test', 1)).toThrow('Invalid metric type')
      expect(() => createMetric('business', '', 1)).toThrow('Invalid metric name')
      expect(() => createMetric('business', 'test', NaN)).toThrow('Invalid metric value')
      expect(() => createMetric('business', 'test', Infinity)).toThrow('Invalid metric value')
    })
  })

  describe('Metrics accumulation and storage in execution records', () => {
    it('should collect single metric in execution record', async () => {
      const task = createTask({
        name: 'single-metric-test',
        schema: new Schema({ input: Schema.string() }),
        boundaries: {},
        fn: async ({ input }, { setMetrics }) => {
          await setMetrics({
            type: 'business',
            name: 'items_processed',
            value: 1
          })
          return { result: input.toUpperCase() }
        }
      })

      const [result, error, record] = await task.safeRun({ input: 'test' })

      expect(error).toBeNull()
      expect(result).toEqual({ result: 'TEST' })
      expect(record.metrics).toHaveLength(1)
      expect(record.metrics?.[0]).toEqual({
        type: 'business',
        name: 'items_processed',
        value: 1
      })
    })

    it('should accumulate multiple metrics in execution record', async () => {
      const task = createTask({
        name: 'multiple-metrics-test',
        schema: new Schema({ count: Schema.number() }),
        boundaries: {},
        fn: async ({ count }, { setMetrics }) => {
          await setMetrics({ type: 'business', name: 'input_count', value: count })
          await setMetrics({ type: 'performance', name: 'processing_time', value: 150 })
          await setMetrics({ type: 'error', name: 'error_count', value: 0 })

          return { processed: count * 2 }
        }
      })

      const [result, error, record] = await task.safeRun({ count: 5 })

      expect(error).toBeNull()
      expect(result).toEqual({ processed: 10 })
      expect(record.metrics).toHaveLength(3)

      expect(record.metrics).toEqual(expect.arrayContaining([
        { type: 'business', name: 'input_count', value: 5 },
        { type: 'performance', name: 'processing_time', value: 150 },
        { type: 'error', name: 'error_count', value: 0 }
      ]))
    })

    it('should allow duplicate metric names with different values', async () => {
      const task = createTask({
        name: 'duplicate-metrics-test',
        schema: new Schema({ iterations: Schema.number() }),
        boundaries: {},
        fn: async ({ iterations }, { setMetrics }) => {
          for (let i = 0; i < iterations; i++) {
            await setMetrics({
              type: 'performance',
              name: 'iteration_time',
              value: (i + 1) * 10
            })
          }
          return { completed: iterations }
        }
      })

      const [result, error, record] = await task.safeRun({ iterations: 3 })

      expect(error).toBeNull()
      expect(result).toEqual({ completed: 3 })
      expect(record.metrics).toHaveLength(3)

      expect(record.metrics).toEqual([
        { type: 'performance', name: 'iteration_time', value: 10 },
        { type: 'performance', name: 'iteration_time', value: 20 },
        { type: 'performance', name: 'iteration_time', value: 30 }
      ])
    })

    it('should collect metrics from boundaries and main function', async () => {
      const task = createTask({
        name: 'boundary-metrics-test',
        schema: new Schema({ input: Schema.string() }),
        boundaries: {
          processData: async (data: string) => {
            return data.length
          }
        },
        fn: async ({ input }, { processData, setMetrics }) => {
          await setMetrics({ type: 'business', name: 'requests', value: 1 })

          const length = await processData(input)
          await setMetrics({ type: 'business', name: 'input_length', value: length })

          return { length }
        }
      })

      const [result, error, record] = await task.safeRun({ input: 'hello world' })

      expect(error).toBeNull()
      expect(result).toEqual({ length: 11 })
      expect(record.metrics).toHaveLength(2)

      expect(record.metrics).toEqual(expect.arrayContaining([
        { type: 'business', name: 'requests', value: 1 },
        { type: 'business', name: 'input_length', value: 11 }
      ]))
    })
  })

  describe('Metrics behavior in error scenarios', () => {
    it('should preserve metrics collected before error occurs', async () => {
      const task = createTask({
        name: 'error-metrics-test',
        schema: new Schema({ shouldFail: Schema.boolean() }),
        boundaries: {},
        fn: async ({ shouldFail }, { setMetrics }) => {
          await setMetrics({ type: 'business', name: 'attempt_count', value: 1 })
          await setMetrics({ type: 'performance', name: 'preparation_time', value: 50 })

          if (shouldFail) {
            await setMetrics({ type: 'error', name: 'failure_count', value: 1 })
            throw new Error('Intentional failure')
          }

          return { success: true }
        }
      })

      const [result, error, record] = await task.safeRun({ shouldFail: true })

      expect(result).toBeNull()
      expect(error).not.toBeNull()
      expect(record.type).toBe('error')
      expect(record.metrics).toHaveLength(3)

      expect(record.metrics).toEqual(expect.arrayContaining([
        { type: 'business', name: 'attempt_count', value: 1 },
        { type: 'performance', name: 'preparation_time', value: 50 },
        { type: 'error', name: 'failure_count', value: 1 }
      ]))
    })

    it('should handle boundary errors while preserving metrics', async () => {
      const task = createTask({
        name: 'boundary-error-metrics-test',
        schema: new Schema({ input: Schema.string() }),
        boundaries: {
          failingBoundary: async (data: string) => {
            throw new Error(`Boundary failed for: ${data}`)
          }
        },
        fn: async ({ input }, { failingBoundary, setMetrics }) => {
          await setMetrics({ type: 'business', name: 'attempts', value: 1 })

          try {
            await failingBoundary(input)
          } catch (error) {
            await setMetrics({ type: 'error', name: 'boundary_failures', value: 1 })
            throw error
          }

          return { success: true }
        }
      })

      const [result, error, record] = await task.safeRun({ input: 'test' })

      expect(result).toBeNull()
      expect(error).not.toBeNull()
      expect(record.type).toBe('error')
      expect(record.metrics).toHaveLength(2)

      expect(record.metrics).toEqual(expect.arrayContaining([
        { type: 'business', name: 'attempts', value: 1 },
        { type: 'error', name: 'boundary_failures', value: 1 }
      ]))
    })

    it('should reject invalid metrics and continue execution', async () => {
      const task = createTask({
        name: 'invalid-metrics-test',
        schema: new Schema({ input: Schema.string() }),
        boundaries: {},
        fn: async ({ input }, { setMetrics }) => {
          // Valid metric should be stored
          await setMetrics({ type: 'business', name: 'valid_metric', value: 1 })

          // Invalid metrics should be rejected but not crash the task
          try {
            await setMetrics({ type: '', name: 'invalid', value: 1 } as any)
          } catch (error) {
            // Expected to fail validation
          }

          try {
            await setMetrics({ type: 'business', name: 'invalid', value: NaN } as any)
          } catch (error) {
            // Expected to fail validation
          }

          // Another valid metric should still work
          await setMetrics({ type: 'performance', name: 'final_metric', value: 100 })

          return { result: input }
        }
      })

      const [result, error, record] = await task.safeRun({ input: 'test' })

      expect(error).toBeNull()
      expect(result).toEqual({ result: 'test' })
      expect(record.metrics).toHaveLength(2) // Only valid metrics should be stored

      expect(record.metrics).toEqual(expect.arrayContaining([
        { type: 'business', name: 'valid_metric', value: 1 },
        { type: 'performance', name: 'final_metric', value: 100 }
      ]))
    })
  })

  describe('Metrics behavior during replay', () => {
    it('should preserve original metrics during replay', async () => {
      const task = createTask({
        name: 'replay-metrics-test',
        schema: new Schema({ input: Schema.string() }),
        boundaries: {
          dataFetch: async (query: string) => {
            return `data-for-${query}`
          }
        },
        fn: async ({ input }, { dataFetch, setMetrics }) => {
          await setMetrics({ type: 'business', name: 'queries', value: 1 })
          const data = await dataFetch(input)
          await setMetrics({ type: 'performance', name: 'data_size', value: data.length })
          return { data }
        }
      })

      // First run to get original execution
      const [originalResult, originalError, originalRecord] = await task.safeRun({ input: 'test' })

      expect(originalError).toBeNull()
      expect(originalResult).toEqual({ data: 'data-for-test' })
      expect(originalRecord.metrics).toHaveLength(2)

      // Replay the execution
      const [replayResult, replayError, replayRecord] = await task.safeReplay(originalRecord, {})

      expect(replayError).toBeNull()
      expect(replayResult).toEqual({ data: 'data-for-test' })

      // Replay should preserve original metrics and may add new ones
      expect(replayRecord.metrics?.length).toBeGreaterThanOrEqual(2)

      // Original metrics should be included
      expect(replayRecord.metrics).toEqual(expect.arrayContaining([
        { type: 'business', name: 'queries', value: 1 },
        { type: 'performance', name: 'data_size', value: 13 }
      ]))
    })

    it('should allow new metrics during replay execution', async () => {
      const task = createTask({
        name: 'replay-new-metrics-test',
        schema: new Schema({ mode: Schema.string() }),
        boundaries: {
          operation: async (mode: string) => {
            return `result-${mode}`
          }
        },
        fn: async ({ mode }, { operation, setMetrics }) => {
          if (mode === 'original') {
            await setMetrics({ type: 'business', name: 'original_run', value: 1 })
          } else if (mode === 'replay') {
            await setMetrics({ type: 'business', name: 'replay_run', value: 1 })
          }

          const result = await operation(mode)
          await setMetrics({ type: 'performance', name: 'execution_count', value: 1 })

          return { result }
        }
      })

      // Original run
      const [originalResult, originalError, originalRecord] = await task.safeRun({ mode: 'original' })
      expect(originalError).toBeNull()
      expect(originalRecord.metrics).toHaveLength(2)

      // Modify the record for replay to change the mode
      const modifiedRecord = {
        ...originalRecord,
        input: { mode: 'replay' }
      }

      // Replay with different mode
      const [replayResult, replayError, replayRecord] = await task.safeReplay(modifiedRecord, {})

      expect(replayError).toBeNull()
      expect(replayRecord.metrics?.length).toBeGreaterThanOrEqual(2)

      // Should have both original metrics and new replay metrics
      const metricNames = replayRecord.metrics?.map(m => m.name) || []
      expect(metricNames).toContain('execution_count')
    })
  })

  describe('Performance metrics and complex scenarios', () => {
    it('should handle high-frequency metric collection', async () => {
      const task = createTask({
        name: 'high-frequency-metrics-test',
        schema: new Schema({ count: Schema.number() }),
        boundaries: {},
        fn: async ({ count }, { setMetrics }) => {
          for (let i = 0; i < count; i++) {
            await setMetrics({
              type: 'performance',
              name: 'iteration',
              value: i
            })
          }
          return { completed: count }
        }
      })

      const [result, error, record] = await task.safeRun({ count: 100 })

      expect(error).toBeNull()
      expect(result).toEqual({ completed: 100 })
      expect(record.metrics).toHaveLength(100)

      // Verify all metrics were collected correctly
      record.metrics?.forEach((metric, index) => {
        expect(metric).toEqual({
          type: 'performance',
          name: 'iteration',
          value: index
        })
      })
    })

    it('should support different metric types in complex workflow', async () => {
      const task = createTask({
        name: 'complex-workflow-metrics-test',
        schema: new Schema({
          userId: Schema.string(),
          operations: Schema.array(Schema.string())
        }),
        boundaries: {
          validateUser: async (userId: string) => {
            return userId.length > 0
          },
          processOperation: async (operation: string) => {
            return `processed-${operation}`
          }
        },
        fn: async ({ userId, operations }, { validateUser, processOperation, setMetrics }) => {
          // Business metrics
          await setMetrics({ type: 'business', name: 'user_requests', value: 1 })
          await setMetrics({ type: 'business', name: 'operation_count', value: operations.length })

          const startTime = Date.now()

          // Validate user
          const isValid = await validateUser(userId)
          if (!isValid) {
            await setMetrics({ type: 'error', name: 'validation_failures', value: 1 })
            throw new Error('Invalid user')
          }

          // Process operations
          const results = []
          for (const operation of operations) {
            const result = await processOperation(operation)
            results.push(result)
            await setMetrics({ type: 'business', name: 'operations_processed', value: 1 })
          }

          // Performance metrics
          const duration = Date.now() - startTime
          await setMetrics({ type: 'performance', name: 'total_processing_time', value: duration })
          await setMetrics({ type: 'performance', name: 'avg_operation_time', value: duration / operations.length })

          // Success metrics
          await setMetrics({ type: 'business', name: 'successful_requests', value: 1 })
          await setMetrics({ type: 'error', name: 'error_count', value: 0 })

          return { userId, results, processingTime: duration }
        }
      })

      const [result, error, record] = await task.safeRun({
        userId: 'user123',
        operations: ['op1', 'op2', 'op3']
      })

      expect(error).toBeNull()
      expect(result?.userId).toBe('user123')
      expect(result?.results).toEqual(['processed-op1', 'processed-op2', 'processed-op3'])

      // Should have collected multiple types of metrics
      expect(record.metrics?.length).toBeGreaterThanOrEqual(8)

      const businessMetrics = record.metrics?.filter(m => m.type === 'business') || []
      const performanceMetrics = record.metrics?.filter(m => m.type === 'performance') || []
      const errorMetrics = record.metrics?.filter(m => m.type === 'error') || []

      expect(businessMetrics.length).toBeGreaterThanOrEqual(5)
      expect(performanceMetrics.length).toBeGreaterThanOrEqual(2)
      expect(errorMetrics.length).toBeGreaterThanOrEqual(1)
    })
  })
})
