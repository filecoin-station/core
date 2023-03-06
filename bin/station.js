#!/usr/bin/env node

import * as commands from '../commands/index.js'
import fs from 'node:fs/promises'
import { join } from 'node:path'
import { paths } from '../lib/paths.js'

await fs.mkdir(join(paths.moduleStorage, 'saturn-L2-node'), { recursive: true })
await fs.mkdir(paths.moduleLogs, { recursive: true })

if (process.argv.includes('metrics')) {
  await commands.metrics()
} else {
  await commands.station()
}
