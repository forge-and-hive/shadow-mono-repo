import { TimingTracker, type TimingInfo, type Metric, type BoundaryTimingRecord, type BaseExecutionRecord } from '../types'

describe('Timing Utilities', () => {
  describe('TimingTracker', () => {
    it('should track timing correctly with proper TypeScript types', () => {
      const tracker: TimingTracker = new TimingTracker()

      tracker.start()
      const timing: TimingInfo | null = tracker.end()

      expect(timing).not.toBeNull()
      if (timing) {
        expect(typeof timing.startTime).toBe('number')
        expect(typeof timing.endTime).toBe('number')
        expect(typeof timing.duration).toBe('number')
        expect(timing.startTime).toBeLessThanOrEqual(timing.endTime)
        expect(timing.duration).toBeGreaterThanOrEqual(0)
        expect(timing.duration).toBe(timing.endTime - timing.startTime)
      }
    })

    it('should return null if end() called without start()', () => {
      const tracker: TimingTracker = new TimingTracker()
      const timing: TimingInfo | null = tracker.end()

      expect(timing).toBeNull()
    })

    it('should create new instances via static method with correct type', () => {
      const tracker: TimingTracker = TimingTracker.create()
      expect(tracker).toBeInstanceOf(TimingTracker)
    })

    it('should handle multiple start/end cycles', () => {
      const tracker: TimingTracker = new TimingTracker()

      // First cycle
      tracker.start()
      const timing1: TimingInfo | null = tracker.end()
      expect(timing1).not.toBeNull()

      // Second cycle
      tracker.start()
      const timing2: TimingInfo | null = tracker.end()
      expect(timing2).not.toBeNull()

      if (timing1 && timing2) {
        expect(timing2.startTime).toBeGreaterThanOrEqual(timing1.endTime)
      }
    })
  })

  describe('TypeScript Type Definitions', () => {
    it('should enforce TimingInfo structure with required properties', () => {
      const timing: TimingInfo = {
        startTime: 1000,
        endTime: 2000,
        duration: 1000
      }

      expect(timing.startTime).toBe(1000)
      expect(timing.endTime).toBe(2000)
      expect(timing.duration).toBe(1000)

      // TypeScript should enforce these are numbers
      expect(typeof timing.startTime).toBe('number')
      expect(typeof timing.endTime).toBe('number')
      expect(typeof timing.duration).toBe('number')
    })

    it('should enforce Metric structure with typed properties', () => {
      const metric: Metric = {
        type: 'performance',
        name: 'response_time',
        value: 150
      }

      expect(metric.type).toBe('performance')
      expect(metric.name).toBe('response_time')
      expect(metric.value).toBe(150)

      // TypeScript should enforce correct types
      expect(typeof metric.type).toBe('string')
      expect(typeof metric.name).toBe('string')
      expect(typeof metric.value).toBe('number')
    })

    it('should support generic BoundaryTimingRecord with proper typing', () => {
      const stringNumberRecord: BoundaryTimingRecord<[string], number> = {
        input: ['test'],
        output: 42,
        timing: {
          startTime: 1000,
          endTime: 2000,
          duration: 1000
        }
      }

      expect(stringNumberRecord.input).toEqual(['test'])
      expect(stringNumberRecord.output).toBe(42)
      expect(stringNumberRecord.timing.duration).toBe(1000)

      // Test with error record
      const errorRecord: BoundaryTimingRecord<[string], never> = {
        input: ['test'],
        error: 'Something went wrong',
        timing: {
          startTime: 1000,
          endTime: 2000,
          duration: 1000
        }
      }

      expect(errorRecord.input).toEqual(['test'])
      expect(errorRecord.error).toBe('Something went wrong')
      expect(errorRecord.output).toBeUndefined()
    })

    it('should support BaseExecutionRecord with comprehensive typing', () => {
      const executionRecord: BaseExecutionRecord<{ userId: string }, { result: number }> = {
        input: { userId: 'user123' },
        output: { result: 42 },
        taskName: 'testTask',
        metadata: { environment: 'test' },
        metrics: [
          { type: 'performance', name: 'execution_time', value: 150 }
        ],
        timing: {
          startTime: 1000,
          endTime: 2000,
          duration: 1000
        },
        type: 'success'
      }

      expect(executionRecord.input.userId).toBe('user123')
      expect(executionRecord.output?.result).toBe(42)
      expect(executionRecord.taskName).toBe('testTask')
      expect(executionRecord.metadata?.environment).toBe('test')
      expect(executionRecord.metrics?.[0].value).toBe(150)
      expect(executionRecord.timing?.duration).toBe(1000)
      expect(executionRecord.type).toBe('success')
    })
  })
})
