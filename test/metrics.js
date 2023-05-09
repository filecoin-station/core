import { execa } from 'execa'
import { station, FIL_WALLET_ADDRESS } from './util.js'
import { once } from 'node:events'
import { tmpdir } from 'node:os'
import assert from 'node:assert'
import { getPaths } from '../lib/paths.js'
import { randomUUID } from 'node:crypto'
import { join, dirname } from 'node:path'
import fs from 'node:fs/promises'

describe('Metrics', () => {
  it('handles empty metrics', async () => {
    const cacheRoot = join(tmpdir(), randomUUID())
    const stateRoot = join(tmpdir(), randomUUID())
    const { stdout } = await execa(
      station,
      ['metrics'],
      { env: { CACHE_ROOT: cacheRoot, STATE_ROOT: stateRoot } }
    )
    assert.deepStrictEqual(
      stdout,
      JSON.stringify({ totalJobsCompleted: 0, totalEarnings: '0' }, 0, 2)
    )
  })
  it('outputs metrics', async () => {
    const cacheRoot = join(tmpdir(), randomUUID())
    const stateRoot = join(tmpdir(), randomUUID())
    await fs.mkdir(
      dirname(getPaths({ cacheRoot, stateRoot }).allMetrics),
      { recursive: true }
    )
    await fs.writeFile(
      getPaths({ cacheRoot, stateRoot }).allMetrics,
      '[date] {"totalJobsCompleted":1,"totalEarnings":"2"}\n'
    )
    const { stdout } = await execa(
      station,
      ['metrics'],
      { env: { CACHE_ROOT: cacheRoot, STATE_ROOT: stateRoot } }
    )
    assert.deepStrictEqual(
      stdout,
      JSON.stringify({ totalJobsCompleted: 1, totalEarnings: '2' }, 0, 2)
    )
  })
  it('outputs module metrics', async () => {
    const cacheRoot = join(tmpdir(), randomUUID())
    const stateRoot = join(tmpdir(), randomUUID())
    await fs.mkdir(
      getPaths({ cacheRoot, stateRoot }).metrics,
      { recursive: true }
    )
    await fs.writeFile(
      join(getPaths({ cacheRoot, stateRoot }).metrics, 'saturn-L2-node.log'),
      '[date] {"totalJobsCompleted":1,"totalEarnings":"2"}\n'
    )
    const { stdout } = await execa(
      station,
      ['metrics', 'saturn-L2-node'],
      { env: { CACHE_ROOT: cacheRoot, STATE_ROOT: stateRoot } }
    )
    assert.deepStrictEqual(
      stdout,
      JSON.stringify({ totalJobsCompleted: 1, totalEarnings: '2' }, 0, 2)
    )
  })

  describe('Follow', async () => {
    for (const flag of ['-f', '--follow']) {
      it(flag, async () => {
        const cacheRoot = join(tmpdir(), randomUUID())
        const stateRoot = join(tmpdir(), randomUUID())
        const ps = execa(
          station,
          ['metrics', flag],
          { env: { CACHE_ROOT: cacheRoot, STATE_ROOT: stateRoot } }
        )
        await once(ps.stdout, 'data')
        ps.kill()
      })
    }
  })

  it('can be read while station is running', async () => {
    const cacheRoot = join(tmpdir(), randomUUID())
    const stateRoot = join(tmpdir(), randomUUID())
    const ps = execa(
      station,
      { env: { CACHE_ROOT: cacheRoot, STATE_ROOT: stateRoot, FIL_WALLET_ADDRESS } }
    )
    await once(ps.stdout, 'data')
    const { stdout } = await execa(
      station,
      ['metrics'],
      { env: { CACHE_ROOT: cacheRoot, STATE_ROOT: stateRoot } }
    )
    const metrics = JSON.parse(stdout)
    assert.strictEqual(typeof metrics.totalJobsCompleted, 'number')
    assert.strictEqual(typeof metrics.totalEarnings, 'string')
    ps.kill()
  })
})
