import assert from 'node:assert'
import { execa } from 'execa'
import { checker, FIL_WALLET_ADDRESS, PASSPHRASE, getUniqueTempDir } from './util.js'
import streamMatch from 'stream-match'
import getStream from 'get-stream'
import { once } from 'node:events'

describe('Checker', () => {
  it('runs Zinnia', async () => {
    const ps = startChecker()
    await Promise.race([
      once(ps, 'exit'),
      Promise.all([
        streamMatch(ps.stdout, 'totalJobsCompleted'),
        streamMatch(ps.stdout, 'Spark started')
      ])
    ])
    // Assert that the process did not exit prematurely
    assert.strictEqual(ps.exitCode, null)
    stopChecker()
  })
  // No experimental subnets available at this point
  // it('runs experimental subnets', () => {
  //   it('runs Bacalhau', async () => {
  //     const ps = startChecker(['--experimental'])
  //     await streamMatch(ps.stdout, 'Bacalhau subnet started.')
  //     stopChecker()
  //   })
  // })
  it('outputs events', async () => {
    const ps = startChecker()
    await Promise.all([
      streamMatch(ps.stdout, 'totalJobsCompleted'),
      streamMatch(ps.stdout, 'Spark started')
    ])
    stopChecker()
  })
  it('outputs events json', async () => {
    const ps = startChecker(['--json'])

    await Promise.all([
      streamMatch(ps.stdout, 'jobs-completed'),
      streamMatch(ps.stdout, /activity:info.*(Spark started)/)
    ])

    stopChecker()
  })

  let ps, stdout, stderr
  function startChecker (cliArgs = []) {
    assert(!ps, 'Checker is already running')

    const CACHE_ROOT = getUniqueTempDir()
    const STATE_ROOT = getUniqueTempDir()
    ps = execa(
      checker,
      cliArgs,
      { env: { CACHE_ROOT, STATE_ROOT, FIL_WALLET_ADDRESS, PASSPHRASE } }
    )
    stdout = getStream(ps.stdout)
    stderr = getStream(ps.stderr)
    return ps
  }

  function stopChecker () {
    ps.kill()
    ps = undefined
  }

  afterEach(async () => {
    if (!ps) return
    // The test failed and did not stop the Checker process
    // Let's stop the process and print stdout & stderr for troubleshooting
    stopChecker()

    console.log('== STATION STDOUT ==\n%s', await stdout)
    console.log('== STATION STDERR ==\n%s', await stderr)
    console.log('== END ==')
  })
})
