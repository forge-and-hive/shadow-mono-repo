/* eslint-disable no-console */

type Tasks = Record<string, {
  task: any
}>

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

  load(name: string, task: any): void {
    this._tasks[name] = { task }
  }

  getTask(name: string): any | undefined {
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

  async run(name: string, args: any): Promise<any> {
    const exists = this._tasks[name]

    if (exists === undefined) {
      throw new Error(`Task ${name} not found`)
    }

    const { task } = exists

    if (task === undefined) {
      throw new Error(`Task ${name} not found`)
    }

    const results = await task.run(args)
    return results
  }

  parseArguments(data: any): { taskName: string, args: any } {
    return {
      taskName: data.task,
      args: data.args
    }
  }

  async handler(data: any): Promise<any> {
    const { taskName, args }: { taskName: string, args: any } = this.parseArguments(data)
    const res = await this.run(taskName, args)
    return res
  }
}

export default Runner
