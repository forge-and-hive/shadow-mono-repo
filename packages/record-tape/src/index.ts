import fs from 'fs'
import path from 'path'
import { type ExecutionRecord, type Boundaries } from '@forgehive/task'

export interface GenericExecutionRecord<TInput = unknown, TOutput = unknown, B extends Boundaries = Boundaries> extends ExecutionRecord<TInput, TOutput, B> {
}

interface Config<TInput = unknown, TOutput = unknown, B extends Boundaries = Boundaries> {
  path?: fs.PathLike
  log?: GenericExecutionRecord<TInput, TOutput, B>[]
  boundaries?: Record<string, unknown>
}

export class RecordTape<TInput = unknown, TOutput = unknown, B extends Boundaries = Boundaries> {
  private _path: fs.PathLike | undefined
  private _log: GenericExecutionRecord<TInput, TOutput, B>[]

  constructor(config: Config<TInput, TOutput, B> = {}) {
    this._path = typeof config.path === 'string' ? `${config.path}.log` : undefined
    this._log = config.log ?? []
  }

  // Data functions
  getLog(): GenericExecutionRecord<TInput, TOutput, B>[] {
    return this._log
  }

  getLength(): number {
    return this._log.length
  }

  shift(): GenericExecutionRecord<TInput, TOutput, B> | undefined {
    return this._log.shift()
  }

  push(
    record: ExecutionRecord<TInput, unknown, B>,
    metadata?: Record<string, string>
  ): GenericExecutionRecord<TInput, TOutput, B> {
    // Add type if missing
    const recordType = ('type' in record && record.type) ? record.type :
      (record.output !== undefined && record.output !== null) ? 'success' :
        (record.error !== undefined) ? 'error' : 'pending'

    // Merge metadata from record and parameter (parameter takes precedence)
    const mergedMetadata = { ...record.metadata, ...metadata }

    const logRecord = {
      ...record,
      type: recordType,
      metadata: mergedMetadata
    } as GenericExecutionRecord<TInput, TOutput, B>

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

  parse(content: string): GenericExecutionRecord<TInput, TOutput, B>[] {
    const items = content.split('\n')
    const log: GenericExecutionRecord<TInput, TOutput, B>[] = []
    for (const item of items) {
      if (item !== '') {
        const data = JSON.parse(item) as GenericExecutionRecord<TInput, TOutput, B>
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

  recordFrom(task: { _listener?: unknown }): void {
    // Add listener for ExecutionRecord
    task._listener = async (executionRecord: ExecutionRecord<TInput, TOutput, B>): Promise<void> => {
      this.push(executionRecord)
    }
  }

  // Load save functions
  async load(): Promise<GenericExecutionRecord<TInput, TOutput, B>[]> {
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

  loadSync(): GenericExecutionRecord<TInput, TOutput, B>[] {
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
