'use strict'

const execa = require('execa')
const { tmpdir } = require('node:os')
const { randomUUID } = require('node:crypto')
const { once } = require('node:events')
const assert = require('node:assert')
const { station, FIL_WALLET_ADDRESS } = require('./util')
const { join } = require('node:path')

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
