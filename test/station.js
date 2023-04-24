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
      (await once(ps.stdout, 'data'))[0].toString().trim(),
      JSON.stringify({ totalJobsCompleted: 0, totalEarnings: '0' }, 0, 2)
    )
    ps.stderr.pipe(process.stderr)
    assert.match(
      (await once(ps.stdout, 'data'))[0].toString().trim(),
      /^\[.+\] INFO {2}Saturn Node will try to connect to the Saturn Orchestrator\.\.\.$/
    )
    ps.kill()
  })
  it('outputs events', async () => {
    const CACHE_ROOT = join(tmpdir(), randomUUID())
    const STATE_ROOT = join(tmpdir(), randomUUID())
    const ps = execa(
      station,
      [],
      { env: { CACHE_ROOT, STATE_ROOT, FIL_WALLET_ADDRESS } }
    )
    const events = []
    for await (const line of ps.stdout) {
      events.push(line.toString().trim())
      if (events.length === 2) break
    }
    ps.kill()
    assert.strictEqual(events[0], '{\n  "totalJobsCompleted": 0,\n  "totalEarnings": "0"\n}')
    assert.match(events[1], /^\[.+\] INFO {2}Saturn Node will try to connect to the Saturn Orchestrator\.\.\.$/)
  })
  it('outputs events json', async () => {
    const CACHE_ROOT = join(tmpdir(), randomUUID())
    const STATE_ROOT = join(tmpdir(), randomUUID())
    const ps = execa(
      station,
      ['--json'],
      { env: { CACHE_ROOT, STATE_ROOT, FIL_WALLET_ADDRESS } }
    )
    const events = []
    for await (const line of ps.stdout) {
      events.push(JSON.parse(line.toString()))
      if (events.length === 2) break
    }
    ps.kill()
    assert(events[1].timestamp)
    delete events[1].timestamp
    assert(events[1].id)
    delete events[1].id
    assert.deepStrictEqual(events, [
      { type: 'jobs-completed', total: 0 },
      {
        type: 'activity:info',
        module: 'Saturn',
        message: 'Saturn Node will try to connect to the Saturn Orchestrator...'
      }
    ])
  })
})
