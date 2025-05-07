import fs from 'fs'
import path from 'path'
import { type ExecutionRecord, type Boundaries, type TaskRecord } from '@forgehive/task'

export interface LogRecord<TInput = unknown, TOutput = unknown, B extends Boundaries = Boundaries> extends ExecutionRecord<TInput, TOutput, B> {
  name: string
  type: 'success' | 'error'
}

export interface SuccessLogItem<TInput = unknown, TOutput = unknown> {
  input: TInput
  output: TOutput
  boundaries?: Record<string, unknown>
}

export interface ErrorLogItem<TInput = unknown> {
  input: TInput
  error: unknown
  boundaries?: Record<string, unknown>
}

function isSuccessLogItem<TInput, TOutput>(log: SuccessLogItem<TInput, TOutput> | ErrorLogItem<TInput>): log is SuccessLogItem<TInput, TOutput> {
  return (log as SuccessLogItem<TInput, TOutput>).output !== undefined
}

function isErrorLogItem<TInput>(log: SuccessLogItem<TInput> | ErrorLogItem<TInput>): log is ErrorLogItem<TInput> {
  return (log as ErrorLogItem<TInput>).error !== undefined
}

export type LogItem<TInput = unknown, TOutput = unknown> = SuccessLogItem<TInput, TOutput> | ErrorLogItem<TInput>

// Additional type to handle TaskRecord compatibility
export type TaskLogItem<TInput = unknown, TOutput = unknown> = LogItem<TInput, TOutput> | {
  input: TInput;
  output?: TOutput;
  error?: unknown;
  boundaries?: Record<string, unknown>;
}

interface Config<TInput = unknown, TOutput = unknown, B extends Boundaries = Boundaries> {
  path?: fs.PathLike
  log?: LogRecord<TInput, TOutput, B>[]
  boundaries?: Record<string, unknown>
}

export type Mode = 'record' | 'replay'

export class RecordTape<TInput = unknown, TOutput = unknown, B extends Boundaries = Boundaries> {
  private _path: fs.PathLike | undefined
  private _mode: Mode
  private _boundaries: Record<string, unknown>
  private _log: LogRecord<TInput, TOutput, B>[]

  constructor(config: Config<TInput, TOutput, B> = {}) {
    this._path = typeof config.path === 'string' ? `${config.path}.log` : undefined
    this._log = config.log ?? []
    this._boundaries = config.boundaries ?? {}
    this._mode = 'record'
  }

  // Data functions
  getLog(): LogRecord<TInput, TOutput, B>[] {
    return this._log
  }

  getMode(): Mode {
    return this._mode
  }

  setMode(mode: Mode): void {
    this._mode = mode
  }

  addLogItem(name: string, logItem: any): void {
    if (this._mode === 'replay') {
      return
    }

    // Format boundaries to ensure both error and output fields are set if needed
    const formattedBoundaries: Record<string, any> = {}
    if (logItem.boundaries) {
      for (const key in logItem.boundaries) {
        // Check if the source is from safe-run (if it has error field in entries)
        const isSafeRun = logItem.boundaries[key].some((entry: any) => entry.error !== undefined);

        formattedBoundaries[key] = logItem.boundaries[key].map((entry: any) => {
          // Only add error field if it's from safe-run
          return isSafeRun ?
            {
              input: entry.input,
              output: entry.output ?? null,
              error: entry.error ?? null
            } :
            {
              input: entry.input,
              output: entry.output
            }
        })
      }
    }

    // Handle LogItem interface
    if (isSuccessLogItem(logItem)) {
      const { input, output } = logItem
      this._log.push({
        name,
        type: 'success',
        input,
        output,
        boundaries: formattedBoundaries
      } as LogRecord<TInput, TOutput, B>)
    } else if (isErrorLogItem(logItem)) {
      const { input, error } = logItem
      this._log.push({
        name,
        type: 'error',
        input,
        error,
        boundaries: formattedBoundaries
      } as LogRecord<TInput, TOutput, B>)
    }
    // Handle TaskRecord interface
    else if (logItem.output !== undefined) {
      const { input, output } = logItem
      this._log.push({
        name,
        type: 'success',
        input,
        output,
        boundaries: formattedBoundaries
      } as LogRecord<TInput, TOutput, B>)
    } else if (logItem.error !== undefined) {
      const { input, error } = logItem
      this._log.push({
        name,
        type: 'error',
        input,
        error,
        boundaries: formattedBoundaries
      } as LogRecord<TInput, TOutput, B>)
    } else {
      throw new Error('invalid log item')
    }
  }

