import { createTask, Schema } from '@forgehive/task'
import { RecordTape } from '../index'

describe('Safe run', () => {
  it('Should run a simple task with no boundaries and register to a tape', async () => {
    const tape = new RecordTape<{ value: number }, { doubled: number }>({})

    const task = createTask({
      name: 'simple-task',
      schema: new Schema({
        value: Schema.number()
      }),
      boundaries: {},
      fn: async ({ value }) => {
        return { doubled: value * 2 }
      }
    })

    task.addListener((record) => {
      tape.push(record)
    })

    // Test simple execution
    const [result, error] = await task.safeRun({ value: 5 })

    expect(error).toBeNull()
    expect(result).toEqual({ doubled: 10 })

    const log = tape.getLog()
    expect(log).toHaveLength(1)
    expect(log[0]).toEqual({
      type: 'success',
      input: { value: 5 },
      output: { doubled: 10 },
      boundaries: {},
      metadata: {},
      taskName: 'simple-task'
    })
  })

  it('Should run a task with boundaries and register to a tape', async () => {
    const tape = new RecordTape<{ value: number }, { result: number; success: boolean }>({})

    const task = createTask({
      name: 'test',
      schema: new Schema({
        value: Schema.number().min(10).max(20)
      }),
      boundaries: {
        multiply: async (value: number): Promise<number> => {
          return value * 2
        }
      },
      fn: async ({ value }, { multiply }) => {
        const result = await multiply(value)
        return { result, success: result > 10 }
      }
    })

    task.addListener((record) => {
      tape.push(record)
    })

    // Test invalid input
    let [result, error] = await task.safeRun({ value: 5 })

    expect(error).toBeDefined()
    expect(error?.message).toContain('Invalid input')

    // Test valid input
    ;[result, error] = await task.safeRun({ value: 15 })
    expect(error).toBeNull()
    expect(result).toEqual({ result: 30, success: true })

    const log = tape.getLog()
    expect(log).toHaveLength(2)
    expect(log[0]).toEqual({
      type: 'error',
      input: { value: 5 },
      error: 'Invalid input on: value: Number must be greater than or equal to 10',
      boundaries: {
        multiply: []
      },
      metadata: {},
      taskName: 'test'
    })

    expect(log[1]).toEqual({
      type: 'success',
      input: { value: 15 },
      output: { result: 30, success: true },
      boundaries: {
        multiply: [{
          input: [15],
          output: 30
        }]
      },
      metadata: {},
      taskName: 'test'
    })
  })

  it('Should run a task with boundaries and register errors to a tape', async () => {
    const tape = new RecordTape<{ value: number }, { result: number }>({})

    const task = createTask({
      name: 'test',
      schema: new Schema({
        value: Schema.number()
      }),
      boundaries: {
        divide: async (value: number): Promise<number> => {
          if (value === 0) {
            throw new Error('Division by zero')
          }
          return 100 / value
        }
      },
      fn: async ({ value }, { divide }) => {
        const result = await divide(value)
        return { result }
      }
    })

    task.addListener((record) => {
      tape.push(record)
    })

    // Test division by zero
    const [, error] = await task.safeRun({ value: 0 })

    expect(error).toBeDefined()
    expect(error?.message).toBe('Division by zero')

    // Test valid input
    const [secondResult, secondError] = await task.safeRun({ value: 10 })
    expect(secondError).toBeNull()
    expect(secondResult).toEqual({ result: 10 })

    const log = tape.getLog()
    expect(log).toHaveLength(2)
    expect(log[0]).toEqual({
      type: 'error',
      input: { value: 0 },
      error: 'Division by zero',
      boundaries: {
        divide: [{
          input: [0],
          error: 'Division by zero'
        }]
      },
      metadata: {},
      taskName: 'test'
    })

    expect(log[1]).toEqual({
      type: 'success',
      input: { value: 10 },
      output: { result: 10 },
      boundaries: {
        divide: [{
          input: [10],
          output: 10
        }]
      },
      metadata: {},
      taskName: 'test'
    })
  })
})
