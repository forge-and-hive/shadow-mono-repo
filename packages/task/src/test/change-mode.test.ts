import { Task } from '../index'

describe('Change modes', () => {
  it('On task start, boundaries should start in the same mode', async () => {
    const add = new Task(async (argv: { value: number }, { fetchIncrement }) => {
      const increment: number = await fetchIncrement(argv)

      return argv.value + increment
    }, {
      boundaries: {
        fetchIncrement: async (argv: { value: number }): Promise<number> => {
          return argv.value
        }
      },
      mode: 'proxy-catch'
    })

    const { fetchIncrement } = add.getBoundaries()

    expect(fetchIncrement.getMode()).toBe('proxy-catch')
  })

  it('On task mode change, boundaries should change to the same', async () => {
    const add = new Task(async (argv: { value: number }, { fetchIncrement }) => {
      const increment: number = await fetchIncrement(argv)

      return argv.value + increment
    }, {
      boundaries: {
        fetchIncrement: async (argv: { value: number }): Promise<number> => {
          return argv.value
        }
      },
      mode: 'proxy-catch'
    })

    const { fetchIncrement: original } = add.getBoundaries()
    expect(original.getMode()).toBe('proxy-catch')

    add.setMode('replay')

    const { fetchIncrement: updated } = add.getBoundaries()
    expect(updated.getMode()).toBe('replay')
  })
})
