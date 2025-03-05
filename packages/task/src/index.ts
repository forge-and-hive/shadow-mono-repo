import { Schema, type SchemaType } from '@shadow/schema'
import { createBoundary, type Mode, type Boundaries, type WrappedBoundaries } from './utils/boundary'

export interface Task {
  id: string;
  title: string;
  completed: boolean;
}

export type BaseFunction = (...args: any[]) => any

// Re-export the boundary types for external use
export type { BoundaryFunction, WrappedBoundaryFunction, Boundaries, WrappedBoundaries, Mode } from './utils/boundary'

export interface TaskConfig<B extends Boundaries = Boundaries> {
  validate?: Schema<Record<string, SchemaType>>
  mode?: Mode
  boundaries?: B
  boundariesData?: Record<string, any>
}

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

export interface TaskInstanceType<Func extends BaseFunction = BaseFunction, B extends Boundaries = Boundaries> {
  getMode: () => Mode
  setMode: (mode: Mode) => void
  setSchema: (base: Schema<Record<string, SchemaType>>) => void
  getSchema: () => Schema<Record<string, SchemaType>> | undefined

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
  setBoundariesData: (boundariesData: Record<string, any>) => void
  getBondariesData: () => Record<string, any>
  getBondariesRunLog: () => Record<string, any>
  startRunLog: () => void
  run: (argv?: Parameters<Func>[0]) => Promise<ReturnType<Func>>
}

export const Task = class Task<Func extends BaseFunction, B extends Boundaries = Boundaries> implements TaskInstanceType<Func, B> {
  _fn: Func
  _mode: Mode
  _coolDown: number

  _boundariesDefinition: B
  _boundaries: WrappedBoundaries<B> | null
  _boundariesData: Record<string, any> | null

  _schema: Schema<Record<string, SchemaType>> | undefined
  _listener?: ((record: TaskRecord<Parameters<Func>[0], ReturnType<Func>>) => void) | undefined

  constructor (fn: Func, conf: TaskConfig<B> = {
    validate: undefined,
    mode: 'proxy',
    boundaries: undefined,
    boundariesData: undefined
  }) {
    this._fn = fn
    this._schema = undefined
    if (typeof conf.validate !== 'undefined') {
      this._schema = conf.validate
    }

    this._mode = conf.mode ?? 'proxy'
    this._boundariesDefinition = conf.boundaries ?? {} as B

    this._listener = undefined

    // Cool down time before killing the process on cli runner
    this._coolDown = 1000

    // Review this assignment
    this._boundariesData = conf.boundariesData ?? {}
    this._boundaries = this._createBounderies({
      definition: this._boundariesDefinition,
      baseData: this._boundariesData,
      mode: this._mode
    })
  }

  getMode (): Mode {
    return this._mode
  }

  setMode (mode: Mode): void {
    for (const name in this._boundaries) {
      const boundary = this._boundaries[name]

      boundary.setMode(mode)
    }

    this._mode = mode
  }

  setSchema (schema: Schema<Record<string, SchemaType>>): void {
    this._schema = schema
  }

  getSchema (): Schema<Record<string, SchemaType>> | undefined {
    return this._schema
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

    const event = {
      ...data,
      boundaries: this.getBondariesRunLog()
    } as TaskRecord<Parameters<Func>[0], ReturnType<Func>>

    this._listener(event)
  }

  getBoundaries (): WrappedBoundaries<B> {
    return this._boundaries as WrappedBoundaries<B>
  }

  setBoundariesData (boundariesData: Record<string, any>): void {
    for (const name in this._boundaries) {
      const boundary = this._boundaries[name]

      let tape
      if (typeof boundariesData !== 'undefined') {
        tape = boundariesData[name]
      }

      if (typeof boundary !== 'undefined' && typeof tape !== 'undefined') {
        boundary.setTape(tape)
      }
    }
  }

  getBondariesData (): Record<string, any> {
    const boundaries = this._boundaries
    const boundariesData: Record<string, any> = {}

    for (const name in boundaries) {
      const boundary = boundaries[name]

      boundariesData[name] = boundary.getTape()
    }

    return boundariesData
  }

  _createBounderies ({
    definition,
    baseData,
    mode = 'proxy'
  }: any): WrappedBoundaries<B> {
    const boundariesFns: Record<string, any> = {}

    for (const name in definition) {
      const boundary = createBoundary(definition[name])

      if (typeof baseData !== 'undefined' && typeof baseData[name] !== 'undefined') {
        const tape = baseData[name]

        boundary.setTape(tape)
      }
      boundary.setMode(mode as Mode)

      boundariesFns[name] = boundary
    }

    return boundariesFns as WrappedBoundaries<B>
  }

  getBondariesRunLog (): Record<string, any> {
    const boundaries = this._boundaries
    const boundariesRunLog: Record<string, any> = {}

    for (const name in boundaries) {
      const boundary = boundaries[name]

      boundariesRunLog[name] = boundary.getRunData()
    }

    return boundariesRunLog
  }

  startRunLog (): void {
    const boundaries = this._boundaries

    for (const name in boundaries) {
      const boundary = boundaries[name]

      boundary.startRun()
    }
  }

  asBoundary (): (args: Parameters<Func>[0]) => Promise<ReturnType<Func>> {
    return async (args: Parameters<Func>[0]) => {
      return await this.run(args)
    }
  }

  async run (argv?: Parameters<Func>[0]): Promise<ReturnType<Func>> {
    // start run log
    this.startRunLog()
    const boundaries = this._boundaries

    const q = new Promise<ReturnType<Func>>((resolve, reject) => {
      const isValid = this.isValid(argv)

      if (!isValid) {
        this.emit({
          input: argv,
          error: 'Invalid input'
        })

        throw new Error('Invalid input')
      }

      (async (): Promise<ReturnType<Func>> => {
        const outout = await this._fn(argv, boundaries)

        return outout
      })().then((output) => {
        this.emit({
          input: argv,
          output
        })

        resolve(output)
      }).catch((error) => {
        this.emit({
          input: argv,
          error: error.message
        })

        reject(error)
      })
    })

    const result = await q

    return result
  }
}
