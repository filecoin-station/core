#!/usr/bin/env node

import { join } from 'node:path'
import { homedir } from 'node:os'
import { mkdir } from 'node:fs/promises'

const {
  FIL_WALLET_ADDRESS,
  ROOT = join(homedir(), '.station')
} = process.env

if (!FIL_WALLET_ADDRESS) {
  console.error('FIL_WALLET_ADDRESS required')
  process.exit(1)
}

mkdir(ROOT, { recursive: true })
mkdir(join(ROOT, 'modules'), { recursive: true })
mkdir(join(ROOT, 'logs'), { recursive: true })
mkdir(join(ROOT, 'logs', 'modules'), { recursive: true })
