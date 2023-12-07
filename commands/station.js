import { join } from 'node:path'
import * as zinniaRuntime from '../lib/zinnia.js'
import { formatActivityObject, activities } from '../lib/activity.js'
import { startPingLoop } from '../lib/telemetry.js'
import * as bacalhau from '../lib/bacalhau.js'
import fs from 'node:fs/promises'
import { metrics } from '../lib/metrics.js'
import { paths } from '../lib/paths.js'
import pRetry from 'p-retry'
import { fetch } from 'undici'
import { ethAddressFromDelegated } from '@glif/filecoin-address'
import { formatEther } from 'ethers'

const { FIL_WALLET_ADDRESS } = process.env

const moduleNames = [
  'zinnia',
  'bacalhau'
]

const panic = msg => {
  console.error(msg)
  process.exit(1)
}

export const station = async ({ json, experimental }) => {
  if (!FIL_WALLET_ADDRESS) panic('FIL_WALLET_ADDRESS required')
  if (FIL_WALLET_ADDRESS.startsWith('f1')) {
    panic('f1 addresses are currently not supported. Please use an f4 or 0x address')
  }
  if (
    !FIL_WALLET_ADDRESS.startsWith('f410') &&
    !FIL_WALLET_ADDRESS.startsWith('0x')
  ) {
    panic('FIL_WALLET_ADDRESS must start with f410 or 0x')
  }
  const fetchRes = await pRetry(
    () => fetch(`https://station-wallet-screening.fly.dev/${FIL_WALLET_ADDRESS}`),
    {
      retries: 1000,
      onFailedAttempt: () =>
        console.error('Failed to validate FIL_WALLET_ADDRESS address. Retrying...')
    }
  )
  if (fetchRes.status === 403) panic('Invalid FIL_WALLET_ADDRESS address')
  if (!fetchRes.ok) panic('Failed to validate FIL_WALLET_ADDRESS address')
  const ethAddress = FIL_WALLET_ADDRESS.startsWith('0x')
    ? FIL_WALLET_ADDRESS
    : ethAddressFromDelegated(FIL_WALLET_ADDRESS)

  startPingLoop().unref()
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

  const modules = [
    pRetry(() => zinniaRuntime.run({
      FIL_WALLET_ADDRESS,
      ethAddress,
      STATE_ROOT: join(paths.moduleState, 'zinnia'),
      CACHE_ROOT: join(paths.moduleCache, 'zinnia'),
      onActivity: activity => {
        activities.submit({
          ...activity,
          // Zinnia will try to overwrite `source` if a module created the
          // activity. Using the spread syntax won't work because a
          // `source: null` would overwrite the default value.
          source: activity.source || 'Zinnia'
        })
      },
      onMetrics: m => metrics.submit('zinnia', m)
    }), { retries: 1000 })
  ]

  if (experimental) {
    modules.push(pRetry(() => bacalhau.run({
      FIL_WALLET_ADDRESS,
      storagePath: join(paths.moduleCache, 'bacalhau'),
      onActivity: activity => {
        activities.submit({ source: 'Bacalhau', ...activity })
      },
      onMetrics: m => metrics.submit('bacalhau', m)
    }), { retries: 1000 }))
  }

  await Promise.all(modules)
}
