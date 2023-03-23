import { test } from 'tap'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'
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
  const ROOT_DIR = join(tmpdir(), randomUUID())
  const ps = execa(station, {
    env: {
      FIL_WALLET_ADDRESS,
      ROOT_DIR
    }
  })
  while (true) {
    await once(ps.stdout, 'data')
    try {
      await fs.stat(
        join(
          ROOT_DIR, 'logs', 'modules', 'saturn-L2-node.log'
        )
      )
      break
    } catch {}
  }
  ps.kill()
  await fs.stat(ROOT_DIR)
  await fs.stat(join(ROOT_DIR, 'modules'))
  await fs.stat(join(ROOT_DIR, 'logs'))
  await fs.stat(join(ROOT_DIR, 'logs', 'modules'))
})

test('Metrics', async t => {
  await t.test('No metrics', async t => {
    const ROOT_DIR = join(tmpdir(), randomUUID())
    const { stdout } = await execa(
      station,
      ['metrics'],
      { env: { ROOT_DIR } }
    )
    t.equal(
      stdout,
      JSON.stringify({ totalJobsCompleted: 0, totalEarnings: '0' }, 0, 2)
    )
  })
  await t.test('With metrics', async t => {
    const ROOT_DIR = join(tmpdir(), randomUUID())
    await fs.mkdir(
      dirname(getPaths(ROOT_DIR).metrics),
      { recursive: true }
    )
    await fs.writeFile(
      getPaths(ROOT_DIR).metrics,
      '[date] {"totalJobsCompleted":1,"totalEarnings":"2"}\n'
    )
    const { stdout } = await execa(
      station,
      ['metrics'],
      { env: { ROOT_DIR } }
    )
    t.equal(
      stdout,
      JSON.stringify({ totalJobsCompleted: 1, totalEarnings: '2' }, 0, 2)
    )
  })

  await t.test('Follow', async t => {
    for (const flag of ['-f', '--follow']) {
      await t.test(flag, async t => {
        const ROOT_DIR = join(tmpdir(), randomUUID())
        const ps = execa(station, ['metrics', flag], { env: { ROOT_DIR } })
        await once(ps.stdout, 'data')
        ps.kill()
      })
    }
  })

  await t.test('Can be read while station is running', async t => {
    const ROOT_DIR = join(tmpdir(), randomUUID())
    const ps = execa(station, { env: { ROOT_DIR, FIL_WALLET_ADDRESS } })
    await once(ps.stdout, 'data')
    const { stdout } = await execa(
      station,
      ['metrics'],
      { env: { ROOT_DIR } }
    )
    t.equal(
      stdout,
      JSON.stringify({ totalJobsCompleted: 0, totalEarnings: '0' }, 0, 2)
    )
    ps.kill()
  })
})

test('Logs', async t => {
  await t.test('No logs', async t => {
    const ROOT_DIR = join(tmpdir(), randomUUID())
    const { stdout } = await execa(
      station,
      ['logs'],
      { env: { ROOT_DIR } }
    )
    t.equal(stdout, '')
  })
  await t.test('With logs', async t => {
    const ROOT_DIR = join(tmpdir(), randomUUID())
    await fs.mkdir(getPaths(ROOT_DIR).moduleLogs, { recursive: true })
    await fs.writeFile(getPaths(ROOT_DIR).allLogs, '[date] beep boop\n')
    const { stdout } = await execa(
      station,
      ['logs'],
      { env: { ROOT_DIR } }
    )
    t.equal(
      stdout,
      '[date] beep boop'
    )
  })

  await t.test('Follow', async t => {
    await t.test('Read logs', async t => {
      for (const flag of ['-f', '--follow']) {
        await t.test(flag, async t => {
          const ROOT_DIR = join(tmpdir(), randomUUID())
          await fs.mkdir(
            getPaths(ROOT_DIR).moduleLogs,
            { recursive: true }
          )
          const ps = execa(station, ['logs', flag], { env: { ROOT_DIR } })
          const [data] = await Promise.all([
            once(ps.stdout, 'data'),
            fs.writeFile(getPaths(ROOT_DIR).allLogs, '[date] beep boop\n')
          ])
          t.equal(data.toString(), '[date] beep boop\n')
          ps.kill()
        })
      }
    })
    await t.test('Doesn\'t block station from running', async t => {
      const ROOT_DIR = join(tmpdir(), randomUUID())
      const logsPs = execa(
        station,
        ['logs', '--follow'],
        { env: { ROOT_DIR } }
      )
      const stationPs = execa(
        station,
        { env: { ROOT_DIR, FIL_WALLET_ADDRESS } }
      )
      await Promise.all([
        once(stationPs.stdout, 'data'),
        once(logsPs.stdout, 'data')
      ])
      logsPs.kill()
      stationPs.kill()
    })
  })

  await t.test('Can be read while station is running', async t => {
    const ROOT_DIR = join(tmpdir(), randomUUID())
    const ps = execa(station, { env: { ROOT_DIR, FIL_WALLET_ADDRESS } })
    await once(ps.stdout, 'data')
    const { stdout } = await execa(
      station,
      ['logs'],
      { env: { ROOT_DIR } }
    )
    ps.kill()
    t.ok(stdout)
  })
})

