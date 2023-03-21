import { createLogStream, SerializeStream, parseLog, formatLog } from './log.js'
import { Transform } from 'node:stream'
import { writePoint } from './telemetry.js'
import { Point } from '@influxdata/influxdb-client'
import fs from 'node:fs/promises'
import { once } from 'node:events'
import { paths } from './paths.js'
import { Tail } from 'tail'
import { maybeCreateFile } from './util.js'

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

const metricsLogLineToJSON = metrics =>
  JSON.stringify(JSON.parse(parseLog(metrics).text), 0, 2)

export const maybeCreateMetricsFile = async () => {
  await maybeCreateFile(
    paths.metrics,
    formatLog(
      JSON.stringify({ totalJobsCompleted: 0, totalEarnings: '0' }) + '\n'
    )
  )
}

export const getLatestMetrics = async () => {
  const metrics = await fs.readFile(paths.metrics, 'utf-8')
  return metricsLogLineToJSON(metrics.trim().split('\n').pop())
}

export const followMetrics = async function * () {
  const tail = new Tail(paths.metrics, { nLines: 1 })
  while (true) {
    const [line] = await once(tail, 'line')
    yield metricsLogLineToJSON(line)
  }
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
