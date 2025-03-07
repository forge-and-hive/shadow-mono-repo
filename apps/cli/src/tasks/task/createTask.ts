import { createTask } from '@shadow/task'
import { Schema } from '@shadow/schema'

import Handlebars from 'handlebars'
import path from 'path'
import fs from 'fs/promises'
import camelCase from 'camelcase'

import { load } from '../conf/load'
import { type TaskName, type ShadowConf } from '../types'

const templatePath = path.resolve(__dirname, '../../templates/task.hbs')

const schema = new Schema({
  descriptorName: Schema.string()
})

const boundaries = {
  loadTemplate: async (): Promise<string> => {
    const template = await fs.readFile(templatePath, 'utf-8')
    return template
  },
  persistTask: async (dir: string, fileName: string, content: string): Promise<{ path: string }> => {
    const dirPath = path.resolve(process.cwd(), dir)
    const taskPath = path.resolve(dirPath, fileName)

    let err
    try {
      await fs.stat(taskPath)
    } catch (e) {
      err = e
    }

    if (err === undefined) {
      throw new Error(`File '${taskPath}' already exists.`)
    }

    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(taskPath, content, 'utf-8')

    return {
      path: taskPath.toString()
    }
  },
  loadConf: async (): Promise<ShadowConf> => {
    return await load.run({})
  },
  persistConf: async (shadow: ShadowConf): Promise<void> => {
    const shadowPath = path.join(process.cwd(), 'shadow.json')
    await fs.writeFile(shadowPath, JSON.stringify(shadow, null, 2))
  },
  parseTaskName: async (taskDescriptor: string): Promise<TaskName> => {
    const res: string[] = taskDescriptor.split(':')

    if (res.length === 1) {
      return {
        descriptor: `${camelCase(res[0])}`,
        taskName: `${camelCase(res[0])}`,
        fileName: `${camelCase(res[0])}.ts`
      }
    }

    return {
      dir: res[0],
      descriptor: `${res[0]}:${camelCase(res[1])}`,
      taskName: `${camelCase(res[1])}`,
      fileName: `${camelCase(res[1])}.ts`
    }
  }
}

export const createTaskCommand = createTask(
  schema,
  boundaries,
  async function ({ descriptorName }, {
    loadTemplate,
    persistTask,
    loadConf,
    persistConf,
    parseTaskName
  }) {
    const { taskName, fileName, descriptor, dir } = await parseTaskName(descriptorName)

    const shadow = await loadConf()
    let taskPath: string = shadow.paths.tasks

    if (dir !== undefined) {
      taskPath = path.join(taskPath, dir)
    }

    console.log(`
    ==================================================
    Starting task creation!
    Creating: ${taskName}
    Dir:  ${dir ?? ''}
    Into: ${taskPath}
    ==================================================
    `)

    const template = await loadTemplate()
    const comp = Handlebars.compile(template)
    const content = comp({
      taskName,
      taskDescriptor: descriptor
    })

    await persistTask(taskPath, fileName, content)

    if (shadow.tasks === undefined) {
      shadow.tasks = {}
    }

    shadow.tasks[descriptor] = {
      path: `${taskPath}/${fileName}`,
      handler: taskName
    }

    await persistConf(shadow)

    return { taskPath, fileName }
  }
)
