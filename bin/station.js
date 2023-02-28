#!/usr/bin/env node

import { join } from 'node:path'
import { homedir } from 'node:os'

const {
  FIL_WALLET_ADDRESS,
  ROOT = join(homedir(), '.station')
} = process.env

if (!FIL_WALLET_ADDRESS) {
  console.error('FIL_WALLET_ADDRESS required')
  process.exit(1)
}

console.log({ ROOT })
