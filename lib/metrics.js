import { createLogStream, SerializeStream, parseLog, formatLog } from './log.js'
import { Transform } from 'node:stream'
import { writePoint } from './telemetry.js'
import { Point } from '@influxdata/influxdb-client'
import fs from 'node:fs/promises'
import { on } from 'node:events'
import { paths } from './paths.js'
import { Tail } from 'tail'
import { maybeCreateFile } from './util.js'
import { platform } from 'node:os'

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

export const maybeCreateMetricsFile = async () => {
  await maybeCreateFile(
    paths.metrics,
    formatLog(
      JSON.stringify({ totalJobsCompleted: 0, totalEarnings: '0' }) + '\n'
    )
  )
}

const metricsLogLineToObject = metrics => JSON.parse(parseLog(metrics).text)

export const getLatestMetrics = async () => {
  const metrics = await fs.readFile(paths.metrics, 'utf-8')
  return metricsLogLineToObject(metrics.trim().split('\n').pop())
}

export const followMetrics = async function * ({ signal } = {}) {
  const tail = new Tail(paths.metrics, {
    nLines: 1,
    useWatchFile: platform() === 'win32'
  })
  for await (const [line] of on(tail, 'line', { signal })) {
    yield metricsLogLineToObject(line)
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
