#!/usr/bin/env node

import { join } from 'node:path'
import { execa } from 'execa'
import fs from 'node:fs/promises'
import { repoRoot } from '../lib/paths'

const pkg = JSON.parse(await fs.readFile(join(repoRoot, 'package.json')))
pkg.sentryEnvironment = 'development'
await fs.writeFile(
  join(repoRoot, 'package.json'),
  JSON.stringify(pkg, 0, 2) + '\n'
)
await execa('git', ['add', 'package.json'])
await execa('git', ['commit', '-m', 'chore: set sentry environment to development'])
await execa('git', ['push'])
