import assert from 'node:assert'
import fs from 'node:fs/promises'
import path from 'node:path'
import { subtle, getRandomValues } from 'node:crypto'

/**
 * @param {object} args
 * @param {string} args.secretsDir
 * @param {string} args.passphrase
 * @returns {Promise<{publicKey: string, privateKey: string}>}
 */
export async function getStationId ({ secretsDir, passphrase }) {
  assert.strictEqual(typeof secretsDir, 'string', 'stateRoot must be a string')
  assert.strictEqual(typeof passphrase, 'string', 'passphrase must be a string')

  await fs.mkdir(secretsDir, { recursive: true })
  const keystore = path.join(secretsDir, 'station_id')

  try {
    console.log('keystore', keystore)
    return await loadKeypair(keystore, passphrase)
  } catch (err) {
    if (err.code === 'ENOENT' && err.path === keystore) {
      // the keystore file does not exist, create a new key
      return await generateKeypair(keystore, passphrase)
    } else {
      throw err
    }
  }
}

/**
 * @param {string} keystore
 * @param {string} passphrase
 * @returns {Promise<{publicKey: string, privateKey: string}>}
 */
async function loadKeypair (keystore, passphrase) {
  const ciphertext = await fs.readFile(keystore)
  const plaintext = await decrypt(passphrase, ciphertext)
  const storedKeys = JSON.parse(Buffer.from(plaintext).toString())

  assert.strictEqual(typeof storedKeys.publicKey, 'string', 'station_id is corrupted: invalid publicKey')
  assert.strictEqual(typeof storedKeys.privateKey, 'string', 'station_id is corrupted: invalid privateKey')
  console.log('Loaded Station ID: %s', storedKeys.publicKey)
  return storedKeys
}

/**
 * @param {string} keystore
 * @param {string} passphrase
 * @returns {Promise<{publicKey: string, privateKey: string}>}
 */
async function generateKeypair (keystore, passphrase) {
  const keyPair = /** @type {import('node:crypto').webcrypto.CryptoKeyPair} */ (
    /** @type {unknown} */ (
      await subtle.generateKey({ name: 'ED25519' }, true, ['sign', 'verify'])
    )
  )
  const publicKey = Buffer.from(await subtle.exportKey('spki', keyPair.publicKey)).toString('hex')
  const privateKey = Buffer.from(await subtle.exportKey('pkcs8', keyPair.privateKey)).toString('hex')
  console.log('Generated a new Station ID:', publicKey)

  const plaintext = JSON.stringify({ publicKey, privateKey })
  const ciphertext = await encrypt(passphrase, Buffer.from(plaintext))
  await fs.writeFile(keystore, ciphertext)

  const keys = { publicKey, privateKey }
  return keys
}

//
// The implementation below is loosely based on the following articles
// https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey#pbkdf2_2
// https://bradyjoslin.com/blog/encryption-webcrypto/
//

/**
 * @param {string} passphrase
 * @param {Uint8Array} salt
 * @returns {Promise<import('node:crypto').webcrypto.CryptoKey>}
 */
async function deriveKeyFromPassphrase (passphrase, salt) {
  // Create a password based key (PBKDF2) that will be used to derive
  // the AES-GCM key used for encryption / decryption.
  const keyMaterial = await subtle.importKey(
    'raw',
    Buffer.from(passphrase),
    'PBKDF2',
    /* extractable: */ false,
    ['deriveKey']
  )

  // Derive the key used for encryption/decryption
  return await subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100_000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    /* extractable: */ true,
    ['encrypt', 'decrypt']
  )
}

/**
 * @param {string} passphrase
 * @param {Buffer} plaintext
 * @returns {Promise<Buffer>}
 */
export async function encrypt (passphrase, plaintext) {
  assert(Buffer.isBuffer(plaintext), 'plaintext must be a Buffer')
  const salt = getRandomValues(new Uint8Array(16))
  const iv = getRandomValues(new Uint8Array(12))

  const key = await deriveKeyFromPassphrase(passphrase, salt)
  const ciphertext = await subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)

  const result = Buffer.alloc(salt.byteLength + iv.byteLength + ciphertext.byteLength)
  result.set(salt, 0)
  result.set(iv, salt.byteLength)
  result.set(new Uint8Array(ciphertext), salt.byteLength + iv.byteLength)
  return result
}

/**
 * @param {string} passphrase
 * @param {Buffer} encryptedData
 * @returns {Promise<ArrayBuffer>}
 */
export async function decrypt (passphrase, encryptedData) {
  assert(Buffer.isBuffer(encryptedData), 'encryptedData must be a Buffer')
  const salt = Uint8Array.prototype.slice.call(encryptedData, 0, 16)
  const iv = Uint8Array.prototype.slice.call(encryptedData, 16, 16 + 12)
  const ciphertext = Uint8Array.prototype.slice.call(encryptedData, 16 + 12)

  const key = await deriveKeyFromPassphrase(passphrase, salt)
  const plaintext = await subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return plaintext
}
