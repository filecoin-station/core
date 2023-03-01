#!/usr/bin/env node

import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import fs from 'node:fs/promises'
import * as saturnNode from '../lib/saturn-node.js'
import { createWriteStream } from 'node:fs'
import { pipeline, Transform } from 'node:stream'
import { fileURLToPath } from 'node:url'

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
  moduleLogs: join(XDG_STATE_HOME, 'filecoin-station', 'logs', 'modules'),
  moduleBinaries: join(dirname(fileURLToPath(import.meta.url)), '..', 'modules')
}

await fs.mkdir(join(paths.moduleStorage, 'saturn-L2-node'), { recursive: true })
await fs.mkdir(paths.moduleLogs, { recursive: true })

const formatLog = text =>
  text
    .trimEnd()
    .split(/\n/g)
    .map(line => `[${new Date().toLocaleTimeString()}] ${line}`)
    .join('\n') + '\n'

await saturnNode.start({
  FIL_WALLET_ADDRESS,
  storagePath: join(paths.moduleStorage, 'saturn-L2-node'),
  binariesPath: paths.moduleBinaries,
  storeMetrics: async metrics => {
    await fs.appendFile(
      paths.metrics,
      formatLog(`${JSON.stringify(metrics)}\n`)
    )
  },
  logStream: pipeline(
    new Transform({
      transform (text, _, callback) {
        callback(null, formatLog(text))
      }
    }),
    createWriteStream(
      join(paths.moduleLogs, 'saturn-L2-node.log'),
      { flags: 'a' }
    ),
    () => {}
  )
})
