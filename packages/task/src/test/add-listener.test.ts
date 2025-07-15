import { Task, type ExecutionRecord } from '../index'

describe('Add listener', () => {
  it('Should add a listener to the task', async () => {
    const tape: ExecutionRecord[] = []
    const task = new Task(async (argv: { value: number }) => {
      return { value: argv.value }
    })

    task.addListener((record) => {
      tape.push(record)
    })

    await task.run({ value: 1 })
    expect(tape).toEqual([{
      input: { value: 1 },
      output: { value: 1 },
      boundaries: {},
      taskName: undefined,
      metadata: {},
      metrics: [],
      timing: expect.objectContaining({
        startTime: expect.any(Number),
        endTime: expect.any(Number),
        duration: expect.any(Number)
      }),
      type: 'success'
    }])
  })

  it('Should add a listener to the task and catch error', async () => {
    const tape: ExecutionRecord[] = []
    const task = new Task(async (_argv: { value: number }) => {
      throw new Error('Test error')
    })

    task.addListener((record) => {
      tape.push(record)
    })

    try {
      await task.run({ value: 1 })
    } catch (error) {
      // Expected error
    }

    expect(tape).toEqual([{
      input: { value: 1 },
      error: 'Test error',
      boundaries: {},
      taskName: undefined,
      metadata: {},
      metrics: [],
      timing: expect.objectContaining({
        startTime: expect.any(Number),
        endTime: expect.any(Number),
        duration: expect.any(Number)
      }),
      type: 'error'
    }])
  })

  it('Should add a listener to the task and catch error with null input', async () => {
    const tape: ExecutionRecord[] = []
    const task = new Task(async (argv: { value: number | null }) => {
      if (argv.value === null) {
        throw new Error('Value is null')
      }
      return { value: argv.value }
    })

    task.addListener((record) => {
      tape.push(record)
    })

    try {
      await task.run({ value: null })
    } catch (error) {
      // Expected error
    }

    expect(tape).toEqual([{
      input: { value: null },
      error: 'Value is null',
      boundaries: {},
      taskName: undefined,
      metadata: {},
      metrics: [],
      timing: expect.objectContaining({
        startTime: expect.any(Number),
        endTime: expect.any(Number),
        duration: expect.any(Number)
      }),
      type: 'error'
    }])
  })

  it('Should add a listener to the task and call twice', async () => {
    const tape: ExecutionRecord[] = []
    const task = new Task(async (argv: { value: number }) => {
      return { value: argv.value }
    })

    task.addListener((record) => {
      tape.push(record)
    })

    await task.run({ value: 1 })
    await task.run({ value: 2 })

    expect(tape).toEqual([
      {
        input: { value: 1 },
        output: { value: 1 },
        boundaries: {},
        taskName: undefined,
        metadata: {},
        metrics: [],
        timing: expect.objectContaining({
          startTime: expect.any(Number),
          endTime: expect.any(Number),
          duration: expect.any(Number)
        }),
        type: 'success'
      },
      {
        input: { value: 2 },
        output: { value: 2 },
        boundaries: {},
        taskName: undefined,
        metadata: {},
        metrics: [],
        timing: expect.objectContaining({
          startTime: expect.any(Number),
          endTime: expect.any(Number),
          duration: expect.any(Number)
        }),
        type: 'success'
      }
    ])
  })

  it('Should add a listener and remove it', async () => {
    const tape: ExecutionRecord[] = []
    const task = new Task(async (argv: { value: number }) => {
      return { value: argv.value }
    })

    task.addListener((record) => {
      tape.push(record)
    })

    await task.run({ value: 1 })

    task.removeListener()

    await task.run({ value: 2 })

    expect(tape).toEqual([{
      input: { value: 1 },
      output: { value: 1 },
      boundaries: {},
      taskName: undefined,
      metadata: {},
      metrics: [],
      timing: expect.objectContaining({
        startTime: expect.any(Number),
        endTime: expect.any(Number),
        duration: expect.any(Number)
      }),
      type: 'success'
    }])
  })
})
