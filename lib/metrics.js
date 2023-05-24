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

class Metrics extends EventEmitter {
  constructor () {
    super()
    this.mergedMetrics = null
    this.moduleMetrics = new Map()
  }

  /** @returns {Boolean} */
  emit () {
    throw new Error('Use #submit')
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
    const mergedMetrics = Object
      .values(this.moduleMetrics)
      .reduce((acc, metrics) => {
        acc.totalJobsCompleted += metrics.totalJobsCompleted
        acc.totalEarnings += metrics.totalEarnings
        return acc
      }, {
        totalJobsCompleted: 0,
        totalEarnings: 0
      })
    const isChanged = this.mergedMetrics === null ||
      Object
        .entries(this.mergedMetrics)
        .some(([key, value]) => mergedMetrics[key] !== value)
    if (isChanged) {
      this.mergedMetrics = mergedMetrics
      super.emit.call(this, 'update', mergedMetrics)
    }
    return true
  }
}

module.exports = {
  MetricsEvent,
  metrics: new Metrics()
}
