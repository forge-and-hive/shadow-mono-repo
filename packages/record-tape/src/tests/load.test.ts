import * as path from 'path'
import * as fs from 'fs'
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

describe('Load async', () => {
  it('Load async from file', async () => {
    type InputType = boolean[]
    type OutputType = boolean

    const tape = new RecordTape<InputType, OutputType>({
      path: path.resolve(__dirname, './fixtures/load')
    })

    await tape.load()
    const log = tape.getLog()

    expect(log).toEqual(baseTapeData)
  })

  it('Load async from file on a directory that doesnt exist', async () => {
    const tape = new RecordTape({
      path: path.resolve(__dirname, './nowhere/nop')
    })

    await expect(tape.load()).rejects.toThrow('Logs folder doesn\'t exists')
  })

  it('Load async from file that doesnt exist', async () => {
    const tapeFilePath = path.resolve(__dirname, './fixtures/nop')

    try {
      await fs.promises.unlink(tapeFilePath + '.log')
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Didnt found a file to unlink')
    }

    const tape = new RecordTape({
      path: path.resolve(__dirname, './fixtures/nop')
    })

    await tape.load()
    const log = tape.getLog()

    expect(log).toEqual([])
  })
})

describe('Load sync', () => {
  it('load sync from file', () => {
    type InputType = boolean[]
    type OutputType = boolean

    const tape = new RecordTape<InputType, OutputType>({
      path: path.resolve(__dirname, './fixtures/load')
    })

    tape.loadSync()
    const log = tape.getLog()

    expect(log).toEqual(baseTapeData)
  })

  it('Load sync from file on a directory that doesnt exist', () => {
    const tape = new RecordTape({
      path: path.resolve(__dirname, './somewhere/nop')
    })

    expect(() => tape.loadSync()).toThrow('Logs folder doesn\'t exists')
  })

  it('Load sync from file that doesnt exist', () => {
    const tapeFilePath = path.resolve(__dirname, './fixtures/nop')

    try {
      fs.unlinkSync(tapeFilePath + '.log')
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Didnt found a file to unlink')
    }

    const tape = new RecordTape({
      path: path.resolve(__dirname, './fixtures/nop')
    })

    tape.loadSync()
    const log = tape.getLog()

    expect(log).toEqual([])
  })
})
