#!/usr/bin/env node

import { join, dirname } from 'node:path'
import { homedir, arch, platform } from 'node:os'
import { mkdir } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createWriteStream } from 'node:fs'

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

const modules = join(dirname(fileURLToPath(import.meta.url)), '..', 'modules')
const archOverwritten = platform() === 'darwin' ? 'x64' : arch()
const ps = spawn(
  join(
    modules,
    `saturn-L2-node-${platform()}-${archOverwritten}`,
    'saturn-L2-node'
  ), {
    env: {
      ROOT_DIR: join(ROOT, 'modules', 'saturn-L2-node'),
      FIL_WALLET_ADDRESS
    }
  }
)

ps.stdout.pipe(process.stdout, { end: false })
ps.stderr.pipe(process.stderr, { end: false })

ps.stdout.pipe(
  createWriteStream(
    join(ROOT, 'logs', 'modules', 'saturn-L2-node.log'),
    { flags: 'a' }
  )
)
ps.stderr.pipe(
  createWriteStream(
    join(ROOT, 'logs', 'modules', 'saturn-L2-node.err.log'),
    { flags: 'a' }
  )
)
