#!/usr/bin/env node

import { join } from 'node:path'
import { homedir } from 'node:os'
import { mkdir } from 'node:fs/promises'
import * as saturnNode from '../lib/saturn-node.js'
import { createWriteStream } from 'node:fs'

const {
  FIL_WALLET_ADDRESS,
  XDG_STATE_HOME = join(homedir(), '.local', 'state')
} = process.env

if (!FIL_WALLET_ADDRESS) {
  console.error('FIL_WALLET_ADDRESS required')
  process.exit(1)
}

const paths = {
  metrics: join(XDG_STATE_HOME, 'filecoin-station', 'logs', 'metrics.log'),
  moduleStorage: join(XDG_STATE_HOME, 'filecoin-station', 'modules'),
  moduleLogs: join(XDG_STATE_HOME, 'filecoin-station', 'logs', 'modules')
}

await mkdir(join(paths.moduleStorage, 'saturn-L2-node'), { recursive: true })
await mkdir(paths.moduleLogs, { recursive: true })

await saturnNode.start({
  FIL_WALLET_ADDRESS,
  storagePath: join(paths.moduleStorage, 'saturn-L2-node'),
  metricsPath: paths.metrics,
  logStream: createWriteStream(
    join(paths.moduleLogs, 'saturn-L2-node.log'),
    { flags: 'a' }
  )
})
