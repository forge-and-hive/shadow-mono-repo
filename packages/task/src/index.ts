import { Schema, type SchemaType, type InferSchema, type SchemaDescription } from '@forgehive/schema'
import { createBoundary, type Mode, type Boundaries, type WrappedBoundaries, type WrappedBoundaryFunction } from './utils/boundary'

export interface Task {
  id: string;
  title: string;
  completed: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BaseFunction = (...args: any[]) => any

// Re-export the boundary types for external use
export type { BoundaryFunction, WrappedBoundaryFunction, Boundaries, WrappedBoundaries, Mode } from './utils/boundary'

// Re-export Schema for external use
export { Schema }

export interface TaskConfig<B extends Boundaries = Boundaries> {
  schema?: Schema<Record<string, SchemaType>>
  mode?: Mode
  boundaries?: B
  boundariesData?: Record<string, unknown>
}

// ToDo: Add a type for the boundaries data
/**
 * Represents the record passed to task listeners
 */
export interface TaskRecord<InputType = unknown, OutputType = unknown> {
  /** The input arguments passed to the task */
  input: InputType;
  /** The output returned by the task (if successful) */
  output?: OutputType;
  /** The error message if the task failed */
  error?: string;
  /** Boundary execution data */
  boundaries?: Record<string, unknown>;
}

// Make BoundaryLog generic
export type BoundaryLog<I extends unknown[] = unknown[], O = unknown> = {
  input: I
  output: O | null
  error: string | null
}

// Mapped type for boundaries
export type BoundaryLogsFor<B extends Boundaries> = {
  [K in keyof B]: B[K] extends (...args: infer I) => Promise<infer O>
    ? BoundaryLog<I, O>[]
    : BoundaryLog[]
}

/**
 * Represents the execution record of a task, including input, output, error, and boundary data
 */
export interface ExecutionRecord<InputType = unknown, OutputType = unknown, B extends Boundaries = Boundaries> {
  /** The input arguments passed to the task */
  input: InputType
  /** The output returned by the task (if successful) */
  output?: OutputType | null
  /** The error message if the task failed */
  error?: string
  /** Boundary execution data */
  boundaries: BoundaryLogsFor<B>
}

export interface TaskInstanceType<Func extends BaseFunction = BaseFunction, B extends Boundaries = Boundaries> {
  version: string

  getMode: () => Mode
  setMode: (mode: Mode) => void
  setSchema: (base: Schema<Record<string, SchemaType>>) => void
  getSchema: () => Schema<Record<string, SchemaType>> | undefined
  setDescription: (description: string) => void
  getDescription: () => string | undefined
  describe: () => SchemaDescription

  // Validation methos
  validate: <T extends Record<string, unknown> = Parameters<Func>[0]>(argv?: T) => ReturnType<Schema<Record<string, SchemaType>>['safeParse']> | undefined
  isValid: <T extends Record<string, unknown> = Parameters<Func>[0]>(argv?: T) => boolean

  // Listener methods
  addListener: <I = Parameters<Func>[0], O = ReturnType<Func>>(fn: (record: TaskRecord<I, O>) => void) => void
  removeListener: () => void
  emit: (data: Partial<TaskRecord>) => void

  // Boundary methods
  asBoundary: () => (args: Parameters<Func>[0]) => Promise<ReturnType<Func>>
  getBoundaries: () => WrappedBoundaries<B>
  setBoundariesData: (boundariesData: Record<string, unknown>) => void
  getBondariesData: () => Record<string, unknown>

  // Mocking methods for testing
  mockBoundary: <K extends keyof B>(name: K, mockFn: WrappedBoundaryFunction) => void
  resetMock: <K extends keyof B>(name: K) => void
  resetMocks: () => void

