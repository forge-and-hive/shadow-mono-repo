import { Task, type Boundaries, type WrappedBoundaries } from '../index'

// Need to add proxy cache mode to the boundaries
describe('Boundaries tasks tests', () => {
  it('Indentity + boundaries test', async () => {
    interface FetchExternalDataBoundary extends Boundaries {
      fetchExternalData: () => Promise<{ foo: boolean }>
    }

    const indentity = new Task<
      (argv: Record<string, boolean>, boundaries: WrappedBoundaries<FetchExternalDataBoundary>) => Promise<Record<string, boolean>>,
      FetchExternalDataBoundary
        >(
        async (argv: Record<string, boolean>, boundaries: WrappedBoundaries<FetchExternalDataBoundary>): Promise<Record<string, boolean>> => {
          const externalData = await boundaries.fetchExternalData()

          return { ...externalData, ...argv }
        },
        {
          boundaries: {
            fetchExternalData: async (): Promise<{ foo: boolean }> => {
              return { foo: false }
            }
          }
        }
        )

    const object = await indentity.run({ bar: true })
    const { foo } = await indentity.run({ foo: true })

    expect(object).toEqual({ bar: true, foo: false })
    expect(foo).toBe(true)
  })

  it('Indentity test with tape data', async () => {
    interface FetchExternalDataBoundary extends Boundaries {
      fetchExternalData: () => Promise<{ foo: boolean }>
    }

    const indentity = new Task<
      (argv: Record<string, boolean>, boundaries: WrappedBoundaries<FetchExternalDataBoundary>) => Promise<Record<string, boolean>>,
      FetchExternalDataBoundary
        >(
        async (argv: Record<string, boolean>, boundaries: WrappedBoundaries<FetchExternalDataBoundary>): Promise<Record<string, boolean>> => {
          const externalData = await boundaries.fetchExternalData()

          return { ...externalData, ...argv }
        },
        {
          boundaries: {
            fetchExternalData: async (): Promise<{ foo: boolean }> => {
            // Return an empty implementation, the actual data will come from boundariesData
              return { foo: false }
            }
          },
          boundariesData: {
            fetchExternalData: [
              { input: [], output: { foo: false } }
            ]
          },
          mode: 'proxy-pass'
        }
        )

    const object = await indentity.run({ bar: true })
    const { foo } = await indentity.run({ foo: true })

    expect(object).toEqual({ bar: true, foo: false })
    expect(foo).toBe(true)
  })

  it('Add task with boundaries test', async () => {
    interface FetchExternalDataBoundary extends Boundaries {
      fetchExternalData: (int: number) => Promise<number>
    }

    const add = new Task<
      (int: number, boundaries: WrappedBoundaries<FetchExternalDataBoundary>) => Promise<number>,
      FetchExternalDataBoundary
        >(
        async function (int: number, boundaries: WrappedBoundaries<FetchExternalDataBoundary>): Promise<number> {
          const externalData: number = await boundaries.fetchExternalData(1)

          return int + externalData
        },
        {
          boundaries: {
            fetchExternalData: async (int: number): Promise<number> => {
              return int * 2
            }
          }
        }
        )

    const six = await add.run(4)
    const seven = await add.run(5)

    expect(six).toBe(6)
    expect(seven).toBe(7)
  })

  it('Add task + boundaries + tape test', async () => {
    interface FetchExternalDataBoundary extends Boundaries {
      fetchExternalData: (int: number) => Promise<number>
    }

    const add = new Task<
      (int: number, boundaries: WrappedBoundaries<FetchExternalDataBoundary>) => Promise<number>,
      FetchExternalDataBoundary
        >(
        async function (int: number, boundaries: WrappedBoundaries<FetchExternalDataBoundary>): Promise<number> {
          const externalData: number = await boundaries.fetchExternalData(int)

          return int + externalData
        },
        {
          boundaries: {
            fetchExternalData: async (int: number): Promise<number> => {
              return int * 2
            }
          },
          boundariesData: {
            fetchExternalData: [
              { input: [4], output: 2 }
            ]
          },
          mode: 'proxy-pass'
        }
        )

    const six = await add.run(4) // From tape data
    const fifteen = await add.run(5)

    expect(six).toBe(6)
    expect(fifteen).toBe(15)
  })
})
