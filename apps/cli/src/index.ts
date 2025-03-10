#!/usr/bin/env node

import minimist from 'minimist'
import runner from './runner'

const args = minimist(process.argv.slice(2))

runner.handler(args).then(data => {
  console.log('===============================================')
  console.log('Outcome', data)
  console.log('===============================================')
}).catch((e) => {
  console.error(e)
  process.exit(1)
})
