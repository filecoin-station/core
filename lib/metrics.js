'use strict'

const { writeClient } = require('./telemetry')
const { Point } = require('@influxdata/influxdb-client')
const EventEmitter = require('node:events')

class MetricsEvent {
  /**
   * @param {Object} options
   * @param {Number} options.totalJobsCompleted
   * @param {String} options.totalEarnings
   */
  constructor ({ totalJobsCompleted, totalEarnings }) {
    this.totalJobsCompleted = totalJobsCompleted
    this.totalEarnings = totalEarnings
  }
}

class Metrics {
  #events = new EventEmitter()

  constructor () {
    this.mergedMetrics = null
    /** @type {Map<string, MetricsEvent>} */
    this.moduleMetrics = new Map()
  }

  /**
   * - Filters duplicate entries
   * - Writes `jobs-completed` to InfluxDB
   * - Merges metrics from all modules
   * @param {String} moduleName
   * @param {MetricsEvent} metrics
   */
  submit (moduleName, metrics) {
    if (
      typeof this.moduleMetrics.get(moduleName)?.totalJobsCompleted === 'number'
    ) {
      writeClient.writePoint(
        new Point('jobs-completed')
          .stringField('module', moduleName)
          .intField(
            'value',
            metrics.totalJobsCompleted -
              this.moduleMetrics.get(moduleName).totalJobsCompleted
          )
      )
    }
    this.moduleMetrics.set(moduleName, metrics)
    const mergedMetrics = {
      totalJobsCompleted: 0,
      totalEarnings: '0'
    }
    for (const [_, metrics] of this.moduleMetrics) {
      mergedMetrics.totalJobsCompleted += metrics.totalJobsCompleted
    }
    const isChanged = this.mergedMetrics === null ||
      Object
        .entries(this.mergedMetrics)
        .some(([key, value]) => mergedMetrics[key] !== value)
    if (isChanged) {
      this.mergedMetrics = mergedMetrics
      this.#events.emit('update', mergedMetrics)
    }
  }

  /**
   * @param {(metrics: MetricsEvent) => void} fn
   */
  onUpdate (fn) {
    this.#events.on('update', fn)
  }
}

module.exports = {
  MetricsEvent,
  metrics: new Metrics()
}
