import assert from 'node:assert'
import { execa } from 'execa'
import { checker, FIL_WALLET_ADDRESS, PASSPHRASE, getUniqueTempDir } from './util.js'
import { once } from 'node:events'

describe('CLI', () => {
  describe('FIL_WALLET_ADDRESS', () => {
    it('fails without address', async () => {
      await assert.rejects(execa(checker, {
        env: {
          STATE_ROOT: getUniqueTempDir(),
          PASSPHRASE
        }
      }))
    })
    it('fails with sanctioned address', async () => {
      try {
        await execa(checker, {
          env: {
            STATE_ROOT: getUniqueTempDir(),
            PASSPHRASE,
            FIL_WALLET_ADDRESS: '0x1da5821544e25c636c1417ba96ade4cf6d2f9b5a'
          }
        })
      } catch (err) {
        assert.strictEqual(err.exitCode, 2)
        return
      }
      assert.fail('Expected Checker to return a non-zero exit code')
    })
    it('fails with invalid 0x address', async () => {
      try {
        await execa(checker, {
          env: {
            STATE_ROOT: getUniqueTempDir(),
            PASSPHRASE,
            FIL_WALLET_ADDRESS: '0x1da5821544e25c636c1417ba96ade4cf6d2f9b5'
          }
        })
      } catch (err) {
        assert.strictEqual(err.exitCode, 2)
        return
      }
      assert.fail('Expected Checker to return a non-zero exit code')
    })
    it('starts without passphrase in a fresh install', async () => {
      const ps = execa(checker, {
        env: {
          STATE_ROOT: getUniqueTempDir(),
          FIL_WALLET_ADDRESS
        }
      })
      await once(ps.stdout, 'data')
      ps.kill()
    })
    it('works with address and passphrase', async () => {
      const ps = execa(checker, {
        env: {
          STATE_ROOT: getUniqueTempDir(),
          FIL_WALLET_ADDRESS,
          PASSPHRASE
        }
      })
      await once(ps.stdout, 'data')
      ps.kill()
    })
    it('fails with the wrong pass phrase', async () => {
      const STATE_ROOT = getUniqueTempDir()
      const ps = execa(checker, {
        env: {
          STATE_ROOT,
          FIL_WALLET_ADDRESS,
          PASSPHRASE
        }
      })
      await once(ps.stdout, 'data')
      ps.kill()
      try {
        await execa(checker, {
          env: {
            STATE_ROOT,
            FIL_WALLET_ADDRESS,
            PASSPHRASE: `${PASSPHRASE}x`
          }
        })
      } catch (err) {
        assert.strictEqual(err.exitCode, 1)
        return
      }
      assert.fail('Expected Checker to return a non-zero exit code')
    })
  })

  describe('--recreateCheckerIdOnError', () => {
    it('recreates the checker id on demand', async () => {
      const STATE_ROOT = getUniqueTempDir()
      {
        const ps = execa(checker, {
          env: {
            STATE_ROOT,
            FIL_WALLET_ADDRESS,
            PASSPHRASE
          }
        })
        await once(ps.stdout, 'data')
        ps.kill()
      }
      {
        const ps = execa(checker, ['--recreateCheckerIdOnError'], {
          env: {
            STATE_ROOT,
            FIL_WALLET_ADDRESS,
            PASSPHRASE: `${PASSPHRASE}x`
          }
        })
        await once(ps.stdout, 'data')
        ps.kill()
      }
    })
  })

  describe('--version', () => {
    it('outputs version', async () => {
      await execa(checker, ['--version'])
      await execa(checker, ['-v'])
    })
  })

  describe('--help', () => {
    it('outputs help text', async () => {
      await execa(checker, ['--help'])
      await execa(checker, ['-h'])
    })
  })
})
