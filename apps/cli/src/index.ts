#!/usr/bin/env node

import minimist from 'minimist'
import runner from './runner'

const args = minimist(process.argv.slice(2))

type RunnerResult = {
  silent: boolean
  outcome: 'Success' | 'Failure'
  taskName: string
  result: unknown
}

runner.handler(args).then((data) => {
  const { silent, outcome, result } = data as RunnerResult
  if (silent) {
    return
  }

  console.log('===============================================')
  console.log(`Outcome: ${outcome}`)
  console.log('===============================================')
  console.log('Result', result)
  console.log('===============================================')
}).catch((e) => {
  console.error(e)
  process.exit(1)
})
