import { test } from 'tap'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'
import { tmpdir } from 'node:os'
import fs from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { getPaths } from '../lib/paths.js'
import fetch from 'node-fetch'
import getPort from 'get-port'

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
    t.fail('should have thrown')
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
    t.equal(
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
    t.equal(
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
    t.equal(stdout, '')
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
    t.equal(
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
      t.equal(data.toString(), '[date] beep boop\n')
      ps.kill()
    }
  })
})

test('Activity', async t => {
  await t.test('No activity', async t => {
    const XDG_STATE_HOME = join(tmpdir(), randomUUID())
    const { stdout } = await execa(
      station,
      ['activity'],
      { env: { XDG_STATE_HOME } }
    )
    t.equal(stdout, '')
  })
  await t.test('With activity', async t => {
    const XDG_STATE_HOME = join(tmpdir(), randomUUID())
    await fs.mkdir(
      dirname(getPaths(XDG_STATE_HOME).activity),
      { recursive: true }
    )
    await fs.writeFile(
      getPaths(XDG_STATE_HOME).activity,
      '[3/14/2023, 10:38:14 AM] {"source":"Saturn","type":"info","message":"beep boop"}\n'
    )
    const { stdout } = await execa(
      station,
      ['activity'],
      { env: { XDG_STATE_HOME } }
    )
    t.equal(
      stdout,
      '[3/14/2023, 10:38:14 AM] INFO  beep boop'
    )
  })

  await t.test('Follow', async t => {
    for (const flag of ['-f', '--follow']) {
      const XDG_STATE_HOME = join(tmpdir(), randomUUID())
      await fs.mkdir(
        dirname(getPaths(XDG_STATE_HOME).activity),
        { recursive: true }
      )
      const ps = execa(station, ['activity', flag], { env: { XDG_STATE_HOME } })
      const [data] = await Promise.all([
        once(ps.stdout, 'data'),
        fs.writeFile(
          getPaths(XDG_STATE_HOME).activity,
          '[3/14/2023, 10:38:14 AM] {"source":"Saturn","type":"info","message":"beep boop"}\n'
        )
      ])
      t.equal(data.toString(), '[3/14/2023, 10:38:14 AM] INFO  beep boop\n')
      ps.kill()
    }
  })
})

test('Lockfile', async t => {
  const XDG_STATE_HOME = join(tmpdir(), randomUUID())
  const ps = execa(station, { env: { XDG_STATE_HOME, FIL_WALLET_ADDRESS } })
  await once(ps.stdout, 'data')
  try {
    await execa(station, { env: { XDG_STATE_HOME, FIL_WALLET_ADDRESS } })
  } catch (err) {
    t.equal(err.exitCode, 1)
    t.match(err.stderr, /is already running/)
    return
  } finally {
    ps.kill()
  }
  throw new Error('did not throw')
})

test('HTTP API', async t => {
  await t.test('Default port', async t => {
    const XDG_STATE_HOME = join(tmpdir(), randomUUID())
    const ps = execa(
      station,
      ['--listen'],
      { env: { XDG_STATE_HOME, FIL_WALLET_ADDRESS } }
    )
    await once(ps.stdout, 'data')
    const res = await fetch('http://127.0.0.1:7834')
    t.equal(res.status, 404)
    ps.kill()
  })
  await t.test('Custom port', async t => {
    const XDG_STATE_HOME = join(tmpdir(), randomUUID())
    const port = await getPort()
    const ps = execa(
      station,
      ['--listen', `--port=${port}`],
      { env: { XDG_STATE_HOME, FIL_WALLET_ADDRESS } }
    )
    await once(ps.stdout, 'data')
    const res = await fetch(`http://127.0.0.1:${port}`)
    t.equal(res.status, 404)
    ps.kill()
  })
})

test('Update modules', async t => {
  await execa(join(__dirname, '..', 'scripts', 'update-modules.js'))
})
