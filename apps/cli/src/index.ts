#!/usr/bin/env node

import minimist from 'minimist'
import runner from './runner'

const args = minimist(process.argv.slice(2))

runner.handler(args).then(data => {
  console.log('Result!!!', data)
}).catch((e) => {
  console.error(e)
  process.exit(1)
})
