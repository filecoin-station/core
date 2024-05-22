import timers from 'node:timers/promises'
import pRetry from 'p-retry'
import * as Name from 'w3name'
import { ethers } from 'ethers'

const {
  // https://github.com/filecoin-station/contract-addresses
  CONTRACT_ADDRESSES_IPNS_KEY = 'k51qzi5uqu5dmaqrefqazad0ca8b24fb79zlacfjw2awdt5gjf2cr6jto5jyqe'
} = process.env

export const runUpdateContractsLoop = async ({ provider, abi, contracts, onActivity }) => {
  while (true) {
    const delayInMinutes = 10
    const delay = delayInMinutes * 60 * 1000 // 10 minutes
    const jitter = Math.random() * 20_000 - 10_000 // +- 10 seconds
    try {
      await timers.setTimeout(delay + jitter)
    } catch (err) {
      if (err.name === 'AbortError') return
      throw err
    }
    try {
      const newContracts = await getContractsWithRetry({ provider, abi })
      contracts.splice(0)
      contracts.push(...newContracts)
    } catch (err) {
      console.error('Failed to update the list of contract addresses. Will retry later.', err)
      onActivity({
        type: 'error',
        message: `Cannot update scheduled rewards. Will retry in ${delayInMinutes} minutes.`
      })
    }
  }
}

async function getContractsWithRetry ({ provider, abi }) {
  const contractAddresses = await pRetry(getContractAddresses, {
    retries: 10,
    onFailedAttempt: err => {
      console.error(err)
      console.error('Failed to get contract addresses. Retrying...')
      if (String(err).includes('You are being rate limited')) {
        const delaySeconds = 60 + (Math.random() * 60)
        // Don't DDOS the w3name services
        console.error(
          `Rate limited. Waiting ${delaySeconds} seconds...`
        )
        return timers.setTimeout(delaySeconds * 1000)
      }
    }
  })
  console.error(`Meridian contract addresses: ${contractAddresses.join(', ')}`)
  return contractAddresses.map(address => {
    return new ethers.Contract(address, abi, provider)
  })
}

async function getContractAddresses () {
  const name = Name.parse(CONTRACT_ADDRESSES_IPNS_KEY)
  const revision = await Name.resolve(name)
  return revision.value.split('\n').filter(Boolean)
}
