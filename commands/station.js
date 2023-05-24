'use strict'

const { join } = require('node:path')
const saturnNode = require('../lib/saturn-node')
const zinniaRuntime = require('../lib/zinnia')
const { formatActivityObject, activities } = require('../lib/activity')
const { startPingLoop } = require('../lib/telemetry')
const bacalhau = require('../lib/bacalhau')
const fs = require('node:fs/promises')
const { metrics } = require('../lib/metrics')
const { paths } = require('../lib/paths')

const { FIL_WALLET_ADDRESS, MAX_DISK_SPACE } = process.env

const moduleNames = [
  'zinnia',
  'saturn-L2-node',
  'bacalhau'
]

const station = async ({ json, experimental }) => {
  if (!FIL_WALLET_ADDRESS) {
    console.error('FIL_WALLET_ADDRESS required')
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
    saturnNode.start({
      FIL_WALLET_ADDRESS,
      MAX_DISK_SPACE,
      storagePath: join(paths.moduleCache, 'saturn-L2-node'),
      onActivity: activity => {
        activities.submit({ source: 'Saturn', ...activity })
      },
      onMetrics: m => metrics.submit('saturn-L2-node', m)
    }),
    zinniaRuntime.start({
      FIL_WALLET_ADDRESS,
      STATE_ROOT: join(paths.moduleState, 'zinnia'),
      CACHE_ROOT: join(paths.moduleCache, 'zinnia'),
      onActivity: activity => {
        activities.submit({ ...activity, source: activity.source || 'Zinnia' })
      },
      onMetrics: m => metrics.submit('zinnia', m)
    })
  ]

  if (experimental) {
    modules.push(bacalhau.start({
      FIL_WALLET_ADDRESS,
      storagePath: join(paths.moduleCache, 'bacalhau'),
      onActivity: activity => {
        activities.submit({ source: 'Bacalhau', ...activity })
      },
      onMetrics: m => metrics.submit('bacalhau', m)
    }))
  }

  await Promise.all(modules)
}

module.exports = {
  station
}
