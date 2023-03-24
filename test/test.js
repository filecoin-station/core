import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'
import { tmpdir } from 'node:os'
import fs from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { getPaths } from '../lib/paths.js'
import assert from 'node:assert'

const __dirname = dirname(fileURLToPath(import.meta.url))
const station = join(__dirname, '..', 'bin', 'station.js')

// From https://lotus.filecoin.io/lotus/manage/manage-fil/
const FIL_WALLET_ADDRESS = 'f1abjxfbp274xpdqcpuaykwkfb43omjotacm2p3za'

describe('FIL_WALLET_ADDRESS', () => {
  it('fails without address', async () => {
    try {
      await execa(station)
    } catch (err) {
      return
    }
    throw new Error('should have thrown')
  })
  it('works with address', async () => {
    const ps = execa(station, { env: { FIL_WALLET_ADDRESS } })
    await once(ps.stdout, 'data')
    ps.kill()
  })
})

describe('--version', () => {
  it('outputs version', async () => {
    await execa(station, ['--version'])
    await execa(station, ['-v'])
  })
})

describe('--help', () => {
  it('outputs help text', async () => {
    await execa(station, ['--help'])
    await execa(station, ['-h'])
  })
})

describe('Storage', async () => {
  it('creates files', async () => {
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
        await fs.stat(join(
          XDG_STATE_HOME,
          'filecoin-station',
          'logs',
          'modules',
          'saturn-L2-node.log'
        ))
        break
      } catch {}
    }
    ps.kill()
    await fs.stat(XDG_STATE_HOME, 'filecoin-station')
    await fs.stat(join(XDG_STATE_HOME, 'filecoin-station', 'modules'))
    await fs.stat(join(XDG_STATE_HOME, 'filecoin-station', 'logs'))
    await fs.stat(join(XDG_STATE_HOME, 'filecoin-station', 'logs', 'modules'))
  })
})

describe('Metrics', () => {
  it('handles empty metrics', async () => {
    const XDG_STATE_HOME = join(tmpdir(), randomUUID())
    const { stdout } = await execa(
      station,
      ['metrics'],
      { env: { XDG_STATE_HOME } }
    )
    assert.deepStrictEqual(
      stdout,
      JSON.stringify({ totalJobsCompleted: 0, totalEarnings: '0' }, 0, 2)
    )
  })
  it('outputs metrics', async () => {
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
    assert.deepStrictEqual(
      stdout,
      JSON.stringify({ totalJobsCompleted: 1, totalEarnings: '2' }, 0, 2)
    )
  })

  describe('Follow', async () => {
    for (const flag of ['-f', '--follow']) {
      it(flag, async () => {
        const XDG_STATE_HOME = join(tmpdir(), randomUUID())
        const ps = execa(station, ['metrics', flag], { env: { XDG_STATE_HOME } })
        await once(ps.stdout, 'data')
        ps.kill()
      })
    }
  })

  it('can be read while station is running', async () => {
    const XDG_STATE_HOME = join(tmpdir(), randomUUID())
    const ps = execa(station, { env: { XDG_STATE_HOME, FIL_WALLET_ADDRESS } })
    await once(ps.stdout, 'data')
    const { stdout } = await execa(
      station,
      ['metrics'],
      { env: { XDG_STATE_HOME } }
    )
    assert.deepStrictEqual(
      stdout,
      JSON.stringify({ totalJobsCompleted: 0, totalEarnings: '0' }, 0, 2)
    )
    ps.kill()
  })
})

describe('Logs', () => {
  it('handles no logs', async () => {
    const XDG_STATE_HOME = join(tmpdir(), randomUUID())
    const { stdout } = await execa(
      station,
      ['logs'],
      { env: { XDG_STATE_HOME } }
    )
    assert.strictEqual(stdout, '')
  })
  it('outputs logs', async () => {
    const XDG_STATE_HOME = join(tmpdir(), randomUUID())
    await fs.mkdir(getPaths(XDG_STATE_HOME).moduleLogs, { recursive: true })
    await fs.writeFile(getPaths(XDG_STATE_HOME).allLogs, '[date] beep boop\n')
    const { stdout } = await execa(
      station,
      ['logs'],
      { env: { XDG_STATE_HOME } }
    )
    assert.strictEqual(stdout, '[date] beep boop')
  })

  describe('Follow', () => {
    it('reads logs', async () => {
      for (const flag of ['-f', '--follow']) {
        it(flag, async () => {
          const XDG_STATE_HOME = join(tmpdir(), randomUUID())
          await fs.mkdir(
            getPaths(XDG_STATE_HOME).moduleLogs,
            { recursive: true }
          )
          const ps = execa(station, ['logs', flag], { env: { XDG_STATE_HOME } })
          const [data] = await Promise.all([
            once(ps.stdout, 'data'),
            fs.writeFile(getPaths(XDG_STATE_HOME).allLogs, '[date] beep boop\n')
          ])
          assert.strictEqual(data.toString(), '[date] beep boop\n')
          ps.kill()
        })
      }
    })
    it('doesn\'t block station from running', async () => {
      const XDG_STATE_HOME = join(tmpdir(), randomUUID())
      const logsPs = execa(
        station,
        ['logs', '--follow'],
        { env: { XDG_STATE_HOME } }
      )
      const stationPs = execa(
        station,
        { env: { XDG_STATE_HOME, FIL_WALLET_ADDRESS } }
      )
      await Promise.all([
        once(stationPs.stdout, 'data'),
        once(logsPs.stdout, 'data')
      ])
      logsPs.kill()
      stationPs.kill()
    })
  })

  it('can be read while station is running', async () => {
    const XDG_STATE_HOME = join(tmpdir(), randomUUID())
    const ps = execa(station, { env: { XDG_STATE_HOME, FIL_WALLET_ADDRESS } })
    await once(ps.stdout, 'data')
    const { stdout } = await execa(
      station,
      ['logs'],
      { env: { XDG_STATE_HOME } }
    )
    ps.kill()
    assert(stdout)
  })
})

