#!/usr/bin/env node


const { FIL_WALLET_ADDRESS } = process.env

if (!FIL_WALLET_ADDRESS) {
  console.error('FIL_WALLET_ADDRESS required')
  process.exit(1)
}
