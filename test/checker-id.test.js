import assert from 'node:assert'
import fs from 'node:fs/promises'
import path from 'node:path'
import { decrypt, encrypt, getCheckerId } from '../lib/checker-id.js'
import { getUniqueTempDir } from './util.js'

const log = {
  error () {},
  warn () {}
}

describe('checker-id', () => {
  describe('getCheckerId', () => {
    it('creates a new key and stores it in the given path', async () => {
      const secretsDir = getUniqueTempDir()
      const generated = await getCheckerId({ secretsDir, passphrase: 'secret', log })
      assert.match(generated.publicKey, /^[0-9a-z]+$/)
      assert.match(generated.privateKey, /^[0-9a-z]+$/)

      await fs.stat(path.join(secretsDir, 'checker_id'))
      // the check passes if the statement above does not throw

      const loaded = await getCheckerId({ secretsDir, passphrase: 'secret', log })
      assert.deepStrictEqual(loaded, generated)
    })

    it('returns a public key that is exactly 88 characters long', async () => {
      // spark-api is enforcing this constraint and rejecting measurements containing checkerId
      // in a different format
      const secretsDir = getUniqueTempDir()
      const { publicKey } = await await getCheckerId({ secretsDir, passphrase: 'secret', log })
      assert.strictEqual(publicKey.length, 88, 'publicKey.length')
      assert.match(publicKey, /^[0-9A-Za-z]*$/)
    })

    it('skips encryption when passphrase is not set', async () => {
      const secretsDir = getUniqueTempDir()
      const generated = await getCheckerId({ secretsDir, passphrase: '', log })
      assert.match(generated.publicKey, /^[0-9a-z]+$/)
      assert.match(generated.privateKey, /^[0-9a-z]+$/)

      await fs.stat(path.join(secretsDir, 'checker_id'))
      // the check passes if the statement above does not throw

      const loaded = await getCheckerId({ secretsDir, passphrase: '', log })
      assert.deepStrictEqual(loaded, generated)
    })

    it('provides a helpful error message when the file cannot be decrypted', async () => {
      const secretsDir = getUniqueTempDir()
      await getCheckerId({ secretsDir, passphrase: 'secret', log })
      await assert.rejects(
        getCheckerId({ secretsDir, passphrase: 'wrong pass', log }),
        /Cannot decrypt Checker ID file. Did you configure the correct PASSPHRASE/
      )
    })

    it('recreates unreadable checker ids on demand', async () => {
      const secretsDir = getUniqueTempDir()
      await getCheckerId({ secretsDir, passphrase: 'secret', log })
      await getCheckerId({ secretsDir, passphrase: 'new pass', recreateOnError: true, log })
    })

    it('encrypts plaintext checker_id file when PASSPHRASE is provided', async () => {
      const secretsDir = getUniqueTempDir()
      const generated = await getCheckerId({ secretsDir, passphrase: '', log })
      const plaintext = await fs.readFile(path.join(secretsDir, 'checker_id'))

      const loaded = await getCheckerId({ secretsDir, passphrase: 'super-secret', log })
      assert.deepStrictEqual(loaded, generated)

      const ciphertext = await fs.readFile(path.join(secretsDir, 'checker_id'))
      assert.notStrictEqual(plaintext.toString('hex'), ciphertext.toString('hex'))
    })
  })

  describe('passphrase-based encryption', () => {
    it('encrypts and decrypts plaintext', async () => {
      const plaintext = 'hello world'
      const passphrase = 'some secret words'
      const encrypted = await encrypt(passphrase, Buffer.from(plaintext))
      assert(Buffer.isBuffer(encrypted), 'encrypted value is a buffer')

      const data = await decrypt(passphrase, encrypted)
      assert(data instanceof ArrayBuffer, 'decrypted value is an ArrayBuffer')
      assert.strictEqual(Buffer.from(data).toString(), plaintext)
    })
  })
})
