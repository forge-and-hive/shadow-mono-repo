/* eslint-disable no-console */
import { Schema } from '@shadow/schema'
import { Task } from '@shadow/task'

export interface RunnerOptions {}

export class Runner {
  constructor(options: RunnerOptions = {}) {
    console.log('Runner initialized with options:', options)
    console.log('Schema:', Schema)
    console.log('Task:', Task)
  }
}

export default Runner