  run: (argv?: Parameters<Func>[0]) => Promise<ReturnType<Func>>
  safeRun: (argv?: Parameters<Func>[0]) => Promise<[ReturnType<Func> | null, Error | null, ExecutionRecord<Parameters<Func>[0], ReturnType<Func>, B>]>
}

// Helper type to infer schema type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InferSchemaType<S> = S extends Schema<any> ? InferSchema<S> : Record<string, unknown>;

// Helper type for task function with proper typing
export type TaskFunction<S, B extends Boundaries> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (argv: InferSchemaType<S>, boundaries: WrappedBoundaries<B>) => Promise<any>;

// Define a type for the accumulated boundary data
type BoundaryData = Array<{input: unknown[], output?: unknown}>

export const Task = class Task<
  B extends Boundaries = Boundaries,
  Func extends BaseFunction = BaseFunction
> implements TaskInstanceType<Func, B> {
  public version: string = '0.1.7'

  _fn: Func
  _mode: Mode
  _coolDown: number
  _description?: string

  _boundariesDefinition: B
  _boundariesData: Record<string, unknown> | null
  _accumulatedBoundariesData: Record<string, BoundaryData> = {}

  // For storing mocks
  _boundaryMocks: Record<string, WrappedBoundaryFunction> = {}

  _schema: Schema<Record<string, SchemaType>> | undefined
  _listener?: ((record: TaskRecord<Parameters<Func>[0], ReturnType<Func>>) => void) | undefined

  constructor (fn: Func, conf: TaskConfig<B> = {
    schema: undefined,
    mode: 'proxy',
    boundaries: undefined,
    boundariesData: undefined
  }) {
    this._fn = fn
    this._schema = undefined
    if (typeof conf.schema !== 'undefined') {
      this._schema = conf.schema
    }

    this._mode = conf.mode ?? 'proxy'
    this._boundariesDefinition = conf.boundaries ?? {} as B

    this._listener = undefined

    // Cool down time before killing the process on cli runner
    this._coolDown = 1000

    // Initialize boundaries data
    this._boundariesData = conf.boundariesData ?? null

    // Initialize empty accumulated boundaries data structure
    for (const name in this._boundariesDefinition) {
      this._accumulatedBoundariesData[name] = []
    }

    // Initialize accumulated boundaries data from initial boundaries data
    if (this._boundariesData) {
      // Type assertion to handle initial data safely
      for (const name in this._boundariesData) {
        if (Array.isArray(this._boundariesData[name])) {
          this._accumulatedBoundariesData[name] = this._boundariesData[name] as BoundaryData
        } else {
          this._accumulatedBoundariesData[name] = []
        }
      }
    }
  }

  getMode (): Mode {
    return this._mode
  }

  setMode (mode: Mode): void {
    this._mode = mode
  }

  setSchema (schema: Schema<Record<string, SchemaType>>): void {
    this._schema = schema
  }

  getSchema (): Schema<Record<string, SchemaType>> | undefined {
    return this._schema
  }

  setDescription(description: string): void {
    this._description = description
  }

  getDescription(): string | undefined {
    return this._description
  }

  describe(): SchemaDescription {
    return this._schema?.describe() ?? {}
  }

  validate<T extends Record<string, unknown> = Parameters<Func>[0]>(argv?: T): ReturnType<Schema<Record<string, SchemaType>>['safeParse']> | undefined {
    if (typeof this._schema === 'undefined') {
      return undefined
    }

    const result = this._schema.safeParse(argv)

    return result
  }

  isValid<T extends Record<string, unknown> = Parameters<Func>[0]>(argv?: T): boolean {
    if (typeof this._schema === 'undefined') {
      return true
    }

    const result = this._schema.safeParse(argv)
    return result.success ?? false
  }

  // Posible improvement to handle multiple listeners, but so far its not needed
  addListener<I = Parameters<Func>[0], O = ReturnType<Func>>(fn: (record: TaskRecord<I, O>) => void): void {
    this._listener = fn as (record: TaskRecord<Parameters<Func>[0], ReturnType<Func>>) => void
  }

  removeListener (): void {
    this._listener = undefined
  }

  /*
    The listener get the input/outout of the call
    Plus all the boundary data
  */
  emit (data: Partial<TaskRecord>): void {
    if (typeof this._listener === 'undefined') { return }

    this._listener(data as TaskRecord<Parameters<Func>[0], ReturnType<Func>>)
  }

  getBoundaries (): WrappedBoundaries<B> {
    // Create fresh boundaries when requested
    return this._createBounderies({
      definition: this._boundariesDefinition,
      baseData: this._boundariesData,
      mode: this._mode
    })
  }

  setBoundariesData (boundariesData: Record<string, unknown>): void {
    this._boundariesData = boundariesData

    // Update accumulated data as well
    // Type assertion to handle provided data safely
    for (const name in boundariesData) {
      if (Array.isArray(boundariesData[name])) {
        this._accumulatedBoundariesData[name] = boundariesData[name] as BoundaryData
      } else {
        this._accumulatedBoundariesData[name] = []
      }
    }
  }

  getBondariesData (): Record<string, unknown> {
    return this._accumulatedBoundariesData
  }

  /**
   * Mocks a specific boundary function for testing
   * @param name The name of the boundary to mock
   * @param mockFn The mock function to use
   */
  mockBoundary<K extends keyof B>(name: K, mockFn: WrappedBoundaryFunction): void {
    this._boundaryMocks[name as string] = mockFn
  }

  /**
   * Resets a specific mocked boundary back to its original function
   * @param name The name of the boundary to reset
   */
  resetMock<K extends keyof B>(name: K): void {
    if (this._boundaryMocks[name as string]) {
      delete this._boundaryMocks[name as string]
    }
  }

  /**
   * Resets all mocked boundaries back to their original functions
   */
  resetMocks(): void {
    this._boundaryMocks = {}
  }

  _createBounderies ({
    definition,
    baseData,
    mode = 'proxy'
  }: {
    definition: B;
    baseData: Record<string, unknown> | null;
    mode?: Mode;
  }): WrappedBoundaries<B> {
    const boundariesFns: Record<string, WrappedBoundaryFunction> = {}

    for (const name in definition) {
      // Check if we have a mock for this boundary
      if (this._boundaryMocks[name]) {
        boundariesFns[name] = this._boundaryMocks[name]
        continue
      }

      // Otherwise create the normal boundary
      const boundary = createBoundary(definition[name])

      if (baseData !== null && typeof baseData[name] !== 'undefined') {
        const tape = baseData[name]

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        boundary.setTape(tape as any)
      }
      boundary.setMode(mode as Mode)

      boundariesFns[name] = boundary
    }

    return boundariesFns as WrappedBoundaries<B>
  }

  asBoundary (): (args: Parameters<Func>[0]) => Promise<ReturnType<Func>> {
    return async (args: Parameters<Func>[0]): Promise<ReturnType<Func>> => {
      return await this.run(args)
    }
  }

  async safeRun (argv?: Parameters<Func>[0]): Promise<[
    ReturnType<Func> | null,
    Error | null,
    ExecutionRecord<Parameters<Func>[0], ReturnType<Func>, B>
  ]> {
    // Initialize log item
    const logItem: ExecutionRecord<Parameters<Func>[0], ReturnType<Func>, B> = {
      input: argv as Parameters<Func>[0],
      boundaries: {} as BoundaryLogsFor<B>
    }

    // Create fresh boundaries for this execution
    const executionBoundaries = this._createBounderies({
      definition: this._boundariesDefinition,
      baseData: this._boundariesData,
      mode: this._mode
    })

    // Start run for each boundary
    for (const name in executionBoundaries) {
      const boundary = executionBoundaries[name]
      boundary.startRun()
    }

    // Handle schema validation
    if (this._schema) {
      const validation = this._schema.safeParse(argv)
      if (!validation.success) {
        const errorDetails = validation.error?.errors.map(err =>
          `${err.path.join('.')}: ${err.message}`
        ).join(', ')

        const errorMessage = errorDetails
          ? `Invalid input on: ${errorDetails}`
          : 'Invalid input'

        logItem.error = errorMessage
        logItem.boundaries = {} as BoundaryLogsFor<B>

        // Add boundary elements empty
        for (const name in executionBoundaries) {
          logItem.boundaries[name as keyof B] = [] as unknown as BoundaryLogsFor<B>[typeof name]
        }

        this.emit(logItem)
        return [null, new Error(errorMessage), logItem]
      }
    }

    let output: ReturnType<Func> | null = null
    let error: Error | null = null

    try {
      // Execute the task function
      output = await this._fn(
        argv as Parameters<Func>[0],
        executionBoundaries as unknown as Parameters<Func>[1]
      )

      logItem.output = output
    } catch (caughtError) {
      const errorMessage = caughtError instanceof Error ? caughtError.message : String(caughtError)
      logItem.error = errorMessage
      error = new Error(errorMessage)
    }

    // Process boundary data after execution (both success and error cases)
    const boundariesRunLog: BoundaryLogsFor<B> = {} as BoundaryLogsFor<B>

    for (const name in executionBoundaries) {
      const boundary = executionBoundaries[name]
      const runData = boundary.getRunData()

      // Add to the run log
      boundariesRunLog[name as keyof B] = runData as unknown as BoundaryLogsFor<B>[typeof name]

      // Accumulate in the task's total boundaries data
      if (!this._accumulatedBoundariesData[name]) {
        this._accumulatedBoundariesData[name] = []
      }

      // Get the current accumulated data for this boundary
      const currentData = this._accumulatedBoundariesData[name]

      // Add the new run data
      if (Array.isArray(runData) && runData.length > 0) {
        // Cast the run data to the correct type
        this._accumulatedBoundariesData[name] = [...currentData, ...(runData as BoundaryData)]
      }
    }

    // Set boundaries in log item before emitting
    logItem.boundaries = boundariesRunLog

    // Emit the log item
    this.emit(logItem)

    // Return the error, output and log item
    return [output, error, logItem]
  }

  async run (argv?: Parameters<Func>[0]): Promise<ReturnType<Func>> {
    const [result, error] = await this.safeRun(argv)

    if (error) {
      throw error
    }

    return result as ReturnType<Func>
  }
}

/**
 * Helper function to create a task with proper type inference
 * @param schema The schema to validate input against
 * @param boundaries The boundaries to use
 * @param fn The task function
 * @param config Additional task configuration
 * @returns A new Task instance with proper type inference
 */
export function createTask<
  S extends Schema<Record<string, SchemaType>>,
  B extends Boundaries,
  R
>(
  schema: S,
  boundaries: B,
  fn: (argv: InferSchemaType<S>, boundaries: WrappedBoundaries<B>) => Promise<R>,
  config?: Omit<TaskConfig<B>, 'schema' | 'boundaries'>
): TaskInstanceType<(argv: InferSchemaType<S>, boundaries: WrappedBoundaries<B>) => Promise<R>, B> {
  return new Task(
    fn,
    {
      schema,
      boundaries,
      ...config
    }
  )
}
