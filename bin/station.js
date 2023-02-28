#!/usr/bin/env node

import assert from 'node:assert'

const { FIL_WALLET_ADDRESS } = process.env

assert(FIL_WALLET_ADDRESS, 'FIL_WALLET_ADDRESS required')
