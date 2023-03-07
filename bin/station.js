#!/usr/bin/env node

import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import fs from 'node:fs/promises'
import * as saturnNode from '../lib/saturn-node.js'
import { fileURLToPath } from 'node:url'
import { createLogStream } from '../lib/log.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

const {
  FIL_WALLET_ADDRESS,
  XDG_STATE_HOME = join(homedir(), '.local', 'state')
} = process.env

if (process.argv.includes('-v') || process.argv.includes('--version')) {
  const pkg = await fs.readFile(join(repoRoot, 'package.json'), 'utf8')
  const meta = JSON.parse(pkg)
  console.log('%s: %s', meta.name, meta.version)
  process.exit()
}

if (!FIL_WALLET_ADDRESS) {
  console.error('FIL_WALLET_ADDRESS required')
  process.exit(1)
}

const paths = {
  metrics: join(XDG_STATE_HOME, 'filecoin-station', 'logs', 'metrics.log'),
  moduleStorage: join(XDG_STATE_HOME, 'filecoin-station', 'modules'),
  moduleLogs: join(XDG_STATE_HOME, 'filecoin-station', 'logs', 'modules'),
  moduleBinaries: join(repoRoot, 'modules')
}

await fs.mkdir(join(paths.moduleStorage, 'saturn-L2-node'), { recursive: true })
await fs.mkdir(paths.moduleLogs, { recursive: true })

await saturnNode.start({
  FIL_WALLET_ADDRESS,
  storagePath: join(paths.moduleStorage, 'saturn-L2-node'),
  binariesPath: paths.moduleBinaries,
  metricsStream: createLogStream(paths.metrics),
  logStream: createLogStream(join(paths.moduleLogs, 'saturn-L2-node.log'))
})
