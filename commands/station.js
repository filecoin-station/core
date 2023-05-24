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

  activities.on('activity', activity => {
    if (json) {
      console.log(JSON.stringify({
        type: `activity:${activity.type}`,
        timestamp: activity.timestamp,
        module: activity.source,
        message: activity.message,
        id: activity.id
      }))
    } else {
      process.stdout.write(formatActivityObject(activity))
    }
  })

  metrics.on('update', metrics => {
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
      storagePath: join(paths.moduleCache, 'saturn-L2-node')
    }),
    zinniaRuntime.start({
      FIL_WALLET_ADDRESS,
      STATE_ROOT: join(paths.moduleState, 'zinnia'),
      CACHE_ROOT: join(paths.moduleCache, 'zinnia')
    })
  ]

  if (experimental) {
    modules.push(bacalhau.start({
      FIL_WALLET_ADDRESS,
      storagePath: join(paths.moduleCache, 'bacalhau')
    }))
  }

  await Promise.all(modules)
}

module.exports = {
  station
}
