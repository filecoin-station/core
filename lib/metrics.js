import { createLogStream } from './log.js'
import { Transform } from 'node:stream'
import { writePoint } from './telemetry.js'
import { Point } from '@influxdata/influxdb-client'

// Metrics stream
// - Filters duplicate entries
// - Writes `jobs-completed` to InfluxDB
// - Serializes JSON
export const createMetricsStream = metricsPath => {
  const deduplicateStream = new DeduplicateStream()
  deduplicateStream
    .pipe(new TelemetryStream())
    .pipe(new SerializeStream())
    .pipe(createLogStream(metricsPath))
  return deduplicateStream
}

class DeduplicateStream extends Transform {
  constructor () {
    super({ objectMode: true })
    this.last = null
  }

  _transform (obj, _, callback) {
    const isChanged = this.last === null ||
        Object
          .entries(obj)
          .some(([key, value]) => this.last[key] !== value)
    if (isChanged) {
      this.last = obj
      callback(null, obj)
    } else {
      callback()
    }
  }
}

class TelemetryStream extends Transform {
  constructor () {
    super({ objectMode: true })
    this.lastMetrics = null
  }

  _transform (metrics, _, callback) {
    if (typeof this.lastMetrics?.totalJobsCompleted === 'number') {
      writePoint(
        new Point('jobs-completed')
          .stringField('module', 'saturn')
          .intField(
            'value',
            metrics.totalJobsCompleted - this.lastMetrics.totalJobsCompleted
          )
      )
    }
    this.lastMetrics = metrics
    callback(null, metrics)
  }
}

class SerializeStream extends Transform {
  constructor () {
    super({ objectMode: true })
  }

  _transform (obj, _, callback) {
    callback(null, JSON.stringify(obj))
  }
}
