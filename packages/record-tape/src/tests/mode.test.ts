import { RecordTape } from '../index'

describe('Test mode', () => {
  it('Should record items if mode is record', () => {
    type InputType = { name: string }
    type OutputType = { age: number }

    const tape = new RecordTape<InputType, OutputType>({})
    tape.setMode('record')

    tape.addLogRecord({
      name: 'test',
      input: { name: 'test' },
      output: { age: 1 },
      boundaries: {},
      type: 'success'
    })

    const data = tape.getLog()

    expect(data).toEqual([{
      name: 'test',
      input: { name: 'test' },
      output: { age: 1 },
      boundaries: {},
      type: 'success'
    }])
  })

  it('Should not record items if mode is replay', () => {
    type InputType = { name: string }
    type OutputType = { age: number }

    const tape = new RecordTape<InputType, OutputType>({})
    tape.setMode('replay')

    tape.addLogRecord({
      name: 'test',
      input: { name: 'test' },
      output: { age: 1 },
      boundaries: {},
      type: 'success'
    })

    const data = tape.getLog()
    expect(data).toEqual([])
  })

  it('Should append logs with same name', () => {
    type InputType = { name: string }
    type OutputType = { age: number }

    const tape = new RecordTape<InputType, OutputType>({})
    tape.setMode('record')

    tape.addLogRecord({
      name: 'test1',
      input: { name: 'test' },
      output: { age: 1 },
      boundaries: {},
      type: 'success'
    })

    tape.addLogRecord({
      name: 'test2',
      input: { name: 'test' },
      output: { age: 2 },
      boundaries: {},
      type: 'success'
    })

    tape.addLogRecord({
      name: 'test3',
      input: { name: 'test' },
      output: { age: 3 },
      boundaries: {},
      type: 'success'
    })

    const data = tape.getLog()

    expect(data).toEqual([
      {
        name: 'test1',
        input: { name: 'test' },
        output: { age: 1 },
        boundaries: {},
        type: 'success'
      },
      {
        name: 'test2',
        input: { name: 'test' },
        output: { age: 2 },
        boundaries: {},
        type: 'success'
      },
      {
        name: 'test3',
        input: { name: 'test' },
        output: { age: 3 },
        boundaries: {},
        type: 'success'
      }
    ])
  })
})
