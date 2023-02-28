import test from 'test'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'
import assert from 'node:assert'
import { tmpdir } from 'node:os'
import fs from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const station = join(__dirname, '..', 'bin', 'station.js')

test('FIL_WALLET_ADDRESS', async t => {
  await t.test('require address', async t => {
    try {
      await execa(station)
    } catch (err) {
      return
    }
    assert.fail('should have thrown')
  })
  await t.test('with address', async t => {
    await execa(station, {
      env: {
        FIL_WALLET_ADDRESS: 'f1...'
      }
    })
  })
})

test('Storage', async t => {
  const ROOT = join(tmpdir(), randomUUID())
  await execa(station, {
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

test('Update modules', async t => {
  await execa(join(__dirname, '..', 'scripts', 'update-modules.js'))
})
