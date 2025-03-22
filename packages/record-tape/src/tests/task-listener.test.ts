import { Task, createTask, Schema } from '@forgehive/task'
import { RecordTape, LogItem } from '../index'

describe.only('Task listener', () => {
  it('Should listen to task events', async () => {
    type InputType = Record<string, unknown>
    type OutputType = { value: number, foo: boolean }

    const tape = new RecordTape<InputType, OutputType>({})
    const task = new Task(
      async (_input: InputType): Promise<OutputType> => {
        return { value: 1, foo: true }
      }
    )

    task.addListener<InputType, OutputType>((record) => {
      const logItem: LogItem<InputType, OutputType> = record.error
        ? { input: record.input, error: record.error, boundaries: record.boundaries }
        : { input: record.input, output: record.output as OutputType, boundaries: record.boundaries }

      tape.addLogItem('test', logItem)
    })

    await task.run({})

    expect(tape.getLog()).toEqual([
      { name: 'test', type: 'success', input: {}, output: { value: 1, foo: true }, boundaries: {} }
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

    task.addListener<{ value: number }, { result: number }>((record) => {
      const logItem: LogItem<{ value: number }, { result: number }> = record.error
        ? { input: record.input, error: record.error, boundaries: record.boundaries }
        : { input: record.input, output: record.output as { result: number }, boundaries: record.boundaries }

      tape.addLogItem('test', logItem)
    })

    try {
      await task.run({ value: 5 })
    } catch (_error) {
      // this is expected
    }

    await task.run({ value: 15 })

    const log = tape.getLog()

    expect(log).toEqual([
      { name: 'test', type: 'error', input: { value: 5 }, error: 'Value is not between 10 and 20', boundaries: {} },
      { name: 'test', type: 'success', input: { value: 15 }, output: { result: 30 }, boundaries: {} }
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
    const task = createTask(
      schema,
      boundaries,
      async (input, { multiply }) => {
        const result = await multiply(input.value)
        return { result }
      }
    )

    type InputType = typeof schema
    type OutputType = Awaited<ReturnType<typeof task.run>>

    const tape = new RecordTape<InputType, OutputType>({})

    task.addListener<InputType, OutputType>((record) => {
      const logItem: LogItem<InputType, OutputType> = record.error
        ? { input: record.input, error: record.error, boundaries: record.boundaries }
        : { input: record.input, output: record.output as OutputType, boundaries: record.boundaries }

      tape.addLogItem('test', logItem)
    })

    await task.run({ value: 5 })

    expect(tape.getLog()).toEqual([
      {
        name: 'test',
        type: 'success',
        input: { value: 5 },
        output: { result: 10 },
        boundaries: {
          multiply: [{ input: [5], output: 10 }]
        }
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
    const task = createTask(
      schema,
      boundaries,
      async (input, { multiply }) => {
        const result = await multiply(input.value)
        return { result }
      }
    )

    task.addListener<InputType, OutputType>((record) => {
      const logItem: LogItem<InputType, OutputType> = record.error
        ? { input: record.input, error: record.error, boundaries: record.boundaries }
        : { input: record.input, output: record.output as OutputType, boundaries: record.boundaries }

      tape.addLogItem('test', logItem)
    })

    await task.run({ value: 5 })

    expect(tape.getLog()).toEqual([
      {
        name: 'test',
        type: 'success',
        input: { value: 5 },
        output: { result: 10 },
        boundaries: {
          multiply: [{ input: [5], output: 10 }]
        }
      }
    ])
  })
})

