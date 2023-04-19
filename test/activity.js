import { execa } from 'execa'
import { station, FIL_WALLET_ADDRESS } from './util.js'
import { once } from 'node:events'
import { tmpdir } from 'node:os'
import assert from 'node:assert'
import { getPaths } from '../lib/paths.js'
import { randomUUID } from 'node:crypto'
import { join, dirname } from 'node:path'
import fs from 'node:fs/promises'

describe('Activity', () => {
  it('handles no activity', async () => {
    const CACHE_ROOT = join(tmpdir(), randomUUID())
    const STATE_ROOT = join(tmpdir(), randomUUID())
    const { stdout } = await execa(
      station,
      ['activity'],
      { env: { CACHE_ROOT, STATE_ROOT } }
    )
    assert.strictEqual(stdout, '')
  })
  it('outputs activity', async () => {
    const CACHE_ROOT = join(tmpdir(), randomUUID())
    const STATE_ROOT = join(tmpdir(), randomUUID())
    await fs.mkdir(
      dirname(getPaths(CACHE_ROOT, STATE_ROOT).activity),
      { recursive: true }
    )
    await fs.writeFile(
      getPaths(CACHE_ROOT, STATE_ROOT).activity,
      '[3/14/2023, 10:38:14 AM] {"source":"Saturn","type":"info","message":"beep boop"}\n'
    )
    const { stdout } = await execa(
      station,
      ['activity'],
      { env: { CACHE_ROOT, STATE_ROOT } }
    )
    assert.match(stdout, /3\/14\/2023/)
    assert.match(stdout, /beep boop/)
  })
  it('outputs activity json', async () => {
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
    const { stdout } = await execa(
      station,
      ['activity', '--json'],
      { env: { CACHE_ROOT, STATE_ROOT } }
    )
    const activity = JSON.parse(stdout)
    assert(activity[0].timestamp)
    assert.equal(activity.length, 1)
    assert.equal(activity[0].source, 'Saturn')
    assert.equal(activity[0].type, 'info')
    assert.equal(activity[0].message, 'beep boop')
    assert.equal(activity[0].id, 'uuid')
  })

  describe('Follow', () => {
    it('reads activity', async () => {
      for (const flag of ['-f', '--follow']) {
        it(flag, async () => {
          const CACHE_ROOT = join(tmpdir(), randomUUID())
          const STATE_ROOT = join(tmpdir(), randomUUID())
          await fs.mkdir(
            dirname(getPaths(CACHE_ROOT, STATE_ROOT).activity),
            { recursive: true }
          )
          const ps = execa(
            station,
            ['activity', flag],
            { env: { CACHE_ROOT, STATE_ROOT } }
          )
          const [data] = await Promise.all([
            once(ps.stdout, 'data'),
            fs.writeFile(
              getPaths(CACHE_ROOT, STATE_ROOT).activity,
              '[3/14/2023, 10:38:14 AM] {"source":"Saturn","type":"info","message":"beep boop"}\n'
            )
          ])
          assert.match(data.toString(), '3/14/2023')
          assert.match(data.toString(), 'beep boop')
          ps.kill()
        })
      }
    })
    it('outputs json', async () => {
      const CACHE_ROOT = join(tmpdir(), randomUUID())
      const STATE_ROOT = join(tmpdir(), randomUUID())
      await fs.mkdir(
        dirname(getPaths(CACHE_ROOT, STATE_ROOT).activity),
        { recursive: true }
      )
      const ps = execa(
        station,
        ['activity', '--follow', '--json'],
        { env: { CACHE_ROOT, STATE_ROOT } }
      )
      const [data] = await Promise.all([
        once(ps.stdout, 'data'),
        fs.writeFile(
          getPaths(CACHE_ROOT, STATE_ROOT).activity,
          '[3/14/2023, 10:38:14 AM] {"source":"Saturn","type":"info","message":"beep boop","id":"uuid"}\n'
        )
      ])
      const activity = JSON.parse(data.toString())
      assert(activity.timestamp)
      assert.equal(activity.source, 'Saturn')
      assert.equal(activity.type, 'info')
      assert.equal(activity.message, 'beep boop')
      assert.equal(activity.id, 'uuid')
      ps.kill()
    })
    it('doesn\'t block station from running', async function () {
      this.timeout(20_000)
      const CACHE_ROOT = join(tmpdir(), randomUUID())
      const STATE_ROOT = join(tmpdir(), randomUUID())
      const activityPs = execa(
        station,
        ['activity', '--follow'],
        { env: { CACHE_ROOT, STATE_ROOT } }
      )
      const stationPs = execa(
        station,
        { env: { CACHE_ROOT, STATE_ROOT, FIL_WALLET_ADDRESS } }
      )
      await Promise.all([
        once(stationPs.stdout, 'data'),
        once(activityPs.stdout, 'data')
      ])
      activityPs.kill()
      stationPs.kill()
    })
  })

  it('can be read while station is running', async () => {
    const CACHE_ROOT = join(tmpdir(), randomUUID())
    const STATE_ROOT = join(tmpdir(), randomUUID())
    const ps = execa(
      station,
      { env: { CACHE_ROOT, STATE_ROOT, FIL_WALLET_ADDRESS } }
    )
    await once(ps.stdout, 'data')
    const { stdout } = await execa(
      station,
      ['activity'],
      { env: { CACHE_ROOT, STATE_ROOT } }
    )
    assert(stdout)
    ps.kill()
  })
})
