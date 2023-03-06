#!/usr/bin/env node

import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(await fs.readFile(join(repoRoot, 'package.json')))
pkg.sentryEnvironment = 'development'
await fs.writeFile(join(repoRoot, 'package.json'), JSON.stringify(pkg, 0, 2))
await execa('git', ['add', 'package.json'])
await execa('git', ['commit', '-m', 'chore: set sentry environment to development'])
await execa('git', ['push'])
