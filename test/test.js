import test from 'test'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'
import assert from 'node:assert'
import { tmpdir } from 'node:os'
import fs from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'

const __dirname = dirname(fileURLToPath(import.meta.url))
const station = join(__dirname, '..', 'bin', 'station.js')

// From https://spec.filecoin.io/appendix/address/
const FIL_WALLET_ADDRESS = 'f17uoq6tp427uzv7fztkbsnn64iwotfrristwpryy'

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
    const ps = execa(station, { env: { FIL_WALLET_ADDRESS } })
    await once(ps.stdout, 'data')
    ps.kill()
  })
})

test('Storage', async t => {
  const ROOT = join(tmpdir(), randomUUID())
  const ps = execa(station, {
    env: {
      FIL_WALLET_ADDRESS,
      ROOT
    }
  })
  await once(ps.stdout, 'data')
  ps.kill()
  await fs.stat(ROOT)
  await fs.stat(join(ROOT, 'modules'))
  await fs.stat(join(ROOT, 'logs'))
  await fs.stat(join(ROOT, 'logs', 'modules'))
  await fs.stat(join(ROOT, 'logs', 'modules', 'saturn-L2-node.log'))
  await fs.stat(join(ROOT, 'logs', 'modules', 'saturn-L2-node.err.log'))
})

test('Update modules', async t => {
  await execa(join(__dirname, '..', 'scripts', 'update-modules.js'))
})
