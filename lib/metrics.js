import { createLogStream, SerializeStream, parseLog, formatLog } from './log.js'
import { Transform, PassThrough } from 'node:stream'
import { writeClient } from './telemetry.js'
import { Point } from '@influxdata/influxdb-client'
import fs from 'node:fs/promises'
import { on } from 'node:events'
import { Tail } from 'tail'
import { maybeCreateFile } from './util.js'
import { platform } from 'node:os'
import assert from 'node:assert'
import { join } from 'node:path'

const metricsLogLineToObject = metrics => JSON.parse(parseLog(metrics).text)

export class Metrics {
  constructor (paths) {
    this.paths = paths
  }

  getMetricsFilePath (moduleName) {
    return moduleName
      ? join(this.paths.metrics, `${moduleName}.log`)
      : this.paths.allMetrics
  }

  /**
   * @param {string=} moduleName
   */
  async getLatest (moduleName) {
    const metrics = await fs.readFile(this.getMetricsFilePath(moduleName), 'utf-8')
    return metricsLogLineToObject(metrics.trim().split('\n').pop())
  }

  async * follow ({ moduleName, signal } = {}) {
    const tail = new Tail(this.getMetricsFilePath(moduleName), {
      nLines: 1,
      useWatchFile: platform() === 'win32'
    })
    for await (const [line] of on(tail, 'line', { signal })) {
      yield metricsLogLineToObject(line)
    }
  }

  // Metrics stream
  // - Filters duplicate entries
  // - Writes `jobs-completed` to InfluxDB
  // - Serializes JSON
  // - Persists to
  //   - module specific metrics file
  //   - merged metrics file
  async createWriteStream (moduleName) {
    assert(moduleName, 'moduleName required')
    const deduplicateStream = new DeduplicateStream()
    const splitStream = new PassThrough({ objectMode: true })
    deduplicateStream
      .pipe(new TelemetryStream(moduleName))
      .pipe(splitStream)
    splitStream
      .pipe(new SerializeStream())
      .pipe(createLogStream(join(this.paths.metrics, `${moduleName}.log`)))
    splitStream
      .pipe(new MergeMetricsStream(...await Promise.all([
        this.getLatest(),
        this.getLatest(moduleName)
      ])))
      .pipe(new SerializeStream())
      .pipe(createLogStream(this.paths.allMetrics))
    return deduplicateStream
  }

  async maybeCreateMetricsFile (moduleName) {
    await maybeCreateFile(
      this.getMetricsFilePath(moduleName),
      formatLog(
        JSON.stringify({ totalJobsCompleted: 0, totalEarnings: '0' }) + '\n'
      )
    )
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
  constructor (moduleName) {
    assert(moduleName, 'moduleName required')
    super({ objectMode: true })
    this.lastMetrics = null
    this.moduleName = moduleName
  }

  _transform (metrics, _, callback) {
    if (typeof this.lastMetrics?.totalJobsCompleted === 'number') {
      writeClient.writePoint(
        new Point('jobs-completed')
          .stringField('module', this.moduleName)
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

class MergeMetricsStream extends Transform {
  constructor (allMetrics, moduleMetrics) {
    assert.strictEqual(
      typeof allMetrics?.totalJobsCompleted,
      'number',
      'allMetrics.totalJobsCompleted required'
    )
    assert.strictEqual(
      typeof moduleMetrics?.totalJobsCompleted,
      'number',
      'moduleMetrics.totalJobsCompleted required'
    )
    super({ objectMode: true })
    this.allMetrics = allMetrics
    this.moduleMetrics = moduleMetrics
  }

  _transform (metrics, _, callback) {
    const diff = metrics.totalJobsCompleted - this.moduleMetrics.totalJobsCompleted
    this.allMetrics.totalJobsCompleted += diff
    this.moduleMetrics.totalJobsCompleted = metrics.totalJobsCompleted
    callback(null, this.allMetrics)
  }
}
