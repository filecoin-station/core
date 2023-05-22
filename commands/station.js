'use strict'

const { join } = require('node:path')
const saturnNode = require('../lib/saturn-node')
const zinniaRuntime = require('../lib/zinnia')
const { formatActivityObject } = require('../lib/activity')
const lockfile = require('proper-lockfile')
const { maybeCreateFile } = require('../lib/util')
const { startPingLoop } = require('../lib/telemetry')
const bacalhau = require('../lib/bacalhau')

const { FIL_WALLET_ADDRESS, MAX_DISK_SPACE } = process.env

const station = async ({ core, json, experimental }) => {
  if (!FIL_WALLET_ADDRESS) {
    console.error('FIL_WALLET_ADDRESS required')
    process.exit(1)
  }

  await maybeCreateFile(core.paths.lockFile)
  try {
    await lockfile.lock(core.paths.lockFile)
  } catch (err) {
    console.error('Another Station is already running on this machine.')
    console.error(`If you are sure this is not the case, please delete the lock file at "${core.paths.lockFile}" and try again.`)
    process.exit(1)
  }

  startPingLoop().unref()

  const modules = [
    saturnNode.start({
      FIL_WALLET_ADDRESS,
      MAX_DISK_SPACE,
      storagePath: join(core.paths.moduleCache, 'saturn-L2-node'),
      metricsStream: await core.metrics.createWriteStream('saturn-L2-node'),
      activityStream: core.activity.createWriteStream('Saturn'),
      logStream: core.logs.createWriteStream(
        join(core.paths.moduleLogs, 'saturn-L2-node.log')
      )
    }),
    zinniaRuntime.start({
      FIL_WALLET_ADDRESS,
      STATE_ROOT: join(core.paths.moduleState, 'zinnia'),
      CACHE_ROOT: join(core.paths.moduleCache, 'zinnia'),
      metricsStream: await core.metrics.createWriteStream('zinnia'),
      activityStream: core.activity.createWriteStream('Zinnia'),
      logStream: core.logs.createWriteStream(
        join(core.paths.moduleLogs, 'zinnia.log')
      )
    })
  ]

  if (experimental) {
    modules.push(bacalhau.start({
      FIL_WALLET_ADDRESS,
      storagePath: join(core.paths.moduleCache, 'bacalhau'),
      metricsStream: await core.metrics.createWriteStream('bacalhau'),
      activityStream: core.activity.createWriteStream('Bacalhau'),
      logStream: core.logs.createWriteStream(
        join(core.paths.moduleLogs, 'bacalhau.log')
      )
    }))
  }

  await Promise.all([
    ...modules,
    (async () => {
      for await (const metrics of core.metrics.follow()) {
        if (json) {
          console.log(JSON.stringify({
            type: 'jobs-completed',
            total: metrics.totalJobsCompleted
          }))
        } else {
          console.log(JSON.stringify(metrics, null, 2))
        }
      }
    })(),
    (async () => {
      for await (const activity of core.activity.follow({ nLines: 0 })) {
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
      }
    })()
  ])
}

module.exports = {
  station
}
