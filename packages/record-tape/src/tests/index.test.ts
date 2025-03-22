import { RecordTape } from '../index'

describe('RecordTape', () => {
  let recordTape: RecordTape

  beforeEach(() => {
    recordTape = new RecordTape()
  })

  it('should log a message', () => {
    const consoleSpy = jest.spyOn(console, 'log')
    const message = 'test message'
    recordTape.log(message)
    expect(consoleSpy).toHaveBeenCalledWith(message)
    consoleSpy.mockRestore()
  })
})
