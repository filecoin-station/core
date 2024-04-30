import { execa } from 'execa'
import { station, FIL_WALLET_ADDRESS, PASSPHRASE } from './util.js'
import { once } from 'node:events'
import { tmpdir } from 'node:os'
import fs from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'

describe('Storage', async () => {
  it('creates files', async () => {
    const CACHE_ROOT = join(tmpdir(), randomUUID())
    const STATE_ROOT = join(tmpdir(), randomUUID())
    const ps = execa(
      station,
      { env: { CACHE_ROOT, STATE_ROOT, FIL_WALLET_ADDRESS, PASSPHRASE } }
    )
    while (true) {
      await once(ps.stdout, 'data')
      try {
        await fs.stat(CACHE_ROOT)
        break
      } catch {}
    }
    ps.kill()
    await fs.stat(join(CACHE_ROOT, 'modules'))
    await fs.stat(STATE_ROOT)
    await fs.stat(join(STATE_ROOT, 'modules'))
  })
})
