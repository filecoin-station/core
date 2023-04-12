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
    await assert.rejects(execa(station))
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
    const CACHE_ROOT = join(tmpdir(), randomUUID())
    const STATE_ROOT = join(tmpdir(), randomUUID())
    const ps = execa(
      station,
      { env: { CACHE_ROOT, STATE_ROOT, FIL_WALLET_ADDRESS } }
    )
    while (true) {
      await once(ps.stdout, 'data')
      try {
        await fs.stat(
          join(
            STATE_ROOT, 'logs', 'modules', 'saturn-L2-node.log'
          )
        )
        break
      } catch {}
    }
    ps.kill()
    await fs.stat(CACHE_ROOT)
    await fs.stat(join(CACHE_ROOT, 'modules'))
    await fs.stat(STATE_ROOT)
    await fs.stat(join(STATE_ROOT, 'modules'))
    await fs.stat(join(STATE_ROOT, 'logs'))
    await fs.stat(join(STATE_ROOT, 'logs', 'modules'))
  })
})

describe('Station', () => {
  it('runs Saturn', async () => {
    const CACHE_ROOT = join(tmpdir(), randomUUID())
    const STATE_ROOT = join(tmpdir(), randomUUID())
    const ps = execa(
      station,
      { env: { CACHE_ROOT, STATE_ROOT, FIL_WALLET_ADDRESS } }
    )
    try {
      assert.strictEqual(
        (await once(ps.stdout, 'data'))[0].toString(),
        'Starting Saturn node...\n'
      )
      ps.stderr.pipe(process.stderr)
      assert.strictEqual(
        (await once(ps.stdout, 'data'))[0].toString(),
        '[SATURN] INFO: Saturn Node will try to connect to the Saturn Orchestrator...\n'
      )
    } finally {
      ps.kill()
    }
  })
})

