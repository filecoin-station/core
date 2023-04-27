import { join } from 'node:path'
import * as saturnNode from '../lib/saturn-node.js'
import { formatActivityObject } from '../lib/activity.js'
import lockfile from 'proper-lockfile'
import { maybeCreateFile } from '../lib/util.js'
import { startPingLoop } from '../lib/telemetry.js'

const { FIL_WALLET_ADDRESS, MAX_DISK_SPACE } = process.env

export const station = async ({ core, json }) => {
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

  const id = await startPingLoop()
  id.unref()

  await Promise.all([
    saturnNode.start({
      FIL_WALLET_ADDRESS,
      MAX_DISK_SPACE,
      storagePath: join(core.paths.moduleCache, 'saturn-L2-node'),
      metricsStream: await core.metrics.createWriteStream('saturn-L2-node'),
      activityStream: core.activity.createWriteStream('Saturn'),
      logStream: core.logs.createWriteStream(join(core.paths.moduleLogs, 'saturn-L2-node.log'))
    }),
    (async () => {
      for await (const metrics of core.metrics.follow()) {
        if (json) {
          console.log(JSON.stringify({
            type: 'jobs-completed',
            total: metrics.totalJobsCompleted
          }))
        } else {
          console.log(JSON.stringify(metrics, 0, 2))
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
