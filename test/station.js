import { execa } from 'execa'
import { station, FIL_WALLET_ADDRESS } from './util.js'
import { once } from 'node:events'
import { tmpdir } from 'node:os'
import assert from 'node:assert'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'

describe('Station', () => {
  it('runs Saturn', async () => {
    const CACHE_ROOT = join(tmpdir(), randomUUID())
    const STATE_ROOT = join(tmpdir(), randomUUID())
    const ps = execa(
      station,
      { env: { CACHE_ROOT, STATE_ROOT, FIL_WALLET_ADDRESS } }
    )
    assert.strictEqual(
      (await once(ps.stdout, 'data'))[0].toString(),
      'Starting Saturn node...\n'
    )
    ps.stderr.pipe(process.stderr)
    assert.strictEqual(
      (await once(ps.stdout, 'data'))[0].toString(),
      '[SATURN] INFO: Saturn Node will try to connect to the Saturn Orchestrator...\n'
    )
    ps.kill()
  })
})
