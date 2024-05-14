import { join } from 'node:path'
import * as zinniaRuntime from '../lib/zinnia.js'
import { formatActivityObject, activities } from '../lib/activity.js'
import { runPingLoop, runMachinesLoop } from '../lib/telemetry.js'
import fs from 'node:fs/promises'
import { metrics } from '../lib/metrics.js'
import { paths } from '../lib/paths.js'
import { getStationId } from '../lib/station-id.js'
import pRetry from 'p-retry'
import { fetch } from 'undici'
import { ethAddressFromDelegated } from '@glif/filecoin-address'
import { ethers, formatEther } from 'ethers'
import { Obj } from '../lib/obj.js'
import { runUpdateRewardsLoop } from '../lib/rewards.js'
import { runUpdateContractsLoop } from '../lib/contracts.js'
import { fileURLToPath } from 'node:url'

const {
  FIL_WALLET_ADDRESS,
  PASSPHRASE
} = process.env

const moduleNames = [
  'zinnia'
]

/**
 * @param {string} msg
 * @param {number} [exitCode]
 */
const panic = (msg, exitCode = 1) => {
  console.error(msg)
  process.exit(exitCode)
}

export const station = async ({ json, experimental }) => {
  if (!FIL_WALLET_ADDRESS) panic('FIL_WALLET_ADDRESS required')
  if (FIL_WALLET_ADDRESS.startsWith('f1')) {
    panic('Invalid FIL_WALLET_ADDRESS: f1 addresses are currently not supported. Please use an f4 or 0x address.')
  }
  if (
    !FIL_WALLET_ADDRESS.startsWith('f410') &&
    !FIL_WALLET_ADDRESS.startsWith('0x')
  ) {
    panic('FIL_WALLET_ADDRESS must start with f410 or 0x')
  }

  const keypair = await getStationId({ secretsDir: paths.secrets, passphrase: PASSPHRASE })
  const STATION_ID = keypair.publicKey

  const fetchRes = await pRetry(
    () => fetch(`https://station-wallet-screening.fly.dev/${FIL_WALLET_ADDRESS}`),
    {
      retries: 1000,
      onFailedAttempt: () =>
        console.error('Failed to validate FIL_WALLET_ADDRESS address. Retrying...')
    }
  )
  if (fetchRes.status === 403) panic('Invalid FIL_WALLET_ADDRESS address', 2)
  if (!fetchRes.ok) panic('Failed to validate FIL_WALLET_ADDRESS address')
  const ethAddress = FIL_WALLET_ADDRESS.startsWith('0x')
    ? FIL_WALLET_ADDRESS
    : ethAddressFromDelegated(FIL_WALLET_ADDRESS)
  for (const moduleName of moduleNames) {
    await fs.mkdir(join(paths.moduleCache, moduleName), { recursive: true })
    await fs.mkdir(join(paths.moduleState, moduleName), { recursive: true })
  }

  activities.onActivity(activity => {
    if (json) {
      console.log(JSON.stringify({
        type: `activity:${activity.type}`,
        module: activity.source,
        message: activity.message
      }))
    } else {
      process.stdout.write(formatActivityObject(activity))
    }
  })

  metrics.onUpdate(metrics => {
    if (json) {
      console.log(JSON.stringify({
        type: 'jobs-completed',
        total: metrics.totalJobsCompleted,
        rewardsScheduledForAddress: formatEther(metrics.rewardsScheduledForAddress)
      }))
    } else {
      console.log(JSON.stringify({
        totalJobsCompleted: metrics.totalJobsCompleted,
        rewardsScheduledForAddress:
          formatEther(metrics.rewardsScheduledForAddress)
      }, null, 2))
    }
  })

  if (experimental) {
    console.error('No experimental modules available at this point')
  }

  const lastTotalJobsCompleted = new Obj(0)
  const lastRewardsScheduledForAddress = new Obj(0n)
  const contracts = new Obj()

  const fetchRequest = new ethers.FetchRequest(
    'https://api.node.glif.io/rpc/v1'
  )
  fetchRequest.setHeader(
    'Authorization',
    'Bearer RXQ2SKH/BVuwN7wisZh3b5uXStGPj1JQIrIWD+rxF0Y='
  )
  const provider = new ethers.JsonRpcProvider(
    fetchRequest,
    null,
    { batchMaxCount: 1 }
  )
  const abi = JSON.parse(
    await fs.readFile(
      fileURLToPath(new URL('../lib/abi.json', import.meta.url)),
      'utf8'
    )
  )

  await Promise.all([
    zinniaRuntime.run({
      provider,
      abi,
      STATION_ID,
      FIL_WALLET_ADDRESS: ethAddress,
      ethAddress,
      STATE_ROOT: join(paths.moduleState, 'zinnia'),
      CACHE_ROOT: join(paths.moduleCache, 'zinnia'),
      moduleVersionsDir: paths.moduleVersionsDir,
      moduleSourcesDir: paths.moduleSourcesDir,
      onActivity: activity => {
        activities.submit({
          ...activity,
          // Zinnia will try to overwrite `source` if a module created the
          // activity. Using the spread syntax won't work because a
          // `source: null` would overwrite the default value.
          source: activity.source || 'Zinnia'
        })
      },
      onMetrics: m => metrics.submit('zinnia', m),
      lastTotalJobsCompleted,
      lastRewardsScheduledForAddress
    }),
    runPingLoop({ STATION_ID }),
    runMachinesLoop({ STATION_ID }),
    runUpdateContractsLoop({ provider, abi, contracts }),
    runUpdateRewardsLoop({
      contracts,
      ethAddress,
      onMetrics: m => metrics.submit('zinnia', m),
      lastTotalJobsCompleted,
      lastRewardsScheduledForAddress
    })
  ])
}
