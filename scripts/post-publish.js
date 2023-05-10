#!/usr/bin/env node

'use strict'

const { join } = require('node:path')
const execa = require('execa')
const fs = require('node:fs/promises')
const pkg = require('../package.json')

const main = async () => {
  pkg.sentryEnvironment = 'development'
  await fs.writeFile(
    join(__dirname, '..', 'package.json'),
    JSON.stringify(pkg, 0, 2) + '\n'
  )
  await execa('git', ['add', 'package.json'])
  await execa('git', ['commit', '-m', 'chore: set sentry environment to development'])
  await execa('git', ['push'])
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
