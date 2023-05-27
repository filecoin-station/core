#!/usr/bin/env node

import execa from 'execa'
import fs from 'node:fs/promises'

const pkg = JSON.parse(
  await fs.readFile(
    new URL('../package.json', import.meta.url),
    'utf8'
  )
)
pkg.sentryEnvironment = 'development'
await fs.writeFile(
  new URL('../package.json', import.meta.url),
  JSON.stringify(pkg, null, 2) + '\n'
)
await execa('git', ['add', 'package.json'])
await execa('git', ['commit', '-m', 'chore: set sentry environment to development'])
await execa('git', ['push'])
