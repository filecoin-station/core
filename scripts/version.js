#!/usr/bin/env node

import { join } from 'node:path'
import fs from 'node:fs/promises'
import { execa } from 'execa'
import { repoRoot } from '../lib/paths'

const pkg = JSON.parse(await fs.readFile(join(repoRoot, 'package.json')))
pkg.sentryEnvironment = 'production'
await fs.writeFile(
  join(repoRoot, 'package.json'),
  JSON.stringify(pkg, 0, 2) + '\n'
)
await execa('git', ['add', 'package.json'])
