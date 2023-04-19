import { execa } from 'execa'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import assert from 'node:assert'
import { station, FIL_WALLET_ADDRESS } from './util.js'
import { join } from 'node:path'

describe('Lockfile', () => {
  it('prevents multiple instances from running', async () => {
    const CACHE_ROOT = join(tmpdir(), randomUUID())
    const STATE_ROOT = join(tmpdir(), randomUUID())
    const ps = execa(
      station,
      { env: { CACHE_ROOT, STATE_ROOT, FIL_WALLET_ADDRESS } }
    )
    await once(ps.stdout, 'data')
    try {
      await assert.rejects(
        execa(station, { env: { CACHE_ROOT, STATE_ROOT, FIL_WALLET_ADDRESS } }),
        err => {
          assert.strictEqual(err.exitCode, 1)
          assert.match(err.stderr, /is already running/)
          return true
        }
      )
    } finally {
      ps.kill()
    }
  })
})
