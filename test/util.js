import { fileURLToPath } from 'node:url'

export const FIL_WALLET_ADDRESS = '0x000000000000000000000000000000000000dEaD'

export const station = fileURLToPath(
  new URL('../bin/station.js', import.meta.url)
)
