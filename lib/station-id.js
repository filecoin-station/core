import keytar from 'keytar'
const { subtle } = globalThis.crypto

const SERVICE_NAME = 'filecoin-station-core'

export async function getStationId () {
  const storedKeys = await keytar.getPassword(SERVICE_NAME, 'station_id')
  if (storedKeys) {
    return JSON.parse(storedKeys)
  }

  const keyPair = await subtle.generateKey({ name: 'ED25519' }, true, ['sign', 'verify'])
  const publicKey = await subtle.exportKey('spki', keyPair.publicKey)
  const privateKey = await subtle.exportKey('pkcs8', keyPair.privateKey)

  const keysToStore = JSON.stringify({ publicKey, privateKey })
  await keytar.setPassword(SERVICE_NAME, 'station_id', keysToStore)

  return { publicKey, privateKey }
}
