import fs from 'fs'
import path from 'path'
import { RecordTape } from '../index'

const logFileData = '{"name":"name","type":"success","input":[true],"output":true,"boundaries":{}}\n{"name":"name","type":"error","input":[true],"error":"invalid data","boundaries":{}}\n'

describe('Save to file async', () => {
  it('Save async to existing file(should add new logs)', async () => {
    type InputType = boolean[]
    type OutputType = boolean

    const tapeFilePath = path.resolve(__dirname, './fixtures/save')
    try {
      await fs.promises.writeFile(tapeFilePath + '.log', logFileData)
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Didnt found a file to unlink')
    }

    const tape = new RecordTape<InputType, OutputType>({ path: tapeFilePath })
    await tape.load()
    tape.addLogItem('name', { input: [true], output: true, boundaries: {} })
    tape.addLogItem('name', { input: [true], error: 'invalid data', boundaries: {} })
    await tape.save()

    const content = await fs.promises.readFile(tapeFilePath + '.log', 'utf8')

    expect(tape.getLog().length).toBe(4)
    expect(tape.stringify()).toBe(logFileData + logFileData)
    expect(content).toBe(logFileData + logFileData)
  })

  it('Save async to a path of invalid folder', async () => {
    type InputType = boolean[]
    type OutputType = boolean

    const tapeFilePath = path.resolve(__dirname, './nowhere/nop')

    const tape = new RecordTape<InputType, OutputType>({ path: tapeFilePath })
    tape.addLogItem('name', { input: [true], output: true, boundaries: {} })
    tape.addLogItem('name', { input: [true], error: 'invalid data', boundaries: {} })

    await expect(tape.save()).rejects.toThrow('Folder doesn\'t exists')
  })

  it('Save async to a log file that doesnt exist', async () => {
    type InputType = boolean[]
    type OutputType = boolean

    const tapeFilePath = path.resolve(__dirname, './fixtures/nop')

    try {
      await fs.promises.unlink(tapeFilePath + '.log')
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Didnt found a file to unlink')
    }

    const tape = new RecordTape<InputType, OutputType>({ path: tapeFilePath })
    tape.addLogItem('name', { input: [true], output: true, boundaries: {} })
    tape.addLogItem('name', { input: [true], error: 'invalid data', boundaries: {} })
    await tape.save()

    const content = await fs.promises.readFile(tapeFilePath + '.log', 'utf8')

    expect(content).toBe(logFileData)
  })
})

describe('Save to file sync', () => {
  it('Save sync', () => {
    type InputType = boolean[]
    type OutputType = boolean

    const tapeFilePath = path.resolve(__dirname, './fixtures/save')
    try {
      fs.unlinkSync(tapeFilePath + '.log')
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('didnt found a file to unlink')
    }

    const tape = new RecordTape<InputType, OutputType>({ path: tapeFilePath })
    tape.addLogItem('name', { input: [true], output: true, boundaries: {} })
    tape.addLogItem('name', { input: [true], error: 'invalid data', boundaries: {} })
    tape.saveSync()

    const content = fs.readFileSync(tapeFilePath + '.log', 'utf8')

    expect(content).toBe(logFileData)
  })

  it('Save sync to a path of invalid folder', () => {
    type InputType = boolean[]
    type OutputType = boolean

    const tapeFilePath = path.resolve(__dirname, './nowhere/nop')

    const tape = new RecordTape<InputType, OutputType>({ path: tapeFilePath })
    tape.addLogItem('name', { input: [true], output: true, boundaries: {} })
    tape.addLogItem('name', { input: [true], error: 'invalid data', boundaries: {} })

    expect(() => tape.saveSync()).toThrow('Folder doesn\'t exists')
  })

  it('Save sync to a log file that doesnt exist', () => {
    type InputType = boolean[]
    type OutputType = boolean

    const tapeFilePath = path.resolve(__dirname, './fixtures/nop')

    try {
      fs.unlinkSync(tapeFilePath + '.log')
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Didnt found a file to unlink')
    }

    const tape = new RecordTape<InputType, OutputType>({ path: tapeFilePath })
    tape.addLogItem('name', { input: [true], output: true, boundaries: {} })
    tape.addLogItem('name', { input: [true], error: 'invalid data', boundaries: {} })
    tape.saveSync()

    const content = fs.readFileSync(tapeFilePath + '.log', 'utf8')

    expect(content).toBe(logFileData)
  })
})
