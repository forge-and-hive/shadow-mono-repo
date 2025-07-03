import fs from 'fs'
import path from 'path'
import { type ExecutionRecord, type Boundaries } from '@forgehive/task'

export interface LogRecord<TInput = unknown, TOutput = unknown, B extends Boundaries = Boundaries> extends ExecutionRecord<TInput, TOutput, B> {
  name: string
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
  private _log: LogRecord<TInput, TOutput, B>[]

  constructor(config: Config<TInput, TOutput, B> = {}) {
    this._path = typeof config.path === 'string' ? `${config.path}.log` : undefined
    this._log = config.log ?? []
    this._mode = 'record'
  }

  // Data functions
  getLog(): LogRecord<TInput, TOutput, B>[] {
    return this._log
  }

  push(
    record: ExecutionRecord<TInput, unknown, B>,
    metadata?: Record<string, string>
  ): LogRecord<TInput, TOutput, B> {
    if (this._mode === 'replay') {
      return {} as LogRecord<TInput, TOutput, B>
    }

    // For safeRun records, always include both error and output fields
    const formattedBoundaries: Record<string, unknown> = {}
    if (record.boundaries) {
      for (const key in record.boundaries) {
        const boundaryArray = record.boundaries[key] as Array<Record<string, unknown>>
        formattedBoundaries[key] = boundaryArray.map(entry => {
          return {
            input: entry.input,
            output: entry.output ?? null,
            error: entry.error ?? null
          }
        })
      }
    }

    // Use the type from ExecutionRecord if available, otherwise derive it
    const recordType = ('type' in record && record.type) ? record.type :
      (record.output !== undefined && record.output !== null) ? 'success' :
        (record.error !== undefined) ? 'error' : 'pending'

    // Handle Promise outputs by setting to null in the log
    const output = record.output instanceof Promise ? null : record.output

    // Merge metadata from record and parameter (parameter takes precedence)
    const mergedMetadata = { ...record.metadata, ...metadata }

    const logRecord = {
      name: record.taskName || 'unnamed-task',
      ...record,
      type: recordType,
      output,
      boundaries: formattedBoundaries,
      metadata: mergedMetadata
    } as LogRecord<TInput, TOutput, B>

    this._log.push(logRecord)

    return logRecord
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
    // Add listener for ExecutionRecord
    task._listener = async (executionRecord: ExecutionRecord<TInput, TOutput, B>, _boundaries: Record<string, unknown>): Promise<void> => {
      // Only update if mode is record
      if (this._mode === 'record') {
        this.push(executionRecord)
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

  // Save functions
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
