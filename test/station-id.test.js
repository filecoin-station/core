import assert from 'node:assert'
import fs from 'node:fs/promises'
import path from 'node:path'
import { decrypt, encrypt, getStationId } from '../lib/station-id.js'
import { getUniqueTempDir } from './util.js'

describe('station-id', () => {
  describe('getStationId', () => {
    it('creates a new key and stores it in the given path', async () => {
      const secretsDir = getUniqueTempDir()
      const generated = await getStationId({ secretsDir, passphrase: 'secret' })
      assert.match(generated.publicKey, /^[0-9a-z]+$/)
      assert.match(generated.privateKey, /^[0-9a-z]+$/)

      await fs.stat(path.join(secretsDir, 'station_id'))
      // the check passes if the statement above does not throw

      const loaded = await getStationId({ secretsDir, passphrase: 'secret' })
      assert.deepStrictEqual(loaded, generated)
    })

    it('skips encryption when passphrase is not set', async () => {
      const secretsDir = getUniqueTempDir()
      const generated = await getStationId({ secretsDir, passphrase: '' })
      assert.match(generated.publicKey, /^[0-9a-z]+$/)
      assert.match(generated.privateKey, /^[0-9a-z]+$/)

      await fs.stat(path.join(secretsDir, 'station_id'))
      // the check passes if the statement above does not throw

      const loaded = await getStationId({ secretsDir, passphrase: '' })
      assert.deepStrictEqual(loaded, generated)
    })

    it('provides a helpful error message when the file cannot be decrypted', async () => {
      const secretsDir = getUniqueTempDir()
      await getStationId({ secretsDir, passphrase: 'secret' })
      await assert.rejects(
        getStationId({ secretsDir, passphrase: 'wrong pass' }),
        /Cannot decrypt Station ID file. Did you configure the correct PASSPHRASE/
      )
    })

    it('encrypts plaintext station_id file when PASSPHRASE is provided', async () => {
      const secretsDir = getUniqueTempDir()
      const generated = await getStationId({ secretsDir, passphrase: '' })
      const plaintext = await fs.readFile(path.join(secretsDir, 'station_id'))

      const loaded = await getStationId({ secretsDir, passphrase: 'super-secret' })
      assert.deepStrictEqual(loaded, generated)

      const ciphertext = await fs.readFile(path.join(secretsDir, 'station_id'))
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
