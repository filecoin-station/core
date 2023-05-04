import assert from 'node:assert'
import { execa } from 'execa'
import { station, FIL_WALLET_ADDRESS } from './util.js'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import streamMatch from 'stream-match'
import getStream from 'get-stream'

describe('Station', () => {
  it('runs Saturn and Zinnia', async () => {
    const ps = startStation()
    await Promise.all([
      streamMatch(ps.stdout, 'totalJobsCompleted'),
      streamMatch(ps.stdout, 'Zinnia started'),
      streamMatch(ps.stdout, 'Saturn Node will try to connect')
    ])
    stopStation()
  })
  it('runs experimental modules', () => {
    it('runs Bacalhau', async () => {
      const ps = startStation(['--experimental'])
      await streamMatch(ps.stdout, 'Bacalhau module started.')
      stopStation()
    })
  })
  it('outputs events', async () => {
    const ps = startStation()
    await Promise.all([
      streamMatch(ps.stdout, 'totalJobsCompleted'),
      streamMatch(ps.stdout, 'Zinnia started'),
      streamMatch(ps.stdout, 'Saturn Node will try to connect')
    ])
    stopStation()
  })
  it('outputs events json', async () => {
    const ps = startStation(['--json'])

    await Promise.all([
      streamMatch(ps.stdout, 'jobs-completed'),
      streamMatch(ps.stdout, /activity:info.*(Zinnia started)/),
      streamMatch(ps.stdout, /activity:info.*(Saturn Node will try to connect)/)
    ])

    stopStation()
  })

  let ps, stdout, stderr
  function startStation (cliArgs = []) {
    assert(!ps, 'Station is already running')

    const CACHE_ROOT = join(tmpdir(), randomUUID())
    const STATE_ROOT = join(tmpdir(), randomUUID())
    ps = execa(
      station,
      cliArgs,
      { env: { CACHE_ROOT, STATE_ROOT, FIL_WALLET_ADDRESS } }
    )
    stdout = getStream(ps.stdout)
    stderr = getStream(ps.stderr)
    return ps
  }

  function stopStation () {
    ps.kill()
    ps = undefined
  }

  afterEach(async () => {
    if (!ps) return
    // The test failed and did not stop the Station process
    // Let's stop the process and print stdout & stderr for troubleshooting
    stopStation()

    console.log('== STATION STDOUT ==\n%s', await stdout)
    console.log('== STATION STDERR ==\n%s', await stderr)
    console.log('== END ==')
  })
})
