#!/usr/bin/env node

import { join } from 'node:path'
import { homedir } from 'node:os'
import { mkdir } from 'node:fs/promises'
import * as saturnNode from '../lib/saturn-node.js'

const {
  FIL_WALLET_ADDRESS,
  ROOT = join(homedir(), '.station')
} = process.env

if (!FIL_WALLET_ADDRESS) {
  console.error('FIL_WALLET_ADDRESS required')
  process.exit(1)
}

await mkdir(ROOT, { recursive: true })
await mkdir(join(ROOT, 'modules'), { recursive: true })
await mkdir(join(ROOT, 'modules', 'saturn-L2-node'), { recursive: true })
await mkdir(join(ROOT, 'logs'), { recursive: true })
await mkdir(join(ROOT, 'logs', 'modules'), { recursive: true })

await saturnNode.start({ ROOT, FIL_WALLET_ADDRESS })
