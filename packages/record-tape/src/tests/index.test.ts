import * as path from 'path'
import { RecordTape } from '../index'

const emptyPath = path.resolve('any')
const tapePath = path.resolve(__dirname, './fixtures/load')

describe('Base tests', () => {
  it('Load sync with no file should return a empty tape', () => {
    const tape = new RecordTape({ path: emptyPath })
    tape.loadSync()

    const data = tape.getLog()
    expect(data.length).toBe(0)
  })

  it('Load sync with fixture tape should return a tape with one element', () => {
    const tape = new RecordTape({ path: tapePath })
    tape.loadSync()

    const data = tape.getLog()
    expect(data.length).toBe(2)
  })

  it('Load with no file should return a empty tape', async () => {
    const tape = new RecordTape({ path: emptyPath })
    await tape.load()

    const data = tape.getLog()
    expect(data.length).toBe(0)
  })

  it('Load with fixture tape should return a tape with one element', async () => {
    const tape = new RecordTape({ path: tapePath })
    await tape.load()

    const data = tape.getLog()
    expect(data.length).toBe(2)
  })
})
