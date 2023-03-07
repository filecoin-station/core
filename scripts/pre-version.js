#!/usr/bin/env node

import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(await fs.readFile(join(repoRoot, 'package.json')))
pkg.sentryEnvironment = 'production'
await fs.writeFile(join(repoRoot, 'package.json'), JSON.stringify(pkg, 0, 2))
