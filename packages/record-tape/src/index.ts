import fs from 'fs'
import path from 'path'

export interface LogRecord<TInput = unknown[], TOutput = unknown> {
  name: string
  type: 'success' | 'error'
  input: TInput
  output?: TOutput
  error?: unknown
  boundaries: Record<string, unknown>
}

interface SuccessLogItem<TInput = unknown[], TOutput = unknown> {
  input: TInput
  output: TOutput
  boundaries?: Record<string, unknown>
}

interface ErrorLogItem<TInput = unknown[]> {
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

export type LogItem<TInput = unknown[], TOutput = unknown> = SuccessLogItem<TInput, TOutput> | ErrorLogItem<TInput>

interface Config<TInput = unknown[], TOutput = unknown> {
  path?: fs.PathLike
  log?: LogRecord<TInput, TOutput>[]
  boundaries?: Record<string, unknown>
}

export type Mode = 'record' | 'replay'

export class RecordTape<TInput = unknown[], TOutput = unknown> {
  private _path: fs.PathLike | undefined
  private _mode: Mode
  private _boundaries: Record<string, unknown>
  private _log: LogRecord<TInput, TOutput>[]

  constructor(config: Config<TInput, TOutput> = {}) {
    this._path = typeof config.path === 'string' ? `${config.path}.log` : undefined
    this._log = config.log ?? []
    this._boundaries = config.boundaries ?? {}
    this._mode = 'record'
  }

  // Data functions
  getLog(): LogRecord<TInput, TOutput>[] {
    return this._log
  }

  getMode(): Mode {
    return this._mode
  }

  setMode(mode: Mode): void {
    this._mode = mode
  }

  addLogItem(name: string, logItem: LogItem<TInput, TOutput>): void {
    if (this._mode === 'replay') {
      return
    }

    if (isSuccessLogItem(logItem)) {
      const { input, output, boundaries = {} } = logItem
      this._log.push({ name, type: 'success', input, output, boundaries })
    } else if (isErrorLogItem(logItem)) {
      const { input, error, boundaries = {} } = logItem
      this._log.push({ name, type: 'error', input, error, boundaries })
    } else {
      throw new Error('invalid log item')
    }
  }

  addLogRecord(logRecord: LogRecord<TInput, TOutput>): void {
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

  parse(content: string): LogRecord<TInput, TOutput>[] {
    const items = content.split('\n')
    const log: LogRecord<TInput, TOutput>[] = []
    for (const item of items) {
      if (item !== '') {
        const data = JSON.parse(item) as LogRecord<TInput, TOutput>
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
  async load(): Promise<LogRecord<TInput, TOutput>[]> {
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

  loadSync(): LogRecord<TInput, TOutput>[] {
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
