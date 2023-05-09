#!/usr/bin/env node

'use strict'

const { join } = require('node:path')
const fs = require('node:fs/promises')
const execa = require('execa')
const pkg = require('../package.json')

pkg.sentryEnvironment = 'production'
await fs.writeFile(
  join(__dirname, '..', 'package.json'),
  JSON.stringify(pkg, 0, 2) + '\n'
)
await execa('git', ['add', 'package.json'])
