import assert from 'node:assert'
import { execa } from 'execa'
import { station, FIL_WALLET_ADDRESS, PASSPHRASE, getUniqueTempDir } from './util.js'
import { once } from 'node:events'

describe('CLI', () => {
  describe('FIL_WALLET_ADDRESS', () => {
    it('fails without address', async () => {
      await assert.rejects(execa(station, {
        env: {
          STATE_ROOT: getUniqueTempDir(),
          PASSPHRASE
        }
      }))
    })
    it('fails with sanctioned address', async () => {
      await assert.rejects(execa(station, {
        env: {
          STATE_ROOT: getUniqueTempDir(),
          PASSPHRASE,
          FIL_WALLET_ADDRESS: '0x1da5821544e25c636c1417ba96ade4cf6d2f9b5a'
        }
      }))
    })
    it('starts without passphrase in a fresh install', async () => {
      const ps = execa(station, {
        env: {
          STATE_ROOT: getUniqueTempDir(),
          FIL_WALLET_ADDRESS
        }
      })
      await once(ps.stdout, 'data')
      ps.kill()
    })
    it('works with address and passphrase', async () => {
      const ps = execa(station, {
        env: {
          STATE_ROOT: getUniqueTempDir(),
          FIL_WALLET_ADDRESS,
          PASSPHRASE
        }
      })
      await once(ps.stdout, 'data')
      ps.kill()
    })
  })

  describe('--version', () => {
    it('outputs version', async () => {
      await execa(station, ['--version'])
      await execa(station, ['-v'])
    })
  })

  describe('--help', () => {
    it('outputs help text', async () => {
      await execa(station, ['--help'])
      await execa(station, ['-h'])
    })
  })
})
