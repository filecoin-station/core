import assert from 'node:assert'
import { execa } from 'execa'
import { station, FIL_WALLET_ADDRESS, PASSPHRASE, getUniqueTempDir } from './util.js'
import streamMatch from 'stream-match'
import getStream from 'get-stream'
import { once } from 'node:events'

describe('Station', () => {
  it('runs Zinnia', async () => {
    const ps = startStation()
    await Promise.race([
      once(ps, 'exit'),
      Promise.all([
        streamMatch(ps.stdout, 'totalJobsCompleted'),
        streamMatch(ps.stdout, 'Spark started'),
        streamMatch(ps.stdout, 'Voyager started')
      ])
    ])
    // Assert that the process did not exit prematurely
    assert.strictEqual(ps.exitCode, null)
    stopStation()
  })
  // No experimental modules available at this point
  // it('runs experimental modules', () => {
  //   it('runs Bacalhau', async () => {
  //     const ps = startStation(['--experimental'])
  //     await streamMatch(ps.stdout, 'Bacalhau module started.')
  //     stopStation()
  //   })
  // })
  it('outputs events', async () => {
    const ps = startStation()
    await Promise.all([
      streamMatch(ps.stdout, 'totalJobsCompleted'),
      streamMatch(ps.stdout, 'Spark started'),
      streamMatch(ps.stdout, 'Voyager started')
    ])
    stopStation()
  })
  it('outputs events json', async () => {
    const ps = startStation(['--json'])

    await Promise.all([
      streamMatch(ps.stdout, 'jobs-completed'),
      streamMatch(ps.stdout, /activity:info.*(Spark started)/),
      streamMatch(ps.stdout, /activity:info.*(Voyager started)/)
    ])

    stopStation()
  })

  let ps, stdout, stderr
  function startStation (cliArgs = []) {
    assert(!ps, 'Station is already running')

    const CACHE_ROOT = getUniqueTempDir()
    const STATE_ROOT = getUniqueTempDir()
    ps = execa(
      station,
      cliArgs,
      { env: { CACHE_ROOT, STATE_ROOT, FIL_WALLET_ADDRESS, PASSPHRASE } }
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
