import { createLogStream } from './log.js'
import { Transform, pipeline } from 'node:stream'
import { writePoint } from './telemetry.js'
import { Point } from '@influxdata/influxdb-client'

// Metrics stream
// - Filters redundant entries
// - Writes `jobs-completed` to InfluxDB
export const createMetricsStream = metricsPath => {
  let lastTotalJobsCompleted
  const transformStream = new Transform({
    objectMode: true,
    transform ({ totalJobsCompleted }, _, callback) {
      if (totalJobsCompleted === lastTotalJobsCompleted) {
        callback()
      } else {
        if (lastTotalJobsCompleted !== undefined) {
          writePoint(
            new Point('jobs-completed')
              .stringField('module', 'saturn')
              .intField('value', totalJobsCompleted - lastTotalJobsCompleted)
          )
        }
        lastTotalJobsCompleted = totalJobsCompleted
        callback(null, JSON.stringify({ totalJobsCompleted }))
      }
    }
  })
  const logStream = createLogStream(metricsPath)
  pipeline(transformStream, logStream, console.error)
  return transformStream
}