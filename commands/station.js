import { join } from 'node:path'
import { paths } from '../lib/paths.js'
import * as saturnNode from '../lib/saturn-node.js'
import * as zinniaRuntime from '../lib/zinnia.js'
import { createLogStream } from '../lib/log.js'
import { createMetricsStream, followMetrics } from '../lib/metrics.js'
import {
  createActivityStream,
  followActivity,
  formatActivityObject
} from '../lib/activity.js'
import lockfile from 'proper-lockfile'
import { maybeCreateFile } from '../lib/util.js'
import { startPingLoop } from '../lib/telemetry.js'

const { FIL_WALLET_ADDRESS, MAX_DISK_SPACE } = process.env

export const station = async ({ json }) => {
  if (!FIL_WALLET_ADDRESS) {
    console.error('FIL_WALLET_ADDRESS required')
    process.exit(1)
  }

  await maybeCreateFile(paths.lockFile)
  try {
    await lockfile.lock(paths.lockFile)
  } catch (err) {
    console.error('Another Station is already running on this machine.')
    console.error(`If you are sure this is not the case, please delete the lock file at "${paths.lockFile}" and try again.`)
    process.exit(1)
  }

  startPingLoop().unref()

  await Promise.all([
    saturnNode.start({
      FIL_WALLET_ADDRESS,
      MAX_DISK_SPACE,
      storagePath: join(paths.moduleCache, 'saturn-L2-node'),
      binariesPath: paths.moduleBinaries,
      metricsStream: await createMetricsStream('saturn-L2-node'),
      activityStream: createActivityStream('Saturn'),
      logStream: createLogStream(join(paths.moduleLogs, 'saturn-L2-node.log'))
    }),
    zinniaRuntime.start({
      FIL_WALLET_ADDRESS,
      STATE_ROOT: join(paths.moduleState, 'runtime'),
      CACHE_ROOT: join(paths.moduleCache, 'runtime'),
      moduleBinaries: paths.moduleBinaries,
      metricsStream: await createMetricsStream('runtime'),
      activityStream: createActivityStream('Runtime'),
      logStream: createLogStream(join(paths.moduleLogs, 'runtime.log'))
    }),
    (async () => {
      for await (const metrics of followMetrics()) {
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
      for await (const activity of followActivity({ nLines: 0 })) {
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
