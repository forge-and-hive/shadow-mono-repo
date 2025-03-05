/* eslint-disable @typescript-eslint/no-explicit-any */
import { Schema } from '@shadow/schema'
import { createBoundary, type Mode } from './utils/boundary'

export interface Task {
  id: string;
  title: string;
  completed: boolean;
}

export type BaseFunction = (...args: any[]) => any

export interface TaskConfig {
  validate?: any
  mode?: Mode
  boundaries?: any
  boundariesData?: any
}

export interface TaskInstanceType {
  getMode: () => Mode
  setMode: (mode: Mode) => void
  setSchema: (base: any) => void
  getSchema: () => any
  validate: (argv: any) => any | undefined
  // eslint-disable-next-line @typescript-eslint/ban-types
  addListener: (fn: Function) => void
  removeListener: () => void
  emit: (data: any) => void
  getBoundaries: () => any
  setBoundariesData: (boundariesData: Record<string, any>) => void
  getBondariesData: () => any
  getBondariesRunLog: () => any
  startRunLog: () => void
  run: (argv: any) => Promise<any>
}

export const Task = class Task<Func extends BaseFunction> implements TaskInstanceType {
  _fn: Func
  _mode: Mode
  _coolDown: number

  _boundariesDefinition: any
  _boundaries: any | null
  _boundariesData: any | null

  _schema: any | undefined
  // eslint-disable-next-line @typescript-eslint/ban-types
  _listener: Function | undefined

  constructor (fn: Func, conf: TaskConfig = {
    validate: undefined,
    mode: 'proxy',
    boundaries: undefined,
    boundariesData: undefined
  }) {
    this._fn = fn
    this._schema = undefined
    if (typeof conf.validate !== 'undefined') {
      this._schema = new Schema(conf.validate)
    }

    this._mode = conf.mode ?? 'proxy'
    this._boundariesDefinition = conf.boundaries ?? {}

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

  setSchema (base: any): void {
    this._schema = new Schema(base)
  }

  getSchema (): any {
    return this._schema
  }

  validate (argv: any): any | undefined {
    if (typeof this._schema === 'undefined') {
      return undefined
    }

    return this._schema.validate(argv)
  }

  // Listen and emit to make it easy to have hooks
  // Posible improvement to handle multiple listeners, but so far its not needed
  // eslint-disable-next-line @typescript-eslint/ban-types
  addListener (fn: Function): void {
    this._listener = fn
  }

  removeListener (): void {
    this._listener = undefined
  }

  /*
    The listener get the input/outout of the call
    Plus all the boundary data
  */
  emit (data: any): void {
    if (typeof this._listener === 'undefined') { return }

    const event = {
      ...data, boundaries: this.getBondariesRunLog()
    }

    this._listener(event)
  }

  getBoundaries (): any {
    return this._boundaries
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
  }: any): Record<string, any> {
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

    return boundariesFns
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

  // ToDo: Define Types from asBoundary function
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  asBoundary () {
    return async (args: any) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return await this.run(args)
    }
  }

  async run (argv: Parameters<Func>[0]): Promise<ReturnType<Func>> {
    // start run log
    this.startRunLog()
    const boundaries = this._boundaries

    const q = new Promise<ReturnType<Func>>((resolve, reject) => {
      const error = this.validate(argv)

      if (typeof error !== 'undefined') {
        this.emit({
          input: argv,
          error: error.message
        })

        throw error
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
