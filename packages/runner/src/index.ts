/* eslint-disable no-console */
import { TaskInstanceType, BaseFunction } from '@forgehive/task'
import { type SchemaDescription } from '@forgehive/schema'

// Export a generic task type that is more permissive with boundaries
// Allows the load method to accept any task type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GenericTask = TaskInstanceType<BaseFunction, any>

type TaskRecord = {
  task: GenericTask
}

type Tasks = Record<string, TaskRecord>

// Define the base parsed arguments interface
export interface RunnerParsedArguments {
  taskName: string;
  args: unknown;
}

export class Runner<InputType = unknown, ParseResult extends RunnerParsedArguments = RunnerParsedArguments> {
  public _tasks: Tasks
  public parseArguments: (data: InputType) => ParseResult
  public handler: (data: InputType) => Promise<unknown>

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
   * Set a custom handler function
   * @param handlerFn The custom handler function
   */
  setHandler(handlerFn: (data: InputType) => Promise<unknown>): void {
    this.handler = handlerFn
  }

  /**
   * Default handler implementation
   * @param data Input data
   * @returns Output data
   */
  private async defaultHandler(data: InputType): Promise<unknown> {
    const { taskName, args } = this.parseArguments(data)
    const res = await this.run(taskName, args)
    return res
  }

  describe(): Record<string, { name: string; description?: string; schema?: SchemaDescription }> {
    const tasks = this._tasks
    const result: Record<string, { name: string; description?: string; schema?: SchemaDescription }> = {}

    for (const [name, { task }] of Object.entries(tasks)) {
      result[name] = {
        name,
        description: task.getDescription(),
        schema: task.describe()
      }
    }

    return result
  }

  load(name: string, task: GenericTask): void {
    this._tasks[name] = { task }
  }

  getTask(name: string): GenericTask | undefined {
    if (this._tasks[name] === undefined) {
      return undefined
    }

    const { task } = this._tasks[name]
    return task
  }

  getTasks(): Tasks {
    return this._tasks
  }

  getTaskList(): string[] {
    return Object.keys(this._tasks)
  }

  async run<F extends BaseFunction = BaseFunction, P = Parameters<F>[0], R = ReturnType<F>>(
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
