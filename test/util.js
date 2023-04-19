import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// From https://lotus.filecoin.io/lotus/manage/manage-fil/
export const FIL_WALLET_ADDRESS = 'f1abjxfbp274xpdqcpuaykwkfb43omjotacm2p3za'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const station = join(__dirname, '..', 'bin', 'station.js')
