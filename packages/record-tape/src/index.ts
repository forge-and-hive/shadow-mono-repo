/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs'
import path from 'path'

export interface LogRecord {
  name: string
  type: 'success' | 'error'
  input: any[]
  output?: any
  error?: any
  boundaries: any
}

interface SuccessLogItem {
  input: any[]
  output: any
  boundaries?: any
}

interface ErrorLogItem {
  input: any[]
  error: any
  boundaries?: any
}

function isSuccessLogItem(log: SuccessLogItem | ErrorLogItem): log is SuccessLogItem {
  return (log as SuccessLogItem).output !== undefined
}

function isErrorLogItem(log: SuccessLogItem | ErrorLogItem): log is ErrorLogItem {
  return (log as ErrorLogItem).error !== undefined
}

export type LogItem = SuccessLogItem | ErrorLogItem

interface Config {
  path?: fs.PathLike
  log?: LogRecord[]
  boundaries?: any
}

export class RecordTape {
  private _path: fs.PathLike | undefined
  private _mode: string
  private _boundaries: any
  private _log: LogRecord[]

  constructor(config: Config = {}) {
    this._path = typeof config.path === 'string' ? `${config.path}.log` : undefined
    this._log = config.log ?? []
    this._boundaries = config.boundaries ?? {}
    this._mode = 'record'
  }

  // Data functions
  getLog(): LogRecord[] {
    return this._log
  }

  getMode(): string {
    return this._mode
  }

  setMode(mode: string): void {
    this._mode = mode
  }

  addLogItem(name: string, logItem: LogItem): void {
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

  addLogRecord(logRecord: LogRecord): void {
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

  parse(content: string): LogRecord[] {
    const items = content.split('\n')
    const log: LogRecord[] = []
    for (const item of items) {
      if (item !== '') {
        const data: LogRecord = JSON.parse(item)
        log.push(data)
      }
    }
    return log
  }

  compileCache(): Record<string, any> {
    const cache: any = {}
    for (const logIteam of this._log) {
      for (const bondaryName in logIteam.boundaries) {
        if (typeof cache[bondaryName] === 'undefined') {
          cache[bondaryName] = logIteam.boundaries[bondaryName]
        } else {
          cache[bondaryName] = cache[bondaryName].concat(logIteam.boundaries[bondaryName])
        }
      }
    }
    return cache
  }

  recordFrom(name: string, task: any): void {
    // Add listner
    task._listener = async (logItem: LogItem, _boundaries: any) => {
      // Only update if mode is record
      if (this.getMode() === 'record') {
        this.addLogItem(name, logItem)
      }
    }

    // Add cache
    task.setBoundariesData(this.compileCache())
  }

  // Load save functions
  async load(): Promise<any> {
    if (typeof this._path === 'undefined') {
      return
    }

    const dirpath = path.dirname(this._path as string)
    try {
      await fs.promises.access(dirpath)
    } catch (error) {
      throw new Error('Logs folder doesn\'t exists')
    }

    if (typeof this._path === 'undefined') { return }
    const readFile = fs.promises.readFile

    let content, err
    try {
      content = await readFile(this._path, 'utf8')
    } catch (e) {
      err = e
    }

    if (typeof err !== 'undefined') {
      return
    }

    if (typeof content === 'undefined') {
      return
    }

    this._log = this.parse(content)
    return this._log
  }

  loadSync(): any {
    if (typeof this._path === 'undefined') { return }

    const dirpath = path.dirname(this._path as string)
    try {
      fs.accessSync(dirpath)
    } catch (error) {
      throw new Error('Logs folder doesn\'t exists')
    }

    if (!fs.existsSync(this._path)) {
      return
    }

    const content = fs.readFileSync(this._path, 'utf8')
    this._log = this.parse(content)
    return this._log
  }

  async save(): Promise<void> {
    if (typeof this._path === 'undefined') { return }

    const dirpath = path.dirname(this._path as string)
    try {
      await fs.promises.access(dirpath)
    } catch (error) {
      throw new Error('Folder doesn\'t exists')
    }

    const writeFile = fs.promises.writeFile
    const content = this.stringify()

    await writeFile(this._path, content, 'utf8')
  }

  saveSync(): void {
    if (typeof this._path === 'undefined') { return }

    const dirpath = path.dirname(this._path as string)
    try {
      fs.accessSync(dirpath)
    } catch (error) {
      throw new Error('Folder doesn\'t exists')
    }

    const content = this.stringify()
    fs.writeFileSync(this._path, content, 'utf8')
  }
}
