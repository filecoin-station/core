import { join } from 'node:path'
import { paths } from '../lib/paths.js'
import * as saturnNode from '../lib/saturn-node.js'
import { createLogStream } from '../lib/log.js'
import { createMetricsStream } from '../lib/metrics.js'
import { createActivityStream } from '../lib/activity.js'

const { FIL_WALLET_ADDRESS } = process.env

export const station = async () => {
  if (!FIL_WALLET_ADDRESS) {
    console.error('FIL_WALLET_ADDRESS required')
    process.exit(1)
  }

  await saturnNode.start({
    FIL_WALLET_ADDRESS,
    storagePath: join(paths.moduleStorage, 'saturn-L2-node'),
    binariesPath: paths.moduleBinaries,
    metricsStream: createMetricsStream(paths.metrics),
    activityStream: createActivityStream('Saturn'),
    logStream: createLogStream(join(paths.moduleLogs, 'saturn-L2-node.log'))
  })
}
