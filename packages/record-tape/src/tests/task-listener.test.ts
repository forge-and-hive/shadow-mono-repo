import { Task, createTask, Schema } from '@forgehive/task'
import { RecordTape } from '../index'

describe('Task listener', () => {
  it('Should listen to task events', async () => {
    const tape = new RecordTape({})
    const task = createTask({
      name: 'test',
      schema: new Schema({}),
      boundaries: {},
      fn: async (_input) => {
        return { value: 1, foo: true }
      }
    })

    task.addListener((record) => {
      tape.push(record)
    })

    await task.run({})

    expect(tape.getLog()).toEqual([
      {
        type: 'success',
        input: {},
        output: { value: 1, foo: true },
        boundaries: {},
        metadata: {},
        metrics: [],
        taskName: 'test',
        timing: expect.objectContaining({
          startTime: expect.any(Number),
          endTime: expect.any(Number),
          duration: expect.any(Number)
        })
      }
    ])
  })

  it('Should has errors and sucess items', async () => {
    const task = new Task(
      async (input: { value: number }): Promise<{ result: number }> => {
        if (input.value < 10 || input.value > 20) {
          throw new Error('Value is not between 10 and 20')
        }

        return { result: input.value * 2 }
      }
    )

    const tape = new RecordTape<{ value: number }, { result: number }>({})

    task.setName('test')
    task.addListener<{ value: number }, { result: number }>((record) => {
      tape.push(record)
    })

    try {
      await task.run({ value: 5 })
    } catch (_error) {
      // this is expected
    }

    await task.run({ value: 15 })

    const log = tape.getLog()

    expect(log).toEqual([
      {
        type: 'error',
        input: { value: 5 },
        error: 'Value is not between 10 and 20',
        boundaries: {},
        metadata: {},
        metrics: [],
        output: undefined,
        taskName: 'test',
        timing: expect.objectContaining({
          startTime: expect.any(Number),
          endTime: expect.any(Number),
          duration: expect.any(Number)
        })
      },
      {
        type: 'success',
        input: { value: 15 },
        output: { result: 30 },
        boundaries: {},
        metadata: {},
        metrics: [],
        taskName: 'test',
        timing: expect.objectContaining({
          startTime: expect.any(Number),
          endTime: expect.any(Number),
          duration: expect.any(Number)
        })
      }
    ])
  })

  it('Should get types from task', async () => {
    // Create a schema for the task
    const schema = new Schema({
      value: Schema.number()
    })

    // Define the boundaries
    const boundaries = {
      multiply: async (value: number): Promise<number> => {
        return value * 2
      }
    }

    // Create the task using createTask
    const task = createTask({
      schema,
      boundaries,
      fn: async (input, { multiply }) => {
        const result = await multiply(input.value)
        return { result }
      }
    })

    type InputType = typeof schema
    type OutputType = Awaited<ReturnType<typeof task.run>>

    const tape = new RecordTape<InputType, OutputType>({})

    task.addListener<InputType, OutputType>((record) => {
      tape.push(record)
    })

    await task.run({ value: 5 })

    expect(tape.getLog()).toEqual([
      {
        type: 'success',
        input: { value: 5 },
        output: { result: 10 },
        boundaries: {
          multiply: [{
            input: [5],
            output: 10,
            timing: expect.objectContaining({
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              duration: expect.any(Number)
            })
          }]
        },
        metadata: {},
        metrics: [],
        taskName: undefined,
        timing: expect.objectContaining({
          startTime: expect.any(Number),
          endTime: expect.any(Number),
          duration: expect.any(Number)
        })
      }
    ])
  })

  it('Should listen to task events with boundaries', async () => {
    type InputType = { value: number }
    type OutputType = { result: number }

    const tape = new RecordTape<InputType, OutputType>({})

    // Create a schema for the task
    const schema = new Schema({
      value: Schema.number()
    })

    // Define the boundaries
    const boundaries = {
      multiply: async (value: number): Promise<number> => {
        return value * 2
      }
    }

    // Create the task using createTask
    const task = createTask({
      schema,
      boundaries,
      fn: async (input, { multiply }) => {
        const result = await multiply(input.value)
        return { result }
      }
    })

    task.addListener<InputType, OutputType>((record) => {
      tape.push(record)
    })

    await task.run({ value: 5 })

    expect(tape.getLog()).toEqual([
      {
        type: 'success',
        input: { value: 5 },
        output: { result: 10 },
        boundaries: {
          multiply: [{
            input: [5],
            output: 10,
            timing: expect.objectContaining({
              startTime: expect.any(Number),
              endTime: expect.any(Number),
              duration: expect.any(Number)
            })
          }]
        },
        metadata: {},
        metrics: [],
        taskName: undefined,
        timing: expect.objectContaining({
          startTime: expect.any(Number),
          endTime: expect.any(Number),
          duration: expect.any(Number)
        })
      }
    ])
  })
})

