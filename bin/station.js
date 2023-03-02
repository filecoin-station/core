#!/usr/bin/env node

import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import fs from 'node:fs/promises'
import * as saturnNode from '../lib/saturn-node.js'
import { fileURLToPath } from 'node:url'
import { createLogStream } from '../lib/log.js'
import { Tail } from 'tail'

const {
  FIL_WALLET_ADDRESS,
  XDG_STATE_HOME = join(homedir(), '.local', 'state')
} = process.env

const paths = {
  metrics: join(XDG_STATE_HOME, 'filecoin-station', 'logs', 'metrics.log'),
  moduleStorage: join(XDG_STATE_HOME, 'filecoin-station', 'modules'),
  moduleLogs: join(XDG_STATE_HOME, 'filecoin-station', 'logs', 'modules'),
  moduleBinaries: join(dirname(fileURLToPath(import.meta.url)), '..', 'modules')
}

if (process.argv.includes('metrics')) {
  const isFollow = process.argv.includes('-f')
    || process.argv.includes('--follow')
  if (isFollow) {
    const tail = new Tail(paths.metrics)
    tail.on('line', d => {
      console.log(d)
    })
  } else {
    const metrics = await fs.readFile(paths.metrics, 'utf-8')
    console.log(
      JSON.stringify(
        JSON.parse(
          metrics
            .trim()
            .split('\n')
            .pop()
            .split(/\[([^\]]+)\] /)
            .pop()
        ),
        0,
        2
      )
    )
  }
} else {
  if (!FIL_WALLET_ADDRESS) {
    console.error('FIL_WALLET_ADDRESS required')
    process.exit(1)
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
}
