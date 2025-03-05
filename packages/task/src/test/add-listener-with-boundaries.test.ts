import { Task, type TaskRecord, type Boundaries } from '../index'

// Define interfaces for the boundary objects
interface FetchExternalDataBoundary extends Boundaries {
  fetchExternalData: () => Promise<{ foo: boolean }>
}

interface CounterBoundaries extends Boundaries {
  add: (value: number) => Promise<number>
  subtract: (value: number) => Promise<number>
}

describe('Listener with boundaries tests', () => {
  it('Should record one item and its boundaries tape', async () => {
    const tape: TaskRecord<{ value: number }, { value: number, foo: boolean }>[] = []

    const task = new Task<(argv: { value: number }, boundaries: FetchExternalDataBoundary) => Promise<{ value: number, foo: boolean }>, FetchExternalDataBoundary>(async (_argv, boundaries) => {
      const externalData = await boundaries.fetchExternalData()

      return { ...externalData, ..._argv }
    }, {
      boundaries: {
        fetchExternalData: async (): Promise<{ foo: boolean }> => {
          return { foo: false }
        }
      }
    })

    task.addListener<{ value: number }, { value: number, foo: boolean }>((record) => {
      tape.push(record)
    })

    await task.run({ value: 5 })

    expect(tape.length).toBe(1)
    expect(tape[0].input).toEqual({ value: 5 })
    expect(tape[0].output).toEqual({ value: 5, foo: false })
    expect(tape[0].boundaries).toEqual({
      fetchExternalData: [
        { input: [], output: { foo: false } }
      ]
    })
  })

  it('Should record multiple items and their boundaries tape', async () => {
    const tape: TaskRecord<{ value: number }, { value: number, foo: boolean }>[] = []

    const task = new Task<(argv: { value: number }, boundaries: FetchExternalDataBoundary) => Promise<{ value: number, foo: boolean }>, FetchExternalDataBoundary>(async (_argv, boundaries) => {
      const externalData = await boundaries.fetchExternalData()

      return { ...externalData, ..._argv }
    }, {
      boundaries: {
        fetchExternalData: async (): Promise<{ foo: boolean }> => {
          return { foo: false }
        }
      }
    })

    task.addListener<{ value: number }, { value: number, foo: boolean }>((record) => {
      tape.push(record)
    })

    await task.run({ value: 5 })
    await task.run({ value: 6 })

    expect(tape.length).toBe(2)

    expect(tape[0].input).toEqual({ value: 5 })
    expect(tape[0].output).toEqual({ value: 5, foo: false })
    expect(tape[0].boundaries).toEqual({
      fetchExternalData: [
        { input: [], output: { foo: false } }
      ]
    })

    expect(tape[1].input).toEqual({ value: 6 })
    expect(tape[1].output).toEqual({ value: 6, foo: false })
    expect(tape[1].boundaries).toEqual({
      fetchExternalData: [
        { input: [], output: { foo: false } }
      ]
    })
  })

  it('Should record error and its boundaries tape', async () => {
    const tape: TaskRecord<Record<string, unknown>, { value: number, foo: boolean }>[] = []

    const task = new Task<(argv: Record<string, unknown>, boundaries: FetchExternalDataBoundary) => Promise<{ value: number, foo: boolean }>, FetchExternalDataBoundary>(async (_argv, boundaries) => {
      const externalData = await boundaries.fetchExternalData()
      if (typeof _argv.value === 'undefined') {
        throw new Error('Value is required')
      }

      return { ...externalData, ..._argv as { value: number } }
    }, {
      boundaries: {
        fetchExternalData: async (): Promise<{ foo: boolean }> => {
          return { foo: false }
        }
      }
    })

    task.addListener<Record<string, unknown>, { value: number, foo: boolean }>((record) => {
      tape.push(record)
    })

    try {
      await task.run({})
    } catch (e) {
      // Error is expected
    }

    expect(tape.length).toBe(1)
    expect(tape[0].input).toEqual({})
    expect(tape[0].error).toBe('Value is required')
    expect(tape[0].boundaries).toEqual({
      fetchExternalData: [
        { input: [], output: { foo: false } }
      ]
    })
  })

  it('Should record error + success and their boundaries tape', async () => {
    const tape: TaskRecord<{ value?: number }, { value: number, foo: boolean }>[] = []

    const task = new Task<(argv: { value?: number }, boundaries: FetchExternalDataBoundary) => Promise<{ value: number, foo: boolean }>, FetchExternalDataBoundary>(async (_argv, boundaries) => {
      const externalData = await boundaries.fetchExternalData()
      if (typeof _argv.value === 'undefined') {
        throw new Error('Value is required')
      }

      return { ...externalData, ..._argv as { value: number } }
    }, {
      boundaries: {
        fetchExternalData: async (): Promise<{ foo: boolean }> => {
          return { foo: false }
        }
      }
    })

    task.addListener<{ value?: number }, { value: number, foo: boolean }>((record) => {
      tape.push(record)
    })

    try {
      await task.run({})
    } catch (e) {
      // Error is expected
    }
    await task.run({ value: 5 })

    expect(tape.length).toBe(2)
    expect(tape[0].input).toEqual({})
    expect(tape[0].error).toBe('Value is required')
    expect(tape[0].boundaries).toEqual({
      fetchExternalData: [
        { input: [], output: { foo: false } }
      ]
    })

    expect(tape[1].input).toEqual({ value: 5 })
    expect(tape[1].output).toEqual({ value: 5, foo: false })
    expect(tape[1].boundaries).toEqual({
      fetchExternalData: [
        { input: [], output: { foo: false } }
      ]
    })
  })

  it('Should record 2 run logs if boundary called twice', async () => {
    const tape: TaskRecord<{ value: number }, { foo: boolean }>[] = []

    const task = new Task<(argv: { value: number }, boundaries: FetchExternalDataBoundary) => Promise<{ foo: boolean }>, FetchExternalDataBoundary>(async (_argv, boundaries) => {
      await boundaries.fetchExternalData()
      await boundaries.fetchExternalData()

      return { foo: true }
    }, {
      boundaries: {
        fetchExternalData: async (): Promise<{ foo: boolean }> => {
          return { foo: false }
        }
      }
    })

    task.addListener<{ value: number }, { foo: boolean }>((record) => {
      tape.push(record)
    })

    await task.run({ value: 5 })

    expect(tape.length).toBe(1)
    expect(tape[0].input).toEqual({ value: 5 })
    expect(tape[0].output).toEqual({ foo: true })
    expect(tape[0].boundaries).toEqual({
      fetchExternalData: [
        { input: [], output: { foo: false } },
        { input: [], output: { foo: false } }
      ]
    })
  })

  it('Should record 2 boundary logs', async () => {
    const tape: TaskRecord<{ value: number }, number>[] = []

    const task = new Task<(argv: { value: number }, boundaries: CounterBoundaries) => Promise<number>, CounterBoundaries>(async (_argv, boundaries) => {
      let counter = _argv.value

      counter = await boundaries.add(counter)
      counter = await boundaries.subtract(counter)
      counter = await boundaries.subtract(counter)

      return counter
    }, {
      boundaries: {
        add: async (value: number): Promise<number> => {
          return value + 1
        },
        subtract: async (value: number): Promise<number> => {
          return value - 1
        }
      }
    })

    task.addListener<{ value: number }, number>((record) => {
      tape.push(record)
    })

    await task.run({ value: 5 })

    expect(tape.length).toBe(1)
    expect(tape[0].input).toEqual({ value: 5 })
    expect(tape[0].output).toBe(4)
    expect(tape[0].boundaries).toEqual({
      add: [
        { input: [5], output: 6 }
      ],
      subtract: [
        { input: [6], output: 5 },
        { input: [5], output: 4 }
      ]
    })
  })
})
