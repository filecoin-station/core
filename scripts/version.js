#!/usr/bin/env node

import fs from 'node:fs/promises'
import execa from 'execa'

const pkg = JSON.parse(
  await fs.readFile(
    new URL('../package.json', import.meta.url),
    'utf8'
  )
)

const main = async () => {
  pkg.sentryEnvironment = 'production'
  await fs.writeFile(
    new URL('../package.json', import.meta.url),
    JSON.stringify(pkg, null, 2) + '\n'
  )
  await execa('git', ['add', 'package.json'])
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
