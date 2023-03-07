import { createLogStream } from './log.js'
import { Transform, pipeline } from 'node:stream'
import { writePoint } from './telemetry.js'
import { Point } from '@influxdata/influxdb-client'

// Metrics stream
// - Filters redundant entries
// - Writes `jobs-completed` to InfluxDB
export const createMetricsStream = metricsPath => {
  let lastMetrics
  const transformStream = new Transform({
    objectMode: true,
    transform (metrics, _, callback) {
      const isMetricsUpdated = lastMetrics === undefined ||
        Object
          .entries(metrics)
          .some(([key, value]) => lastMetrics[key] !== value)
      if (!isMetricsUpdated) {
        callback()
      } else {
        if (lastMetrics?.totalJobsCompleted !== undefined) {
          writePoint(
            new Point('jobs-completed')
              .stringField('module', 'saturn')
              .intField(
                'value',
                metrics.totalJobsCompleted - lastMetrics.totalJobsCompleted
              )
          )
        }
        lastMetrics = metrics
        callback(null, JSON.stringify(metrics))
      }
    }
  })
  const logStream = createLogStream(metricsPath)
  pipeline(transformStream, logStream, console.error)
  return transformStream
}
