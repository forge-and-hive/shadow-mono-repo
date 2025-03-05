import { Task } from '../index'
import { Schema, type InferSchema } from '@shadow/schema'

describe('Listener tests', () => {
  it('Should record one item', async () => {
    const tape: any[] = []
    const task = new Task(function (_argv) {
      return _argv
    })

    task.addListener((record: any) => {
      tape.push(record)
    })

    await task.run({ value: 5 })

    expect(tape.length).toBe(1)
    expect(tape[0].input).toEqual({ value: 5 })
    expect(tape[0].output).toEqual({ value: 5 })
  })

  it('Should record execution error', async () => {
    const tape: any[] = []
    const task = new Task(function (_argv) {
      throw new Error('This should happen')
    })

    task.addListener((record: any) => {
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
    const tape: any[] = []
    const schema = new Schema({
      value: Schema.number()
    })

    const task = new Task(function (_argv: InferSchema<typeof schema>) {
      return _argv
    }, {
      validate: schema
    })

    task.addListener((record: any) => {
      tape.push(record)
    })

    try {
      // @ts-expect-error - We're intentionally passing null to test validation error
      await task.run({ value: null })
    } catch (e) {
      // Error is expected
    }

    expect(tape.length).toBe(1)
    expect(tape[0].input).toEqual({ value: null })
    expect(tape[0].error).toBe('Invalid input')
  })

  it('Should record multiple records', async () => {
    const tape: any[] = []
    const task = new Task(function (_argv) {
      return _argv
    })

    task.addListener((record: any) => {
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
    const tape: any[] = []
    const task = new Task(function (_argv) {
      return _argv
    })

    task.addListener((record: any) => {
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

