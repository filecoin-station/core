import { fileURLToPath } from 'node:url'

// From https://lotus.filecoin.io/lotus/manage/manage-fil/
export const FIL_WALLET_ADDRESS = 'f1abjxfbp274xpdqcpuaykwkfb43omjotacm2p3za'

export const station = fileURLToPath(
  new URL('../bin/station.js', import.meta.url)
)