test('Activity', async t => {
  await t.test('No activity', async t => {
    const ROOT_DIR = join(tmpdir(), randomUUID())
    const { stdout } = await execa(
      station,
      ['activity'],
      { env: { ROOT_DIR } }
    )
    t.equal(stdout, '')
  })
  await t.test('With activity', async t => {
    const ROOT_DIR = join(tmpdir(), randomUUID())
    await fs.mkdir(
      dirname(getPaths(ROOT_DIR).activity),
      { recursive: true }
    )
    await fs.writeFile(
      getPaths(ROOT_DIR).activity,
      '[3/14/2023, 10:38:14 AM] {"source":"Saturn","type":"info","message":"beep boop"}\n'
    )
    const { stdout } = await execa(
      station,
      ['activity'],
      { env: { ROOT_DIR } }
    )
    t.match(stdout, '3/14/2023')
    t.match(stdout, 'beep boop')
  })

  await t.test('Follow', async t => {
    await t.test('Read activity', async t => {
      for (const flag of ['-f', '--follow']) {
        await t.test(flag, async t => {
          const ROOT_DIR = join(tmpdir(), randomUUID())
          await fs.mkdir(
            dirname(getPaths(ROOT_DIR).activity),
            { recursive: true }
          )
          const ps = execa(
            station,
            ['activity', flag],
            { env: { ROOT_DIR } }
          )
          const [data] = await Promise.all([
            once(ps.stdout, 'data'),
            fs.writeFile(
              getPaths(ROOT_DIR).activity,
              '[3/14/2023, 10:38:14 AM] {"source":"Saturn","type":"info","message":"beep boop"}\n'
            )
          ])
          t.match(data.toString(), '3/14/2023')
          t.match(data.toString(), 'beep boop')
          ps.kill()
        })
      }
    })
    await t.test('Doesn\'t block station from running', async t => {
      const ROOT_DIR = join(tmpdir(), randomUUID())
      const activityPs = execa(
        station,
        ['activity', '--follow'],
        { env: { ROOT_DIR } }
      )
      const stationPs = execa(
        station,
        { env: { ROOT_DIR, FIL_WALLET_ADDRESS } }
      )
      await Promise.all([
        once(stationPs.stdout, 'data'),
        once(activityPs.stdout, 'data')
      ])
      activityPs.kill()
      stationPs.kill()
    })
  })

  await t.test('Can be read while station is running', async t => {
    const ROOT_DIR = join(tmpdir(), randomUUID())
    const ps = execa(station, { env: { ROOT_DIR, FIL_WALLET_ADDRESS } })
    await once(ps.stdout, 'data')
    const { stdout } = await execa(
      station,
      ['activity'],
      { env: { ROOT_DIR } }
    )
    t.ok(stdout)
    ps.kill()
  })
})

test('Events', async t => {
  await t.test('Read events', async t => {
    const ROOT_DIR = join(tmpdir(), randomUUID())
    await fs.mkdir(
      dirname(getPaths(ROOT_DIR).activity),
      { recursive: true }
    )
    await fs.writeFile(
      getPaths(ROOT_DIR).activity,
      '[3/14/2023, 10:38:14 AM] {"source":"Saturn","type":"info","message":"beep boop"}\n'
    )
    const ps = execa(
      station,
      ['events'],
      { env: { ROOT_DIR } }
    )
    const events = []
    for await (const line of ps.stdout) {
      events.push(JSON.parse(line.toString()))
      if (events.length === 2) break
    }
    ps.kill()
    t.same(events, [
      { type: 'jobs-completed', total: 0 },
      { type: 'activity:info', module: 'Saturn', message: 'beep boop' }
    ])
  })
  await t.test('Can be read while station is running', async t => {
    const ROOT_DIR = join(tmpdir(), randomUUID())
    const stationPs = execa(
      station,
      { env: { ROOT_DIR, FIL_WALLET_ADDRESS } }
    )
    const eventsPs = execa(
      station,
      ['events'],
      { env: { ROOT_DIR } }
    )
    await Promise.all([
      once(stationPs.stdout, 'data'),
      once(eventsPs.stdout, 'data')
    ])
    stationPs.kill()
    eventsPs.kill()
  })
  await t.test('Doesn\'t block station from running', async t => {
    const ROOT_DIR = join(tmpdir(), randomUUID())
    const eventsPs = execa(station, ['events'], { env: { ROOT_DIR } })
    const stationPs = execa(
      station,
      { env: { ROOT_DIR, FIL_WALLET_ADDRESS } }
    )
    await Promise.all([
      once(stationPs.stdout, 'data'),
      once(eventsPs.stdout, 'data')
    ])
    eventsPs.kill()
    stationPs.kill()
  })
})

test('Lockfile', async t => {
  const ROOT_DIR = join(tmpdir(), randomUUID())
  const ps = execa(station, { env: { ROOT_DIR, FIL_WALLET_ADDRESS } })
  await once(ps.stdout, 'data')
  try {
    await execa(station, { env: { ROOT_DIR, FIL_WALLET_ADDRESS } })
  } catch (err) {
    t.equal(err.exitCode, 1)
    t.match(err.stderr, /is already running/)
    return
  } finally {
    ps.kill()
  }
  throw new Error('did not throw')
})

test('Update modules', async t => {
  await execa(join(__dirname, '..', 'scripts', 'update-modules.js'))
})
