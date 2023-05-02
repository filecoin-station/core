import { execa } from 'execa'
import { station, FIL_WALLET_ADDRESS } from './util.js'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import streamMatch from 'stream-match'

describe('Station', () => {
  it('runs Saturn and Zinnia', async () => {
    const CACHE_ROOT = join(tmpdir(), randomUUID())
    const STATE_ROOT = join(tmpdir(), randomUUID())
    const ps = execa(
      station,
      { env: { CACHE_ROOT, STATE_ROOT, FIL_WALLET_ADDRESS } }
    )
    await Promise.all([
      streamMatch(ps.stdout, 'totalJobsCompleted'),
      streamMatch(ps.stdout, 'Module Runtime started'),
      streamMatch(ps.stdout, 'Saturn Node will try to connect')
    ])
    ps.kill()
  })
  it('runs experimental modules', () => {
    it('runs Bacalhau', async () => {
      const CACHE_ROOT = join(tmpdir(), randomUUID())
      const STATE_ROOT = join(tmpdir(), randomUUID())
      const ps = execa(
        station,
        ['--experimental'],
        { env: { CACHE_ROOT, STATE_ROOT, FIL_WALLET_ADDRESS } }
      )
      await streamMatch(ps.stdout, 'Bacalhau module started.')
      ps.kill()
    })
  })
  it('outputs events', async () => {
    const CACHE_ROOT = join(tmpdir(), randomUUID())
    const STATE_ROOT = join(tmpdir(), randomUUID())
    const ps = execa(
      station,
      [],
      { env: { CACHE_ROOT, STATE_ROOT, FIL_WALLET_ADDRESS } }
    )
    await Promise.all([
      streamMatch(ps.stdout, 'totalJobsCompleted'),
      streamMatch(ps.stdout, 'Module Runtime started'),
      streamMatch(ps.stdout, 'Saturn Node will try to connect')
    ])
    ps.kill()
  })
  it('outputs events json', async () => {
    const CACHE_ROOT = join(tmpdir(), randomUUID())
    const STATE_ROOT = join(tmpdir(), randomUUID())
    const ps = execa(
      station,
      ['--json'],
      { env: { CACHE_ROOT, STATE_ROOT, FIL_WALLET_ADDRESS } }
    )

    await Promise.all([
      streamMatch(ps.stdout, 'jobs-completed'),
      streamMatch(ps.stdout, /activity:info.*(Module Runtime started)/),
      streamMatch(ps.stdout, /activity:info.*(Saturn Node will try to connect)/)
    ])

    ps.kill()
  })
})
