import { randomUUID } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const FIL_WALLET_ADDRESS = '0x000000000000000000000000000000000000dEaD'
export const PASSPHRASE = 'secret'

export const checker = fileURLToPath(
  new URL('../bin/checker.js', import.meta.url)
)

export const getUniqueTempDir = () => {
  return join(tmpdir(), randomUUID())
}
