import { Task } from '../index'

type FetchIncrementFn = (argv: { value: number }) => Promise<number>

interface TaskBoundaries {
  fetchIncrement: FetchIncrementFn
}

describe('Proxy mode', function () {
  // Proxy: execute the function and records it
  it('Should execute the boundary', async function () {
    const add = new Task(async (argv: { value: number }, { fetchIncrement }: TaskBoundaries) => {
      const increment: number = await fetchIncrement(argv)

      return argv.value + increment
    }, {
      boundaries: {
        fetchIncrement: async (argv: { value: number }): Promise<number> => {
          return argv.value
        }
      },
      mode: 'proxy'
    })

    const { fetchIncrement } = add.getBoundaries()
    const result = await add.run({ value: 5 })

    expect(result).toBe(10)
    expect(fetchIncrement.getMode()).toBe('proxy')
  })
})

describe('Proxy pass mode', function () {
  // Proxy pass: review if the input exist, it it exist returns the previous value and if not execute the functions
  it('Should return value from record', async function () {
    let i = 0
    const add = new Task(async (argv: { value: number }, { fetchIncrement }: TaskBoundaries) => {
      const increment: number = await fetchIncrement(argv)

      return argv.value + increment
    }, {
      boundaries: {
        fetchIncrement: async (argv: { value: number }): Promise<number> => {
          i++
          return argv.value
        }
      },
      boundariesData: {
        fetchIncrement: [
          { input: [{ value: 5 }], output: 5 }
        ]
      },
      mode: 'proxy-pass'
    })

    const { fetchIncrement } = add.getBoundaries()
    const result = await add.run({ value: 5 })

    expect(fetchIncrement.getMode()).toBe('proxy-pass')
    expect(result).toBe(10)
    expect(i).toBe(0)
  })

  it('Should run boundary', async function () {
    let i = 0
    const add = new Task(async (argv: { value: number }, { fetchIncrement }: TaskBoundaries) => {
      const increment: number = await fetchIncrement(argv)

      return argv.value + increment
    }, {
      boundaries: {
        fetchIncrement: async (argv: { value: number }): Promise<number> => {
          i++
          return argv.value
        }
      },
      boundariesData: {
        fetchIncrement: [
          { input: [{ value: 6 }], output: 5 }
        ]
      },
      mode: 'proxy-pass'
    })

    const { fetchIncrement } = add.getBoundaries()
    const result = await add.run({ value: 5 })

    expect(fetchIncrement.getMode()).toBe('proxy-pass')
    expect(result).toBe(10)
    expect(i).toBe(1)
  })
})

describe('Proxy catch mode', function () {
  // Proxy-catch: executes the function and if it throws and error, it tries to use a previews output if it exists for the input.
  it('Should run boundary', async function () {
    let i = 0
    const add = new Task(async (argv: { value: number }, { fetchIncrement }: TaskBoundaries) => {
      const increment: number = await fetchIncrement(argv)

      return argv.value + increment
    }, {
      boundaries: {
        fetchIncrement: async (argv: { value: number }): Promise<number> => {
          i++
          return argv.value
        }
      },
      boundariesData: {
        fetchIncrement: [
          { input: [{ value: 5 }], output: 5 }
        ]
      },
      mode: 'proxy-catch'
    })

    const { fetchIncrement } = add.getBoundaries()
    const result = await add.run({ value: 5 })

    expect(fetchIncrement.getMode()).toBe('proxy-catch')
    expect(result).toBe(10)
    expect(i).toBe(1)
  })

  it('After boundary fails, should return value from record', async function () {
    let i = 0
    const add = new Task(async (argv: { value: number }, { fetchIncrement }: TaskBoundaries) => {
      const increment: number = await fetchIncrement(argv)

      return argv.value + increment
    }, {
      boundaries: {
        fetchIncrement: async (_argv: { value: number }): Promise<number> => {
          i++
          throw new Error('Something')
        }
      },
      boundariesData: {
        fetchIncrement: [
          { input: [{ value: 5 }], output: 5 }
        ]
      },
      mode: 'proxy-catch'
    })

    const { fetchIncrement } = add.getBoundaries()
    const result = await add.run({ value: 5 })

    expect(fetchIncrement.getMode()).toBe('proxy-catch')
    expect(result).toBe(10)
    expect(i).toBe(1)
  })
})

describe('Replay mode', function () {
  // Replay: review if the input exist and if it doesnt throws and error.
  it('Should return value from record', async function () {
    let i = 0
    const add = new Task(async (argv: { value: number }, { fetchIncrement }: TaskBoundaries) => {
      const increment: number = await fetchIncrement(argv)

      return argv.value + increment
    }, {
      boundaries: {
        fetchIncrement: async (_argv: { value: number }): Promise<number> => {
          i++
          return 0 // This should never be called in replay mode with existing data
        }
      },
      boundariesData: {
        fetchIncrement: [
          { input: [{ value: 5 }], output: 5 }
        ]
      },
      mode: 'replay'
    })

    const { fetchIncrement } = add.getBoundaries()
    const result = await add.run({ value: 5 })

    expect(fetchIncrement.getMode()).toBe('replay')
    expect(result).toBe(10)
    expect(i).toBe(0)
  })

  it('Should fail if the input its not present', async function () {
    let i = 0
    const add = new Task(async (argv: { value: number }, { fetchIncrement }: TaskBoundaries) => {
      const increment: number = await fetchIncrement(argv)

      return argv.value + increment
    }, {
      boundaries: {
        fetchIncrement: async (_argv: { value: number }): Promise<number> => {
          i++
          return 0 // This should never be called in replay mode
        }
      },
      mode: 'replay'
    })

    const { fetchIncrement } = add.getBoundaries()

    let err: Error | undefined
    try {
      await add.run({ value: 5 })
    } catch (e) {
      err = e as Error
    }

    expect(fetchIncrement.getMode()).toBe('replay')
    expect(err?.message).toBe('No tape value for this inputs')
    expect(i).toBe(0)
  })
})
