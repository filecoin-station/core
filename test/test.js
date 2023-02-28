import test from 'test'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'
import assert from 'node:assert'
import { tmpdir } from 'node:os'
import fs from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

const cmd = join(dirname(fileURLToPath(import.meta.url)), '../bin/station.js')

test('FIL_WALLET_ADDRESS', async t => {
  await t.test('require address', async t => {
    try {
      await execa(cmd)
    } catch (err) {
      return
    }
    assert.fail('should have thrown')
  })
  await t.test('with address', async t => {
    await execa(cmd, {
      env: {
        FIL_WALLET_ADDRESS: 'f1...'
      }
    })
  })
})

test('Storage', async t => {
  const ROOT = join(tmpdir(), randomUUID())
  await execa(cmd, {
    env: {
      FIL_WALLET_ADDRESS: 'f1...',
      ROOT
    }
  })
  await fs.stat(ROOT)
  await fs.stat(join(ROOT, 'modules'))
  await fs.stat(join(ROOT, 'logs'))
  await fs.stat(join(ROOT, 'logs', 'modules'))
})
