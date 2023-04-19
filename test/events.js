import { execa } from 'execa'
import { station, FIL_WALLET_ADDRESS } from './util.js'
import { once } from 'node:events'
import { tmpdir } from 'node:os'
import assert from 'node:assert'
import { getPaths } from '../lib/paths.js'
import { randomUUID } from 'node:crypto'
import { join, dirname } from 'node:path'
import fs from 'node:fs/promises'

describe('Events', () => {
  it('read events', async () => {
    const CACHE_ROOT = join(tmpdir(), randomUUID())
    const STATE_ROOT = join(tmpdir(), randomUUID())
    await fs.mkdir(
      dirname(getPaths(CACHE_ROOT, STATE_ROOT).activity),
      { recursive: true }
    )
    await fs.writeFile(
      getPaths(CACHE_ROOT, STATE_ROOT).activity,
      '[3/14/2023, 10:38:14 AM] {"source":"Saturn","type":"info","message":"beep boop","id":"uuid"}\n'
    )
    const ps = execa(
      station,
      ['events'],
      { env: { CACHE_ROOT, STATE_ROOT } }
    )
    const events = []
    for await (const line of ps.stdout) {
      events.push(JSON.parse(line.toString()))
      if (events.length === 2) break
    }
    ps.kill()
    assert(events[1].timestamp)
    delete events[1].timestamp
    assert.deepStrictEqual(events, [
      { type: 'jobs-completed', total: 0 },
      {
        type: 'activity:info',
        module: 'Saturn',
        message: 'beep boop',
        id: 'uuid'
      }
    ])
  })
  it('can be read while station is running', async () => {
    const CACHE_ROOT = join(tmpdir(), randomUUID())
    const STATE_ROOT = join(tmpdir(), randomUUID())
    const stationPs = execa(
      station,
      { env: { CACHE_ROOT, STATE_ROOT, FIL_WALLET_ADDRESS } }
    )
    const eventsPs = execa(
      station,
      ['events'],
      { env: { CACHE_ROOT, STATE_ROOT } }
    )
    await Promise.all([
      once(stationPs.stdout, 'data'),
      once(eventsPs.stdout, 'data')
    ])
    stationPs.kill()
    eventsPs.kill()
  })
  it('doesn\'t block station from running', async () => {
    const CACHE_ROOT = join(tmpdir(), randomUUID())
    const STATE_ROOT = join(tmpdir(), randomUUID())
    const eventsPs = execa(
      station,
      ['events'],
      { env: { CACHE_ROOT, STATE_ROOT } }
    )
    const stationPs = execa(
      station,
      { env: { CACHE_ROOT, STATE_ROOT, FIL_WALLET_ADDRESS } }
    )
    await Promise.all([
      once(stationPs.stdout, 'data'),
      once(eventsPs.stdout, 'data')
    ])
    eventsPs.kill()
    stationPs.kill()
  })
})
