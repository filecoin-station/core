import { fileURLToPath } from 'node:url'

export const FIL_WALLET_ADDRESS = 'f410fhgyuvi4k35wnqkvtdpewptt2oihbchvy5bdlmxy'

export const station = fileURLToPath(
  new URL('../bin/station.js', import.meta.url)
)