describe('Activity', () => {
  it('handles no activity', async () => {
    const XDG_STATE_HOME = join(tmpdir(), randomUUID())
    const { stdout } = await execa(
      station,
      ['activity'],
      { env: { XDG_STATE_HOME } }
    )
    assert.strictEqual(stdout, '')
  })
  it('outputs activity', async () => {
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
    assert.match(stdout, /3\/14\/2023/)
    assert.match(stdout, /beep boop/)
  })

  describe('Follow', () => {
    it('reads activity', async () => {
      for (const flag of ['-f', '--follow']) {
        it(flag, async () => {
          const XDG_STATE_HOME = join(tmpdir(), randomUUID())
          await fs.mkdir(
            dirname(getPaths(XDG_STATE_HOME).activity),
            { recursive: true }
          )
          const ps = execa(
            station,
            ['activity', flag],
            { env: { XDG_STATE_HOME } }
          )
          const [data] = await Promise.all([
            once(ps.stdout, 'data'),
            fs.writeFile(
              getPaths(XDG_STATE_HOME).activity,
              '[3/14/2023, 10:38:14 AM] {"source":"Saturn","type":"info","message":"beep boop"}\n'
            )
          ])
          assert.match(data.toString(), '3/14/2023')
          assert.match(data.toString(), 'beep boop')
          ps.kill()
        })
      }
    })
    it('doesn\'t block station from running', async () => {
      const XDG_STATE_HOME = join(tmpdir(), randomUUID())
      const activityPs = execa(
        station,
        ['activity', '--follow'],
        { env: { XDG_STATE_HOME } }
      )
      const stationPs = execa(
        station,
        { env: { XDG_STATE_HOME, FIL_WALLET_ADDRESS } }
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
    const XDG_STATE_HOME = join(tmpdir(), randomUUID())
    const ps = execa(station, { env: { XDG_STATE_HOME, FIL_WALLET_ADDRESS } })
    await once(ps.stdout, 'data')
    const { stdout } = await execa(
      station,
      ['activity'],
      { env: { XDG_STATE_HOME } }
    )
    assert(stdout)
    ps.kill()
  })
})

describe('Events', () => {
  it('read events', async () => {
    const XDG_STATE_HOME = join(tmpdir(), randomUUID())
    await fs.mkdir(
      dirname(getPaths(XDG_STATE_HOME).activity),
      { recursive: true }
    )
    await fs.writeFile(
      getPaths(XDG_STATE_HOME).activity,
      '[3/14/2023, 10:38:14 AM] {"source":"Saturn","type":"info","message":"beep boop"}\n'
    )
    const ps = execa(
      station,
      ['events'],
      { env: { XDG_STATE_HOME } }
    )
    const events = []
    for await (const line of ps.stdout) {
      events.push(JSON.parse(line.toString()))
      if (events.length === 2) break
    }
    ps.kill()
    assert.deepStrictEqual(events, [
      { type: 'jobs-completed', total: 0 },
      { type: 'activity:info', module: 'Saturn', message: 'beep boop' }
    ])
  })
  it('can be read while station is running', async () => {
    const XDG_STATE_HOME = join(tmpdir(), randomUUID())
    const stationPs = execa(
      station,
      { env: { XDG_STATE_HOME, FIL_WALLET_ADDRESS } }
    )
    const eventsPs = execa(
      station,
      ['events'],
      { env: { XDG_STATE_HOME } }
    )
    await Promise.all([
      once(stationPs.stdout, 'data'),
      once(eventsPs.stdout, 'data')
    ])
    stationPs.kill()
    eventsPs.kill()
  })
  it('doesn\'t block station from running', async () => {
    const XDG_STATE_HOME = join(tmpdir(), randomUUID())
    const eventsPs = execa(station, ['events'], { env: { XDG_STATE_HOME } })
    const stationPs = execa(
      station,
      { env: { XDG_STATE_HOME, FIL_WALLET_ADDRESS } }
    )
    await Promise.all([
      once(stationPs.stdout, 'data'),
      once(eventsPs.stdout, 'data')
    ])
    eventsPs.kill()
    stationPs.kill()
  })
})

describe('Lockfile', () => {
  it('prevents multiple instances from running', async () => {
    const XDG_STATE_HOME = join(tmpdir(), randomUUID())
    const ps = execa(station, { env: { XDG_STATE_HOME, FIL_WALLET_ADDRESS } })
    await once(ps.stdout, 'data')
    try {
      await execa(station, { env: { XDG_STATE_HOME, FIL_WALLET_ADDRESS } })
    } catch (err) {
      assert.strictEqual(err.exitCode, 1)
      assert.match(err.stderr, /is already running/)
      return
    } finally {
      ps.kill()
    }
    throw new Error('did not throw')
  })
})

// describe('Scripts', () => {
//   it('updates modules', async () => {
//     await execa(join(__dirname, '..', 'scripts', 'update-modules.js'))
//   })
// })
