import test from 'test'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'
import assert from 'node:assert'
import { tmpdir } from 'node:os'
import fs from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { getPaths } from '../lib/paths.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const station = join(__dirname, '..', 'bin', 'station.js')

// From https://lotus.filecoin.io/lotus/manage/manage-fil/
const FIL_WALLET_ADDRESS = 'f1abjxfbp274xpdqcpuaykwkfb43omjotacm2p3za'

test('FIL_WALLET_ADDRESS', async t => {
  await t.test('require address', async t => {
    try {
      await execa(station)
    } catch (err) {
      return
    }
    assert.fail('should have thrown')
  })
  await t.test('with address', async t => {
    const ps = execa(station, { env: { FIL_WALLET_ADDRESS } })
    await once(ps.stdout, 'data')
    ps.kill()
  })
})

test('--version', async t => {
  await execa(station, ['--version'])
  await execa(station, ['-v'])
})

test('--help', async t => {
  await execa(station, ['--help'])
  await execa(station, ['-h'])
})

test('Storage', async t => {
  const XDG_STATE_HOME = join(tmpdir(), randomUUID())
  const ps = execa(station, {
    env: {
      FIL_WALLET_ADDRESS,
      XDG_STATE_HOME
    }
  })
  while (true) {
    await once(ps.stdout, 'data')
    try {
      await fs.stat(
        join(
          XDG_STATE_HOME, 'filecoin-station', 'logs', 'modules', 'saturn-L2-node.log'
        )
      )
      break
    } catch {}
  }
  ps.kill()
  await fs.stat(XDG_STATE_HOME, 'filecoin-station')
  await fs.stat(join(XDG_STATE_HOME, 'filecoin-station', 'modules'))
  await fs.stat(join(XDG_STATE_HOME, 'filecoin-station', 'logs'))
  await fs.stat(join(XDG_STATE_HOME, 'filecoin-station', 'logs', 'modules'))
})

test('Metrics', async t => {
  await t.test('No metrics', async t => {
    const XDG_STATE_HOME = join(tmpdir(), randomUUID())
    const { stdout } = await execa(
      station,
      ['metrics'],
      { env: { XDG_STATE_HOME } }
    )
    assert.strictEqual(
      stdout,
      JSON.stringify({ totalJobsCompleted: 0, totalEarnings: '0' }, 0, 2)
    )
  })
  await t.test('With metrics', async t => {
    const XDG_STATE_HOME = join(tmpdir(), randomUUID())
    await fs.mkdir(
      dirname(getPaths(XDG_STATE_HOME).metrics),
      { recursive: true }
    )
    await fs.writeFile(
      getPaths(XDG_STATE_HOME).metrics,
      '[date] {"totalJobsCompleted":1,"totalEarnings":"2"}\n'
    )
    const { stdout } = await execa(
      station,
      ['metrics'],
      { env: { XDG_STATE_HOME } }
    )
    assert.strictEqual(
      stdout,
      JSON.stringify({ totalJobsCompleted: 1, totalEarnings: '2' }, 0, 2)
    )
  })

  await t.test('Follow', async t => {
    for (const flag of ['-f', '--follow']) {
      const XDG_STATE_HOME = join(tmpdir(), randomUUID())
      const ps = execa(station, ['metrics', flag], { env: { XDG_STATE_HOME } })
      await once(ps.stdout, 'data')
      ps.kill()
    }
  })
})

test('Logs', async t => {
  await t.test('No logs', async t => {
    const XDG_STATE_HOME = join(tmpdir(), randomUUID())
    const { stdout } = await execa(
      station,
      ['logs'],
      { env: { XDG_STATE_HOME } }
    )
    assert.strictEqual(stdout, '')
  })
  await t.test('With logs', async t => {
    const XDG_STATE_HOME = join(tmpdir(), randomUUID())
    await fs.mkdir(getPaths(XDG_STATE_HOME).moduleLogs, { recursive: true })
    await fs.writeFile(getPaths(XDG_STATE_HOME).allLogs, '[date] beep boop\n')
    const { stdout } = await execa(
      station,
      ['logs'],
      { env: { XDG_STATE_HOME } }
    )
    assert.strictEqual(
      stdout,
      '[date] beep boop'
    )
  })

  await t.test('Follow', async t => {
    for (const flag of ['-f', '--follow']) {
      const XDG_STATE_HOME = join(tmpdir(), randomUUID())
      await fs.mkdir(getPaths(XDG_STATE_HOME).moduleLogs, { recursive: true })
      const ps = execa(station, ['logs', flag], { env: { XDG_STATE_HOME } })
      const [data] = await Promise.all([
        once(ps.stdout, 'data'),
        fs.writeFile(getPaths(XDG_STATE_HOME).allLogs, '[date] beep boop\n')
      ])
      assert.strictEqual(data.toString(), '[date] beep boop\n')
      ps.kill()
    }
  })
})

test('Update modules', async t => {
  await execa(join(__dirname, '..', 'scripts', 'update-modules.js'))
})
