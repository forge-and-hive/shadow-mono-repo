import { RecordTape } from '../index'

describe('Test log item formating', () => {
  it('Should format a log items into valid JSON', async () => {
    type InputType = boolean
    type OutputType = boolean

    const tape = new RecordTape<InputType, OutputType>({})
    tape.addLogRecord({ name: 'name', input: true, output: true, boundaries: {}, type: 'success' })
    tape.addLogRecord({ name: 'name', input: true, error: 'invalid data', boundaries: {}, type: 'error' })

    const str = tape.stringify()

    expect(str).toEqual(`{"name":"name","input":true,"output":true,"boundaries":{},"type":"success"}
{"name":"name","input":true,"error":"invalid data","boundaries":{},"type":"error"}
`)
  })

  it('Should parse the string to a list of records', async () => {
    type InputType = boolean
    type OutputType = boolean

    const tape = new RecordTape<InputType, OutputType>({})
    tape.addLogRecord({ name: 'name', input: true, output: true, boundaries: {}, type: 'success' })
    tape.addLogRecord({ name: 'name', input: true, error: 'invalid data', boundaries: {}, type: 'error' })

    const str = tape.stringify()
    const tape2 = new RecordTape<InputType, OutputType>({})
    const records = tape2.parse(str)

    expect(records).toEqual([
      { name: 'name', input: true, output: true, boundaries: {}, type: 'success' },
      { name: 'name', input: true, error: 'invalid data', boundaries: {}, type: 'error' }
    ])
  })
})
