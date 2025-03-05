import { Runner } from '../index'

describe('Runner', () => {
  it('should create a new Runner instance', () => {
    const runner = new Runner()
    expect(runner).toBeInstanceOf(Runner)
  })
})
