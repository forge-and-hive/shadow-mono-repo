import { createTask, type Metric, validateMetric, createMetric } from '../index'
import { Schema } from '@forgehive/schema'

describe('setMetrics boundary', () => {
  describe('validateMetric function', () => {
    it('should validate correct metrics', () => {
      const validMetric: Metric = {
        type: 'performance',
        name: 'response_time',
        value: 150
      }

      expect(validateMetric(validMetric)).toBe(true)
    })

    it('should reject invalid metrics', () => {
      expect(validateMetric(null)).toBe(false)
      expect(validateMetric(undefined)).toBe(false)
      expect(validateMetric({})).toBe(false)
      expect(validateMetric({ type: '', name: 'test', value: 1 })).toBe(false)
      expect(validateMetric({ type: 'test', name: '', value: 1 })).toBe(false)
      expect(validateMetric({ type: 'test', name: 'test', value: NaN })).toBe(false)
      expect(validateMetric({ type: 'test', name: 'test', value: Infinity })).toBe(false)
    })
  })

  describe('createMetric function', () => {
    it('should create valid metrics', () => {
      const metric = createMetric('performance', 'response_time', 150)

      expect(metric).toEqual({
        type: 'performance',
        name: 'response_time',
        value: 150
      })
    })

    it('should throw for invalid metrics', () => {
      expect(() => createMetric('', 'test', 1)).toThrow('Invalid metric')
      expect(() => createMetric('test', '', 1)).toThrow('Invalid metric')
      expect(() => createMetric('test', 'test', NaN)).toThrow('Invalid metric')
    })
  })

  describe('setMetrics boundary integration', () => {
    it('should collect metrics during task execution', async () => {
      const schema = new Schema({
        userId: Schema.string()
      })

      const task = createTask({
        name: 'getUserData',
        schema,
        boundaries: {
          fetchUser: async (userId: string) => ({ id: userId, name: 'Test User' })
        },
        fn: async ({ userId }, { fetchUser, setMetrics }) => {
          // Add a performance metric
          await setMetrics({
            type: 'performance',
            name: 'api_response_time',
            value: 250
          })

          const user = await fetchUser(userId)

          // Add a business metric
          await setMetrics({
            type: 'business',
            name: 'users_processed',
            value: 1
          })

          return { user }
        }
      })

      const [result, error, record] = await task.safeRun({ userId: 'user123' })

      expect(error).toBeNull()
      expect(result).toEqual({
        user: { id: 'user123', name: 'Test User' }
      })

      // Check that metrics were collected
      expect(record.metrics).toHaveLength(2)
      expect(record.metrics?.[0]).toEqual({
        type: 'performance',
        name: 'api_response_time',
        value: 250
      })
      expect(record.metrics?.[1]).toEqual({
        type: 'business',
        name: 'users_processed',
        value: 1
      })

      // Check that timing was captured
      expect(record.timing).toEqual(expect.objectContaining({
        startTime: expect.any(Number),
        endTime: expect.any(Number),
        duration: expect.any(Number)
      }))
    })

    it('should validate metrics and reject invalid ones', async () => {
      const schema = new Schema({
        value: Schema.number()
      })

      const task = createTask({
        name: 'testValidation',
        schema,
        boundaries: {},
        fn: async ({ value }, { setMetrics }) => {
          // Try to set an invalid metric
          await setMetrics({
            type: '',
            name: 'invalid_metric',
            value: value
          } as Metric)

          return { result: value }
        }
      })

      const [result, error, record] = await task.safeRun({ value: 42 })

      expect(result).toBeNull()
      expect(error).not.toBeNull()
      expect(error?.message).toContain('Invalid metric provided')
      expect(record.type).toBe('error')
    })

    it('should accumulate multiple metrics correctly', async () => {
      const schema = new Schema({
        count: Schema.number()
      })

      const task = createTask({
        name: 'accumulateMetrics',
        schema,
        boundaries: {},
        fn: async ({ count }, { setMetrics }) => {
          // Add metrics in a loop
          for (let i = 0; i < count; i++) {
            await setMetrics({
              type: 'processing',
              name: `item_${i}`,
              value: i * 10
            })
          }

          return { processedCount: count }
        }
      })

      const [result, error, record] = await task.safeRun({ count: 3 })

      expect(error).toBeNull()
      expect(result).toEqual({ processedCount: 3 })

      // Check that all metrics were collected
      expect(record.metrics).toHaveLength(3)
      expect(record.metrics?.[0]).toEqual({
        type: 'processing',
        name: 'item_0',
        value: 0
      })
      expect(record.metrics?.[1]).toEqual({
        type: 'processing',
        name: 'item_1',
        value: 10
      })
      expect(record.metrics?.[2]).toEqual({
        type: 'processing',
        name: 'item_2',
        value: 20
      })
    })

    it('should not include setMetrics calls in boundary logs', async () => {
      const schema = new Schema({
        value: Schema.number()
      })

      const task = createTask({
        name: 'metricsNotInBoundaries',
        schema,
        boundaries: {
          calculate: async (val: number) => val * 2
        },
        fn: async ({ value }, { calculate, setMetrics }) => {
          const result = await calculate(value)

          await setMetrics({
            type: 'calculation',
            name: 'result_value',
            value: result
          })

          return { result }
        }
      })

      const [, error, record] = await task.safeRun({ value: 5 })

      expect(error).toBeNull()

      // Verify that setMetrics is not in the boundary logs
      expect(record.boundaries).toHaveProperty('calculate')
      expect(record.boundaries).not.toHaveProperty('setMetrics')

      // But metrics should be collected
      expect(record.metrics).toHaveLength(1)
      expect(record.metrics?.[0]).toEqual({
        type: 'calculation',
        name: 'result_value',
        value: 10
      })
    })
  })
})
