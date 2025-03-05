/* eslint-disable no-console */
import { TaskInstanceType, BaseFunction } from '@shadow/task'

type TaskRecord<T extends TaskInstanceType = TaskInstanceType> = {
  task: T
}

type Tasks = Record<string, TaskRecord>

export class Runner {
  public _tasks: Tasks

  constructor() {
    this._tasks = {}
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

  parseArguments<T>(data: { task: string, args: T }): { taskName: string, args: T } {
    return {
      taskName: data.task,
      args: data.args
    }
  }

  async handler<T, R>(data: { task: string, args: T }): Promise<R> {
    const { taskName, args } = this.parseArguments(data)
    const res = await this.run(taskName, args)
    return res as R
  }
}

export default Runner
