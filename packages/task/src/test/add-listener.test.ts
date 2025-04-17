import { Task, type TaskRecord } from '../index'
import { Schema, type InferSchema } from '@forgehive/schema'

describe('Listener tests', () => {
  it('Should record one item', async () => {
    const tape: TaskRecord<{ value: number }, { value: number }>[] = []
    const task = new Task(function (_argv: { value: number }) {
      return _argv
    })

    task.addListener((record) => {
      tape.push(record)
    })

    await task.run({ value: 5 })

    expect(tape.length).toBe(1)
    expect(tape[0].input).toEqual({ value: 5 })
    expect(tape[0].output).toEqual({ value: 5 })
  })

  it('Should record execution error', async () => {
    const tape: TaskRecord<{ value: number }, never>[] = []
    const task = new Task(function (_argv: { value: number }) {
      throw new Error('This should happen')
    })

    task.addListener((record) => {
      tape.push(record)
    })

    try {
      await task.run({ value: 5 })
    } catch (e) {
      // Error is expected
    }

    expect(tape.length).toBe(1)
    expect(tape[0].input).toEqual({ value: 5 })
    expect(tape[0].error).toBe('This should happen')
  })

  it('Should record validation error', async () => {
    const tape: TaskRecord<{ value: number | null }, { value: number }>[] = []
    const schema = new Schema({
      value: Schema.number().min(5)
    })

    const task = new Task(function (_argv: InferSchema<typeof schema>) {
      return _argv
    }, {
      schema
    })

    task.addListener<{ value: number | null }, { value: number }>((record) => {
      tape.push(record)
    })

    try {
      await task.run({ value: 3 })
    } catch (e) {
      // Error is expected
    }

    expect(tape.length).toBe(1)
    expect(tape[0].input).toEqual({ value: 3 })
    expect(tape[0].error).toContain('Invalid input on:')
    expect(tape[0].error).toContain('value:')
    expect(tape[0].error).toContain('Number must be greater than or equal to 5')
  })

  it('Should record multiple records', async () => {
    const tape: TaskRecord<{ value: number }, { value: number }>[] = []
    const task = new Task(function (_argv: { value: number }) {
      return _argv
    })

    task.addListener((record) => {
      tape.push(record)
    })

    await task.run({ value: 5 })
    await task.run({ value: 6 })

    expect(tape.length).toBe(2)
    expect(tape[0].input).toEqual({ value: 5 })
    expect(tape[0].output).toEqual({ value: 5 })

    expect(tape[1].input).toEqual({ value: 6 })
    expect(tape[1].output).toEqual({ value: 6 })
  })

  it('Should stop recording', async () => {
    const tape: TaskRecord<{ value: number }, { value: number }>[] = []
    const task = new Task(function (_argv: { value: number }) {
      return _argv
    })

    task.addListener((record) => {
      tape.push(record)
    })

    await task.run({ value: 5 })

    task.removeListener()
    await task.run({ value: 6 })

    expect(tape.length).toBe(1)
    expect(tape[0].input).toEqual({ value: 5 })
    expect(tape[0].output).toEqual({ value: 5 })
  })
})
