'use strict'

const execa = require('execa')
const { station, FIL_WALLET_ADDRESS } = require('./util')
const { once } = require('node:events')
const { tmpdir } = require('node:os')
const fs = require('node:fs/promises')
const { randomUUID } = require('node:crypto')
const { join } = require('node:path')

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
        await fs.stat(CACHE_ROOT)
        break
      } catch {}
    }
    ps.kill()
    await fs.stat(join(CACHE_ROOT, 'modules'))
    await fs.stat(STATE_ROOT)
    await fs.stat(join(STATE_ROOT, 'modules'))
  })
})
