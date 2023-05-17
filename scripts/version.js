#!/usr/bin/env node

'use strict'

const { join } = require('node:path')
const fs = require('node:fs/promises')
const execa = require('execa')
const pkg = require('../package.json')

const main = async () => {
  pkg.sentryEnvironment = 'production'
  await fs.writeFile(
    join(__dirname, '..', 'package.json'),
    JSON.stringify(pkg, null, 2) + '\n'
  )
  await execa('git', ['add', 'package.json'])
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
