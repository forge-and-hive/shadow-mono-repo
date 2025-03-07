/* eslint-disable no-console */
import { TaskInstanceType, BaseFunction } from '@shadow/task'

type TaskRecord<T extends TaskInstanceType = TaskInstanceType> = {
  task: T
}

type Tasks = Record<string, TaskRecord>

// Define the base parsed arguments interface
export interface RunnerParsedArguments {
  taskName: string;
  args: unknown;
}

export class Runner<InputType = unknown, OutputType = unknown, ParseResult extends RunnerParsedArguments = RunnerParsedArguments> {
  public _tasks: Tasks
  public parseArguments: (data: InputType) => ParseResult
  public handler: (data: InputType) => Promise<OutputType>

  constructor(parseArgumentsFn?: (data: InputType) => ParseResult) {
    this._tasks = {}
    // Use provided parseArguments function or default implementation
    this.parseArguments = parseArgumentsFn || ((data: InputType): ParseResult => {
      // Check if data is an object and has the expected properties
      if (data && typeof data === 'object' && 'task' in data && 'args' in data) {
        return {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          taskName: String((data as any).task),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          args: (data as any).args
        } as unknown as ParseResult
      }

      // If data doesn't have the expected structure, throw an error
      throw new Error('Invalid task data: expected object with task and args properties')
    })

    // Set default handler
    this.handler = this.defaultHandler.bind(this)
  }

  /**
   * Create a new Runner with type inference from the parseArgumentsFn
   * @param parseArgumentsFn Function to parse arguments
   * @returns A new Runner instance
   */
  static create<I, P extends RunnerParsedArguments, O = unknown>(
    parseArgumentsFn: (data: I) => P
  ): Runner<I, O, P> {
    return new Runner<I, O, P>(parseArgumentsFn)
  }

  /**
   * Set a custom handler function
   * @param handlerFn The custom handler function
   */
  setHandler(handlerFn: (data: InputType) => Promise<OutputType>): void {
    this.handler = handlerFn
  }

  /**
   * Default handler implementation
   * @param data Input data
   * @returns Output data
   */
  private async defaultHandler(data: InputType): Promise<OutputType> {
    const { taskName, args } = this.parseArguments(data)
    const res = await this.run(taskName, args)
    return res as unknown as OutputType
  }

  describe(): void {
    const listItems: string[] = this.getTaskList()
    console.log('Available tasks:')
    listItems.forEach(taskName => {
      console.log(`- ${taskName}`)
    })
  }

  load<T extends BaseFunction>(name: string, task: TaskInstanceType<T>): void {
    this._tasks[name] = { task }
  }

  getTask<T extends BaseFunction = BaseFunction>(name: string): TaskInstanceType<T> | undefined {
    if (this._tasks[name] === undefined) {
      return undefined
    }

    const { task } = this._tasks[name]

    return task as TaskInstanceType<T>
  }

  getTasks(): Tasks {
    return this._tasks
  }

  getTaskList(): string[] {
    return Object.keys(this._tasks)
  }

  async run<T extends BaseFunction, P extends Parameters<T>[0], R = ReturnType<T>>(
    name: string,
    args: P
  ): Promise<Awaited<R>> {
    const exists = this._tasks[name]

    if (exists === undefined) {
      throw new Error(`Task ${name} not found`)
    }

    const { task } = exists

    if (task === undefined) {
      throw new Error(`Task ${name} not found`)
    }

    const results = await task.run(args)
    return results as Awaited<R>
  }
}

export default Runner
