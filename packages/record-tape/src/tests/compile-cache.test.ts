import path from 'path'
import { RecordTape } from '../index'

const simpleTapePath = path.resolve(__dirname, './fixtures/single-cache')
const complexTapePath = path.resolve(__dirname, './fixtures/complex-cache')

describe('Cache tests', () => {
  it('Should create cache object from log', () => {
    type InputType = string[]
    type OutputType = string

    const tape = new RecordTape<InputType, OutputType>({ path: simpleTapePath })
    tape.loadSync()

    const cache = tape.compileCache()

    expect(cache).toEqual({
      getFilePath: [
        { input: ['doc'], output: 'readme.md' },
        { input: ['package'], output: 'package.json' }
      ]
    })
  })

  it.skip('Should create cache object with multiple boundaties', () => {
    type InputType = string[]
    type OutputType = string

    const tape = new RecordTape<InputType, OutputType>({ path: complexTapePath })
    tape.loadSync()

    const cache = tape.compileCache()

    expect(cache).toEqual({
      getFilePath: [
        { input: ['doc'], output: 'readme.md' },
        { input: ['package'], output: 'package.json' }
      ]
    })
  })
})
