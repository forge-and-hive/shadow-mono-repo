import { createTask, TimingTracker } from '../index'
import { Schema } from '@forgehive/schema'

describe('Timing Capture Tests', () => {
  describe('TimingTracker accuracy and reliability', () => {
    it('should capture timing with millisecond precision', async () => {
      const tracker = TimingTracker.create()

      tracker.start()
      await new Promise(resolve => setTimeout(resolve, 100)) // Wait 100ms
      const timing = tracker.end()

      expect(timing).not.toBeNull()
      if (timing) {
        expect(timing.duration).toBeGreaterThanOrEqual(90) // Allow for some variance
        expect(timing.duration).toBeLessThan(150) // But not too much
        expect(timing.endTime - timing.startTime).toBe(timing.duration)
      }
    })

    it('should handle rapid successive timing operations', () => {
      const timings: any[] = []

      for (let i = 0; i < 10; i++) {
        const tracker = TimingTracker.create()
        tracker.start()
        // Immediate end
        const timing = tracker.end()
        timings.push(timing)
      }

      timings.forEach(timing => {
        expect(timing).not.toBeNull()
        expect(timing.duration).toBeGreaterThanOrEqual(0)
        expect(timing.duration).toBeLessThan(10) // Should be very fast
      })
    })

    it('should provide monotonic timestamps', () => {
      const tracker1 = TimingTracker.create()
      const tracker2 = TimingTracker.create()

      tracker1.start()
      tracker2.start()

      const timing1 = tracker1.end()
      const timing2 = tracker2.end()

      expect(timing1).not.toBeNull()
      expect(timing2).not.toBeNull()
      if (timing1 && timing2) {
        expect(timing2.startTime).toBeGreaterThanOrEqual(timing1.startTime)
      }
    })
  })

  describe('Boundary timing capture in various scenarios', () => {
    it('should capture timing for successful boundary calls', async () => {
      const task = createTask({
        name: 'timing-test-success',
        schema: new Schema({ input: Schema.string() }),
        boundaries: {
          slowOperation: async (data: string) => {
            await new Promise(resolve => setTimeout(resolve, 50))
            return `processed: ${data}`
          }
        },
        fn: async ({ input }, { slowOperation }) => {
          const result = await slowOperation(input)
          return { result }
        }
      })

      const [result, error, record] = await task.safeRun({ input: 'test' })

      expect(error).toBeNull()
      expect(result).toEqual({ result: 'processed: test' })
      expect(record.boundaries.slowOperation).toHaveLength(1)

      const boundaryCall = record.boundaries.slowOperation[0]
      expect(boundaryCall.timing).toEqual(expect.objectContaining({
        startTime: expect.any(Number),
        endTime: expect.any(Number),
        duration: expect.any(Number)
      }))
      expect(boundaryCall.timing.duration).toBeGreaterThanOrEqual(40)
      expect(boundaryCall.timing.duration).toBeLessThan(100)
    })

    it('should capture timing for failed boundary calls', async () => {
      const task = createTask({
        name: 'timing-test-error',
        schema: new Schema({ input: Schema.string() }),
        boundaries: {
          failingOperation: async (data: string) => {
            await new Promise(resolve => setTimeout(resolve, 30))
            throw new Error(`Failed to process: ${data}`)
          }
        },
        fn: async ({ input }, { failingOperation }) => {
          const result = await failingOperation(input)
          return { result }
        }
      })

      const [result, error, record] = await task.safeRun({ input: 'test' })

      expect(result).toBeNull()
      expect(error).not.toBeNull()
      expect(record.boundaries.failingOperation).toHaveLength(1)

      const boundaryCall = record.boundaries.failingOperation[0]
      expect(boundaryCall.timing).toEqual(expect.objectContaining({
        startTime: expect.any(Number),
        endTime: expect.any(Number),
        duration: expect.any(Number)
      }))
      expect(boundaryCall.timing.duration).toBeGreaterThanOrEqual(20)
      expect(boundaryCall.timing.duration).toBeLessThan(60)
      expect('error' in boundaryCall).toBe(true)
    })

    it('should capture timing for multiple boundary calls', async () => {
      const task = createTask({
        name: 'timing-test-multiple',
        schema: new Schema({ count: Schema.number() }),
        boundaries: {
          operation: async (index: number) => {
            await new Promise(resolve => setTimeout(resolve, 20 + index * 10))
            return `result-${index}`
          }
        },
        fn: async ({ count }, { operation }) => {
          const results = []
          for (let i = 0; i < count; i++) {
            results.push(await operation(i))
          }
          return { results }
        }
      })

      const [result, error, record] = await task.safeRun({ count: 3 })

      expect(error).toBeNull()
      expect(result?.results).toEqual(['result-0', 'result-1', 'result-2'])
      expect(record.boundaries.operation).toHaveLength(3)

      record.boundaries.operation.forEach((call, index) => {
        expect(call.timing).toEqual(expect.objectContaining({
          startTime: expect.any(Number),
          endTime: expect.any(Number),
          duration: expect.any(Number)
        }))
        // Each call should take longer than the previous
        expect(call.timing.duration).toBeGreaterThanOrEqual(15 + index * 10)
        expect(call.timing.duration).toBeLessThan(50 + index * 10)
      })
    })

    it('should capture timing for parallel boundary calls', async () => {
      const task = createTask({
        name: 'timing-test-parallel',
        schema: new Schema({ delay: Schema.number() }),
        boundaries: {
          operationA: async (delay: number) => {
            await new Promise(resolve => setTimeout(resolve, delay))
            return 'A'
          },
          operationB: async (delay: number) => {
            await new Promise(resolve => setTimeout(resolve, delay))
            return 'B'
          }
        },
        fn: async ({ delay }, { operationA, operationB }) => {
          const [resultA, resultB] = await Promise.all([
            operationA(delay),
            operationB(delay)
          ])
          return { resultA, resultB }
        }
      })

      const [result, error, record] = await task.safeRun({ delay: 50 })

      expect(error).toBeNull()
      expect(result).toEqual({ resultA: 'A', resultB: 'B' })
      expect(record.boundaries.operationA).toHaveLength(1)
      expect(record.boundaries.operationB).toHaveLength(1)

      const callA = record.boundaries.operationA[0]
      const callB = record.boundaries.operationB[0]

      expect(callA.timing.duration).toBeGreaterThanOrEqual(40)
      expect(callB.timing.duration).toBeGreaterThanOrEqual(40)

      // Both calls should overlap in time since they run in parallel
      const startDiff = Math.abs(callA.timing.startTime - callB.timing.startTime)
      expect(startDiff).toBeLessThan(20) // Started within 20ms of each other
    })
  })

  describe('Main function timing capture', () => {
    it('should capture timing for main task function execution', async () => {
      const task = createTask({
        name: 'timing-test-main',
        schema: new Schema({ delay: Schema.number() }),
        boundaries: {},
        fn: async ({ delay }) => {
          await new Promise(resolve => setTimeout(resolve, delay))
          return { completed: true }
        }
      })

      const [result, error, record] = await task.safeRun({ delay: 100 })

      expect(error).toBeNull()
      expect(result).toEqual({ completed: true })
      expect(record.timing).toEqual(expect.objectContaining({
        startTime: expect.any(Number),
        endTime: expect.any(Number),
        duration: expect.any(Number)
      }))
      expect(record.timing?.duration).toBeGreaterThanOrEqual(90)
      expect(record.timing?.duration).toBeLessThan(150)
    })

    it('should capture timing even when main function throws error', async () => {
      const task = createTask({
        name: 'timing-test-main-error',
        schema: new Schema({ delay: Schema.number() }),
        boundaries: {},
        fn: async ({ delay }) => {
          await new Promise(resolve => setTimeout(resolve, delay))
          throw new Error('Intentional error')
        }
      })

      const [result, error, record] = await task.safeRun({ delay: 80 })

      expect(result).toBeNull()
      expect(error).not.toBeNull()
      expect(record.timing).toEqual(expect.objectContaining({
        startTime: expect.any(Number),
        endTime: expect.any(Number),
        duration: expect.any(Number)
      }))
      expect(record.timing?.duration).toBeGreaterThanOrEqual(70)
      expect(record.timing?.duration).toBeLessThan(120)
    })

    it('should include both main function and boundary timing', async () => {
      const task = createTask({
        name: 'timing-test-comprehensive',
        schema: new Schema({ delay: Schema.number() }),
        boundaries: {
          slowBoundary: async (delay: number) => {
            await new Promise(resolve => setTimeout(resolve, delay))
            return 'boundary-result'
          }
        },
        fn: async ({ delay }, { slowBoundary }) => {
          await new Promise(resolve => setTimeout(resolve, delay))
          const boundaryResult = await slowBoundary(delay)
          await new Promise(resolve => setTimeout(resolve, delay))
          return { main: 'completed', boundary: boundaryResult }
        }
      })

      const [result, error, record] = await task.safeRun({ delay: 50 })

      expect(error).toBeNull()
      expect(result).toEqual({ main: 'completed', boundary: 'boundary-result' })

      // Main function timing should include all delays
      expect(record.timing?.duration).toBeGreaterThanOrEqual(140) // 3 * 50ms delays
      expect(record.timing?.duration).toBeLessThan(200)

      // Boundary timing should only include its delay
      expect(record.boundaries.slowBoundary[0].timing.duration).toBeGreaterThanOrEqual(40)
      expect(record.boundaries.slowBoundary[0].timing.duration).toBeLessThan(80)

      // Boundary timing should be within the main function timing
      const mainTiming = record.timing!
      const boundaryTiming = record.boundaries.slowBoundary[0].timing

      expect(boundaryTiming.startTime).toBeGreaterThanOrEqual(mainTiming.startTime)
      expect(boundaryTiming.endTime).toBeLessThanOrEqual(mainTiming.endTime)
    })
  })

  describe('Edge cases and error scenarios', () => {
    it('should handle timing when schema validation fails', async () => {
      const task = createTask({
        name: 'timing-test-validation-error',
        schema: new Schema({ requiredField: Schema.string() }),
        boundaries: {},
        fn: async ({ requiredField }) => {
          return { field: requiredField }
        }
      })

      const [result, error, record] = await task.safeRun({ wrongField: 'test' } as any)

      expect(result).toBeNull()
      expect(error).not.toBeNull()
      expect(record.type).toBe('error')

      // Should not have main function timing since function wasn't executed
      expect(record.timing).toBeUndefined()
    })

    it('should handle timing with very fast operations', async () => {
      const task = createTask({
        name: 'timing-test-fast',
        schema: new Schema({ input: Schema.string() }),
        boundaries: {
          fastOperation: async (data: string) => {
            return data.toUpperCase() // Very fast operation
          }
        },
        fn: async ({ input }, { fastOperation }) => {
          const result = await fastOperation(input)
          return { result }
        }
      })

      const [result, error, record] = await task.safeRun({ input: 'test' })

      expect(error).toBeNull()
      expect(result).toEqual({ result: 'TEST' })

      const boundaryCall = record.boundaries.fastOperation[0]
      expect(boundaryCall.timing).toEqual(expect.objectContaining({
        startTime: expect.any(Number),
        endTime: expect.any(Number),
        duration: expect.any(Number)
      }))

      // Even very fast operations should have non-negative duration
      expect(boundaryCall.timing.duration).toBeGreaterThanOrEqual(0)
      expect(boundaryCall.timing.duration).toBeLessThan(50)
    })
  })
})
