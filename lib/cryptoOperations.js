const { subtle } = globalThis.crypto;
import keytar from 'keytar';

const SERVICE_NAME = 'filecoin-station-core';

export async function getStationId() {
  const storedKeys = await keytar.getPassword(SERVICE_NAME, 'station_id');
  if (storedKeys) {
    return JSON.parse(storedKeys);
  }

  const keyPair = await generateEd25519KeyPair();
  const publicKey = await subtle.exportKey("spki", keyPair.publicKey);
  const privateKey = await subtle.exportKey("pkcs8", keyPair.privateKey);

  const keysToStore = JSON.stringify({ publicKey, privateKey });
  await keytar.setPassword(SERVICE_NAME, 'station_id', keysToStore);

  return { publicKey, privateKey };
}

async function generateEd25519KeyPair() {
  return await subtle.generateKey(
    { name: "ED25519" },
    true,
    ["sign", "verify", "decrypt", "encrypt"] // TODO do we want decrypt/encrypt?
  );
}