  push(name: string, record: ExecutionRecord<TInput, any, B>): void {
    if (this._mode === 'replay') {
      return
    }

    // For safeRun records, always include both error and output fields
    const formattedBoundaries: Record<string, any> = {}
    if (record.boundaries) {
      for (const key in record.boundaries) {
        formattedBoundaries[key] = record.boundaries[key].map((entry: any) => {
          return {
            input: entry.input,
            output: entry.output ?? null,
            error: entry.error ?? null
          }
        })
      }
    }

    if (record.output !== undefined) {
      const { input, output } = record
      this._log.push({
        name,
        type: 'success',
        input,
        output: output instanceof Promise ? null : output,
        boundaries: formattedBoundaries
      } as unknown as LogRecord<TInput, TOutput, B>)
    } else if (record.error !== undefined) {
      const { input, error } = record
      this._log.push({
        name,
        type: 'error',
        input,
        error,
        boundaries: formattedBoundaries
      } as unknown as LogRecord<TInput, TOutput, B>)
    } else {
      throw new Error('invalid record type')
    }
  }

  addLogRecord(logRecord: LogRecord<TInput, TOutput, B>): void {
    this._log.push(logRecord)
  }

  stringify(): string {
    let log = ''
    for (const logItem of this._log) {
      const str = JSON.stringify(logItem)
      log = log + str + '\n'
    }
    return log
  }

  parse(content: string): LogRecord<TInput, TOutput, B>[] {
    const items = content.split('\n')
    const log: LogRecord<TInput, TOutput, B>[] = []
    for (const item of items) {
      if (item !== '') {
        const data = JSON.parse(item) as LogRecord<TInput, TOutput, B>
        log.push(data)
      }
    }
    return log
  }

  compileCache(): Record<string, unknown> {
    const cache: Record<string, unknown> = {}
    for (const logIteam of this._log) {
      for (const bondaryName in logIteam.boundaries) {
        if (typeof cache[bondaryName] === 'undefined') {
          cache[bondaryName] = logIteam.boundaries[bondaryName]
        } else {
          const currentValue = cache[bondaryName] as unknown[]
          const newValue = logIteam.boundaries[bondaryName] as unknown[]
          cache[bondaryName] = currentValue.concat(newValue)
        }
      }
    }
    return cache
  }

  recordFrom(name: string, task: { _listener?: unknown; setBoundariesData: (data: Record<string, unknown>) => void }): void {
    // Add listner
    task._listener = async (logItem: LogItem<TInput, TOutput>, _boundaries: Record<string, unknown>): Promise<void> => {
      // Only update if mode is record
      if (this.getMode() === 'record') {
        this.addLogItem(name, logItem)
      }
    }

    // Add cache
    task.setBoundariesData(this.compileCache())
  }

  // Load save functions
  async load(): Promise<LogRecord<TInput, TOutput, B>[]> {
    if (typeof this._path === 'undefined') {
      return []
    }

    const dirpath = path.dirname(this._path.toString())
    try {
      await fs.promises.access(dirpath)
    } catch (error) {
      throw new Error('Logs folder doesn\'t exists')
    }

    if (typeof this._path === 'undefined') { return [] }
    const readFile = fs.promises.readFile

    let content: string | undefined
    try {
      content = await readFile(this._path.toString(), 'utf8')
    } catch (e) {
      // Ignore error and return empty array
    }

    if (typeof content === 'undefined') {
      return []
    }

    this._log = this.parse(content)
    return this._log
  }

  loadSync(): LogRecord<TInput, TOutput, B>[] {
    if (typeof this._path === 'undefined') { return [] }

    const dirpath = path.dirname(this._path.toString())
    try {
      fs.accessSync(dirpath)
    } catch (error) {
      throw new Error('Logs folder doesn\'t exists')
    }

    if (!fs.existsSync(this._path.toString())) {
      return []
    }

    const content = fs.readFileSync(this._path.toString(), 'utf8')
    this._log = this.parse(content)
    return this._log
  }

  async save(): Promise<void> {
    if (typeof this._path === 'undefined') { return }

    const dirpath = path.dirname(this._path.toString())
    try {
      await fs.promises.access(dirpath)
    } catch (error) {
      throw new Error('Folder doesn\'t exists')
    }

    const writeFile = fs.promises.writeFile
    const content = this.stringify()

    await writeFile(this._path.toString(), content, 'utf8')
  }

  saveSync(): void {
    if (typeof this._path === 'undefined') { return }

    const dirpath = path.dirname(this._path.toString())
    try {
      fs.accessSync(dirpath)
    } catch (error) {
      throw new Error('Folder doesn\'t exists')
    }

    const content = this.stringify()
    fs.writeFileSync(this._path.toString(), content, 'utf8')
  }
}
