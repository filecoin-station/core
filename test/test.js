import test from 'test'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'
import assert from 'node:assert'

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
