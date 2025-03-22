import { RecordTape } from '../index'

const baseTapeData = [
  {
    name: 'name',
    type: 'success',
    input: [true],
    output: true,
    boundaries: {}
  },
  {
    name: 'name',
    type: 'error',
    input: [true],
    error: 'invalid data',
    boundaries: {}
  }
]

const logFileData = '{"name":"name","type":"success","input":[true],"output":true,"boundaries":{}}\n{"name":"name","type":"error","input":[true],"error":"invalid data","boundaries":{}}\n'

describe('Log format', () => {
  it('Should ensure format', () => {
    type InputType = boolean[]
    type OutputType = boolean

    const tape = new RecordTape<InputType, OutputType>({})

    tape.addLogItem('name', { input: [true], output: true, boundaries: {} })
    tape.addLogItem('name', { input: [true], error: 'invalid data', boundaries: {} })

    expect(tape.getLog()).toEqual(baseTapeData)
  })

  it('Should serialize to one line per item', () => {
    type InputType = boolean[]
    type OutputType = boolean

    const tape = new RecordTape<InputType, OutputType>({})

    tape.addLogItem('name', { input: [true], output: true, boundaries: {} })
    tape.addLogItem('name', { input: [true], error: 'invalid data', boundaries: {} })

    const logFile = tape.stringify()

    expect(logFile).toBe(logFileData)
  })
})
