import { RecordTape } from '../index'

describe('Mode behavior', () => {
  it('Should start in record mode by default', () => {
    const tape = new RecordTape()
    expect(tape.getMode()).toBe('record')
  })

  it('Should not add log items in replay mode', () => {
    type InputType = { value: number }
    type OutputType = { result: number }

    const tape = new RecordTape<InputType, OutputType>()
    tape.setMode('replay')

    tape.addLogItem('test', {
      input: { value: 1 },
      output: { result: 2 }
    })

    expect(tape.getLog()).toEqual([])
  })

  it('Should add log items in record mode', () => {
    type InputType = { value: number }
    type OutputType = { result: number }

    const tape = new RecordTape<InputType, OutputType>()
    tape.setMode('record')

    tape.addLogItem('test', {
      input: { value: 1 },
      output: { result: 2 }
    })

    expect(tape.getLog()).toEqual([
      {
        name: 'test',
        type: 'success',
        input: { value: 1 },
        output: { result: 2 },
        boundaries: {}
      }
    ])
  })

  it('Should switch between modes', () => {
    type InputType = { value: number }
    type OutputType = { result: number }

    const tape = new RecordTape<InputType, OutputType>()

    // Start in record mode
    expect(tape.getMode()).toBe('record')
    tape.addLogItem('test1', {
      input: { value: 1 },
      output: { result: 2 }
    })

    // Switch to replay mode
    tape.setMode('replay')
    expect(tape.getMode()).toBe('replay')
    tape.addLogItem('test2', {
      input: { value: 3 },
      output: { result: 4 }
    })

    // Switch back to record mode
    tape.setMode('record')
    expect(tape.getMode()).toBe('record')
    tape.addLogItem('test3', {
      input: { value: 5 },
      output: { result: 6 }
    })

    expect(tape.getLog()).toEqual([
      {
        name: 'test1',
        type: 'success',
        input: { value: 1 },
        output: { result: 2 },
        boundaries: {}
      },
      {
        name: 'test3',
        type: 'success',
        input: { value: 5 },
        output: { result: 6 },
        boundaries: {}
      }
    ])
  })
})
