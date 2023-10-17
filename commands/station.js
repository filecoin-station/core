import { join } from 'node:path'
import * as zinniaRuntime from '../lib/zinnia.js'
import { formatActivityObject, activities } from '../lib/activity.js'
import { startPingLoop } from '../lib/telemetry.js'
import * as bacalhau from '../lib/bacalhau.js'
import fs from 'node:fs/promises'
import { metrics } from '../lib/metrics.js'
import { paths } from '../lib/paths.js'
import pRetry from 'p-retry'

const { FIL_WALLET_ADDRESS } = process.env

const moduleNames = [
  'zinnia',
  'bacalhau'
]

export const station = async ({ json, experimental }) => {
  if (!FIL_WALLET_ADDRESS) {
    console.error('FIL_WALLET_ADDRESS required')
    process.exit(1)
  }
  if (FIL_WALLET_ADDRESS.startsWith('f1')) {
    console.error('Warning: f1... addresses are deprecated and will not receive any rewards.')
    console.error('Please use an address starting with f410 or 0x')
  } else if (
    !FIL_WALLET_ADDRESS.startsWith('f410') &&
    !FIL_WALLET_ADDRESS.startsWith('0x')
  ) {
    console.error('FIL_WALLET_ADDRESS must start with f410 or 0x')
    process.exit(1)
  }

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
        total: metrics.totalJobsCompleted
      }))
    } else {
      console.log(JSON.stringify(metrics, null, 2))
    }
  })

  const modules = [
    pRetry(() => zinniaRuntime.run({
      FIL_WALLET_ADDRESS,
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
