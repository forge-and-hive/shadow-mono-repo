import * as assert from 'assert'

// Define generic types for input and output
type BaseBoundary = (...args: unknown[]) => unknown

export type Mode = 'proxy' | 'proxy-pass' | 'proxy-catch' | 'replay'

/**
 * Represents a boundary function that can be called within a task
 * Using any here for compatibility with existing tests
 * @template TReturn - The return type of the function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BoundaryFunction<TReturn = any> = (...args: any[]) => Promise<TReturn>

/**
 * Represents a record of a boundary function call
 * @template TInput - The type of input data
 * @template TOutput - The type of output data
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface BoundaryRecord<TInput = any[], TOutput = any> {
  input: TInput
  output?: TOutput
  error?: string
}

/**
 * Represents a wrapped boundary function with additional methods
 */
export interface WrappedBoundaryFunction<Func extends BoundaryFunction = BoundaryFunction> {
  (...args: Parameters<Func>): Promise<ReturnType<Func>>
  getTape: () => Array<BoundaryRecord<Parameters<Func>, Awaited<ReturnType<Func>>>>
  setTape: (newTape: Array<BoundaryRecord<Parameters<Func>, Awaited<ReturnType<Func>>>>) => void
  getMode: () => Mode
  setMode: (newMode: Mode) => void
  startRun: () => void
  stopRun: () => void
  getRunData: () => Array<BoundaryRecord<Parameters<Func>, Awaited<ReturnType<Func>>>>
}

/**
 * Represents a collection of boundary functions
 */
export type Boundaries = Record<string, BoundaryFunction>

/**
 * Represents a collection of wrapped boundary functions
 */
export type WrappedBoundaries<B extends Boundaries = Boundaries> = {
  [K in keyof B]: WrappedBoundaryFunction<B[K]>
}

export const createBoundary = <Func extends BaseBoundary>(fn: Func): WrappedBoundaryFunction<Func extends BoundaryFunction ? Func : never> => {
  type FuncInput = Parameters<Func>;
  type FuncOutput = Awaited<ReturnType<Func>>;
  type RecordType = BoundaryRecord<FuncInput, FuncOutput>;

  let runLog: RecordType[] = []
  let cacheTape: RecordType[] = []
  let mode: Mode = 'proxy'
  let hasRun: boolean = false

  const wrappedFn = async (...args: Parameters<Func>): Promise<ReturnType<Func>> => {
    const findRecord = (record: FuncInput, tape: RecordType[]): RecordType | undefined => {
      const result = tape.find((item) => {
        if (typeof item === 'undefined') { return false }

        let error
        try {
          assert.deepEqual(record, item.input)
        } catch (e) {
          error = e
        }

        return typeof error === 'undefined'
      })

      return result
    }

    const record: RecordType = {
      input: args
    }

    if (mode === 'proxy-pass') {
      const record = findRecord(args, cacheTape)

      if (typeof record !== 'undefined') {
        return await (async (): Promise<ReturnType<Func>> => {
          return record.output as unknown as ReturnType<Func>
        })()
      }
    }

    if (mode === 'replay') {
      return await (async (): Promise<ReturnType<Func>> => {
        const record = findRecord(args, cacheTape)

        if (typeof record === 'undefined') {
          throw new Error('No tape value for this inputs')
        }

        if (typeof record.error !== 'undefined') {
          throw new Error(record.error)
        }

        return record.output as unknown as ReturnType<Func>
      })()
    }

    return await (async (): Promise<ReturnType<Func>> => {
      let result, error: Error | undefined
      try {
        result = await fn(...args)
      } catch (e) {
        error = e as Error
      }

      if (typeof error !== 'undefined') {
        const prevRecord: RecordType | undefined = findRecord(args, cacheTape)
        if (mode === 'proxy-catch' && typeof prevRecord !== 'undefined') {
          return await (async (): Promise<ReturnType<Func>> => {
            return prevRecord.output as unknown as ReturnType<Func>
          })()
        } else {
          record.error = error.message

          if (hasRun) { runLog.push(record) }
          cacheTape.push(record)

          throw error
        }
      } else {
        record.output = result as FuncOutput

        if (hasRun) { runLog.push(record) }
        cacheTape.push(record)

        return result as ReturnType<Func>
      }
    })()
  }

  // tape cache
  wrappedFn.getTape = function (): Array<RecordType> {
    return cacheTape
  }

  wrappedFn.setTape = function (newTape: Array<RecordType>): void {
    cacheTape = newTape
  }

  // Mode
  wrappedFn.getMode = function (): Mode {
    return mode
  }

  wrappedFn.setMode = function (newMode: Mode): void {
    mode = newMode
  }

  // run log
  wrappedFn.startRun = function (): void {
    runLog = []
    hasRun = true
  }

  wrappedFn.stopRun = function (): void {
    hasRun = false
  }

  wrappedFn.getRunData = function (): Array<RecordType> {
    return runLog
  }

  return wrappedFn as unknown as WrappedBoundaryFunction<Func extends BoundaryFunction ? Func : never>
}
