import { Task } from '../index'

describe('Task class', () => {
  it('Identity test', async () => {
    const identity = new Task(function (argv) {
      return argv
    })

    const { bar } = await identity.run({ bar: true })
    const { foo } = await identity.run({ foo: true })

    expect(bar).toBe(true)
    expect(foo).toBe(true)
  })

  it('Identity types test', async () => {
    interface Identity {
      bar?: boolean
      foo?: boolean
    }
    const caller = async function (argv: Identity): Promise<Identity> {
      return argv
    }

    const identity = new Task(caller)

    const { bar } = await identity.run({ bar: true })
    const { foo } = await identity.run({ foo: true })

    expect(bar).toBe(true)
    expect(foo).toBe(true)
  })

  it('Add test', async () => {
    const add2 = new Task(function (int: number) {
      return int + 2
    })

    const six = await add2.run(4)
    const seven = await add2.run(5)

    expect(six).toBe(6)
    expect(seven).toBe(7)
  })

  it('getMode proxy test', async () => {
    const proxy = new Task(function (int: number) {
      return int + 2
    }, {
      mode: 'proxy'
    })

    const proxyPass = new Task(function (int: number) {
      return int + 2
    }, {
      mode: 'proxy-pass'
    })

    expect(proxy.getMode()).toBe('proxy')
    expect(proxyPass.getMode()).toBe('proxy-pass')
  })
})