describe('Metrics', () => {
  it('handles empty metrics', async () => {
    const CACHE_ROOT = join(tmpdir(), randomUUID())
    const STATE_ROOT = join(tmpdir(), randomUUID())
    const { stdout } = await execa(
      station,
      ['metrics'],
      { env: { CACHE_ROOT, STATE_ROOT } }
    )
    assert.deepStrictEqual(
      stdout,
      JSON.stringify({ totalJobsCompleted: 0, totalEarnings: '0' }, 0, 2)
    )
  })
  it('outputs metrics', async () => {
    const CACHE_ROOT = join(tmpdir(), randomUUID())
    const STATE_ROOT = join(tmpdir(), randomUUID())
    await fs.mkdir(
      dirname(getPaths(CACHE_ROOT, STATE_ROOT).metrics),
      { recursive: true }
    )
    await fs.writeFile(
      getPaths(CACHE_ROOT, STATE_ROOT).metrics,
      '[date] {"totalJobsCompleted":1,"totalEarnings":"2"}\n'
    )
    const { stdout } = await execa(
      station,
      ['metrics'],
      { env: { CACHE_ROOT, STATE_ROOT } }
    )
    assert.deepStrictEqual(
      stdout,
      JSON.stringify({ totalJobsCompleted: 1, totalEarnings: '2' }, 0, 2)
    )
  })

  describe('Follow', async () => {
    for (const flag of ['-f', '--follow']) {
      it(flag, async () => {
        const CACHE_ROOT = join(tmpdir(), randomUUID())
        const STATE_ROOT = join(tmpdir(), randomUUID())
        const ps = execa(
          station,
          ['metrics', flag],
          { env: { CACHE_ROOT, STATE_ROOT } }
        )
        await once(ps.stdout, 'data')
        ps.kill()
      })
    }
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
      ['metrics'],
      { env: { CACHE_ROOT, STATE_ROOT } }
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
    const CACHE_ROOT = join(tmpdir(), randomUUID())
    const STATE_ROOT = join(tmpdir(), randomUUID())
    const { stdout } = await execa(
      station,
      ['logs'],
      { env: { CACHE_ROOT, STATE_ROOT } }
    )
    assert.strictEqual(stdout, '')
  })
  it('outputs logs', async () => {
    const CACHE_ROOT = join(tmpdir(), randomUUID())
    const STATE_ROOT = join(tmpdir(), randomUUID())
    await fs.mkdir(
      getPaths(CACHE_ROOT, STATE_ROOT).moduleLogs,
      { recursive: true }
    )
    await fs.writeFile(
      getPaths(CACHE_ROOT, STATE_ROOT).allLogs,
      '[date] beep boop\n'
    )
    const { stdout } = await execa(
      station,
      ['logs'],
      { env: { CACHE_ROOT, STATE_ROOT } }
    )
    assert.strictEqual(stdout, '[date] beep boop')
  })

  describe('Follow', () => {
    it('reads logs', async () => {
      for (const flag of ['-f', '--follow']) {
        it(flag, async () => {
          const CACHE_ROOT = join(tmpdir(), randomUUID())
          const STATE_ROOT = join(tmpdir(), randomUUID())
          await fs.mkdir(
            getPaths(CACHE_ROOT, STATE_ROOT).moduleLogs,
            { recursive: true }
          )
          const ps = execa(
            station,
            ['logs', flag],
            { env: { CACHE_ROOT, STATE_ROOT } }
          )
          const [data] = await Promise.all([
            once(ps.stdout, 'data'),
            fs.writeFile(
              getPaths(CACHE_ROOT, STATE_ROOT).allLogs,
              '[date] beep boop\n'
            )
          ])
          assert.strictEqual(data.toString(), '[date] beep boop\n')
          ps.kill()
        })
      }
    })
    it('doesn\'t block station from running', async function () {
      this.timeout(20_000)
      const CACHE_ROOT = join(tmpdir(), randomUUID())
      const STATE_ROOT = join(tmpdir(), randomUUID())
      const logsPs = execa(
        station,
        ['logs', '--follow'],
        { env: { CACHE_ROOT, STATE_ROOT } }
      )
      const stationPs = execa(
        station,
        { env: { CACHE_ROOT, STATE_ROOT, FIL_WALLET_ADDRESS } }
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
    const CACHE_ROOT = join(tmpdir(), randomUUID())
    const STATE_ROOT = join(tmpdir(), randomUUID())
    const ps = execa(
      station,
      { env: { CACHE_ROOT, STATE_ROOT, FIL_WALLET_ADDRESS } }
    )
    await once(ps.stdout, 'data')
    const { stdout } = await execa(
      station,
      ['logs'],
      { env: { CACHE_ROOT, STATE_ROOT } }
    )
    ps.kill()
    assert(stdout)
  })
})

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
      '[3/14/2023, 10:38:14 AM] {"source":"Saturn","type":"info","message":"beep boop"}\n'
    )
    const { stdout } = await execa(
      station,
      ['activity', '--json'],
      { env: { CACHE_ROOT, STATE_ROOT } }
    )
    const activity = JSON.parse(stdout)
    assert(activity[0].date)
    assert.equal(activity.length, 1)
    assert.equal(activity[0].source, 'Saturn')
    assert.equal(activity[0].type, 'info')
    assert.equal(activity[0].message, 'beep boop')
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
          '[3/14/2023, 10:38:14 AM] {"source":"Saturn","type":"info","message":"beep boop"}\n'
        )
      ])
      const activity = JSON.parse(data.toString())
      assert(activity.date)
      assert.equal(activity.source, 'Saturn')
      assert.equal(activity.type, 'info')
      assert.equal(activity.message, 'beep boop')
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
      '[3/14/2023, 10:38:14 AM] {"source":"Saturn","type":"info","message":"beep boop"}\n'
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
    assert(events[1].date)
    delete events[1].date
    assert.deepStrictEqual(events, [
      { type: 'jobs-completed', total: 0 },
      { type: 'activity:info', module: 'Saturn', message: 'beep boop' }
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

describe('Lockfile', () => {
  it('prevents multiple instances from running', async () => {
    const CACHE_ROOT = join(tmpdir(), randomUUID())
    const STATE_ROOT = join(tmpdir(), randomUUID())
    const ps = execa(
      station,
      { env: { CACHE_ROOT, STATE_ROOT, FIL_WALLET_ADDRESS } }
    )
    await once(ps.stdout, 'data')
    try {
      await assert.rejects(
        execa(station, { env: { CACHE_ROOT, STATE_ROOT, FIL_WALLET_ADDRESS } }),
        err => {
          assert.strictEqual(err.exitCode, 1)
          assert.match(err.stderr, /is already running/)
          return true
        }
      )
    } finally {
      ps.kill()
    }
  })
})
