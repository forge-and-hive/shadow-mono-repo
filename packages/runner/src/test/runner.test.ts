/* eslint-disable @typescript-eslint/no-unused-vars */
import { Runner } from '../index'
import { Task } from '@shadow/task'

describe('Runner', () => {
  it('should create a new Runner instance', () => {
    const runner = new Runner()
    expect(runner).toBeInstanceOf(Runner)
    expect(runner._tasks).toEqual({})
  })


  it('should throw error when running non-existent task', async () => {
    const runner = new Runner()
    await expect(runner.run('nonExistentTask', {}))
      .rejects.toThrow('Task nonExistentTask not found')
  })

  it('should handle arguments correctly', () => {
    const runner = new Runner()
    const data = {
      task: 'testTask',
      args: { value: 'test' }
    }

    const parsed = runner.parseArguments(data)

    expect(parsed).toEqual({
      taskName: 'testTask',
      args: { value: 'test' }
    })
  })

  it('should run a task', async () => {
    const task = new Task(() => {
      return 'hi five!!!'
    })

    const runner = new Runner()
    runner.load('sample', task)

    const result = await runner.run('sample', {})

    expect(result).toBe('hi five!!!')
  })

  it('should run a task with params', async () => {
    const taskInt = new Task(({ int }: { int: number }) => {
      return int + 5
    })

    const runner = new Runner()
    runner.load('sample', taskInt)

    const result = await runner.run<typeof taskInt['_fn'], { int: number }, number>('sample', { int: 6 })

    expect(result).toBe(11)
  })

  it('should run multiple tasks with different params', async () => {
    const taskInt = new Task(({ int }: { int: number }) => {
      return int + 5
    })

    const taskString = new Task(({ str }: { str: string }) => {
      return str + ' world'
    })

    const runner = new Runner()
    runner.load('int', taskInt)
    runner.load('string', taskString)

    const int = await runner.run<typeof taskInt['_fn'], { int: number }, number>('int', { int: 6 })
    const str = await runner.run<typeof taskString['_fn'], { str: string }, string>('string', { str: 'hello' })

    expect(int).toBe(11)
    expect(str).toBe('hello world')
  })

  it('should get task back and be able to run it', async () => {
    const taskInt = new Task(async ({ int }: { int: number }): Promise<number> => {
      return int + 5
    })

    const indentity = new Task(async function ({ int }: { int: number }): Promise<number> {
      return int + 5
    })

    const runner = new Runner()
    runner.load('int', taskInt)

    const task = runner.getTask<typeof taskInt['_fn']>('int')

    let int = 0
    if (task !== undefined) {
      int = await task.run({ int: 6 })
    }
    const int2 = await taskInt.run({ int: 6 })
    const int3 = await indentity.run({ int: 6 })

    expect(int).toBe(11)
    expect(int2).toBe(11)
    expect(int3).toBe(11)
  })

  it('should return undefined if task does not exist', async () => {
    const runner = new Runner()
    const task = runner.getTask('int')

    expect(task).toBeUndefined()
  })
})
