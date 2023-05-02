import { execa } from 'execa'
import { station, FIL_WALLET_ADDRESS } from './util.js'
import { once } from 'node:events'
import { tmpdir } from 'node:os'
import assert from 'node:assert'
import { getPaths } from '../lib/paths.js'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import fs from 'node:fs/promises'

describe('Logs', () => {
  it('handles no logs', async () => {
    const cacheRoot = join(tmpdir(), randomUUID())
    const stateRoot = join(tmpdir(), randomUUID())
    const { stdout } = await execa(
      station,
      ['logs'],
      { env: { CACHE_ROOT: cacheRoot, STATE_ROOT: stateRoot } }
    )
    assert.strictEqual(stdout, '')
  })
  it('outputs logs', async () => {
    const cacheRoot = join(tmpdir(), randomUUID())
    const stateRoot = join(tmpdir(), randomUUID())
    await fs.mkdir(
      getPaths({ cacheRoot, stateRoot }).moduleLogs,
      { recursive: true }
    )
    await fs.writeFile(
      getPaths({ cacheRoot, stateRoot }).allLogs,
      '[2023-04-26T12:42:23.562Z] beep boop\n'
    )
    const { stdout } = await execa(
      station,
      ['logs'],
      { env: { CACHE_ROOT: cacheRoot, STATE_ROOT: stateRoot } }
    )
    assert.match(stdout, /2023/)
    assert.match(stdout, /beep boop/)
  })

  describe('Follow', () => {
    it('reads logs', async () => {
      for (const flag of ['-f', '--follow']) {
        it(flag, async () => {
          const cacheRoot = join(tmpdir(), randomUUID())
          const stateRoot = join(tmpdir(), randomUUID())
          await fs.mkdir(
            getPaths({ cacheRoot, stateRoot }).moduleLogs,
            { recursive: true }
          )
          const ps = execa(
            station,
            ['logs', flag],
            { env: { CACHE_ROOT: cacheRoot, STATE_ROOT: stateRoot } }
          )
          const [data] = await Promise.all([
            once(ps.stdout, 'data'),
            fs.writeFile(
              getPaths({ cacheRoot, stateRoot }).allLogs,
              '[2023-04-26T12:42:23.562Z] beep boop\n'
            )
          ])
          assert.match(data.toString(), /2023/)
          assert.match(data.toString(), /beep boop/)
          ps.kill()
        })
      }
    })
    it('doesn\'t block station from running', async function () {
      this.timeout(20_000)
      const cacheRoot = join(tmpdir(), randomUUID())
      const stateRoot = join(tmpdir(), randomUUID())
      const logsPs = execa(
        station,
        ['logs', '--follow'],
        { env: { CACHE_ROOT: cacheRoot, STATE_ROOT: stateRoot } }
      )
      const stationPs = execa(
        station,
        { env: { CACHE_ROOT: cacheRoot, STATE_ROOT: stateRoot, FIL_WALLET_ADDRESS } }
      )
      await Promise.all([
        once(stationPs.stdout, 'data'),
        once(logsPs.stdout, 'data')
      ])
      logsPs.kill()
      stationPs.kill()
    })
  })

  it('can be read while station is running', async function () {
    this.timeout(5_000)
    const cacheRoot = join(tmpdir(), randomUUID())
    const stateRoot = join(tmpdir(), randomUUID())
    const ps = execa(
      station,
      { env: { CACHE_ROOT: cacheRoot, STATE_ROOT: stateRoot, FIL_WALLET_ADDRESS } }
    )
    await once(ps.stdout, 'data')
    const { stdout } = await execa(
      station,
      ['logs'],
      { env: { CACHE_ROOT: cacheRoot, STATE_ROOT: stateRoot } }
    )
    ps.kill()
    assert(stdout)
  })
})
