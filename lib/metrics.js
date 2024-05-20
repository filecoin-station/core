import { writeClient } from './telemetry.js'
import { Point } from '@influxdata/influxdb-client'
import EventEmitter from 'node:events'

export class MetricsEvent {
  /**
   * @param {Object} options
   * @param {Number} options.totalJobsCompleted
   * @param {bigint} options.rewardsScheduledForAddress
   */
  constructor ({ totalJobsCompleted, rewardsScheduledForAddress }) {
    this.totalJobsCompleted = totalJobsCompleted
    this.rewardsScheduledForAddress = rewardsScheduledForAddress
  }
}

export class Metrics {
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
   * @param {Partial<MetricsEvent>} metrics
   */
  submit (moduleName, metrics) {
    /** @type {MetricsEvent} */
    const resolvedMetrics = {
      // initial values
      totalJobsCompleted: 0,
      rewardsScheduledForAddress: 0n,
      // or values submitted previously
      ...this.moduleMetrics.get(moduleName),
      // or values submitted now
      ...metrics
    }

    if (
      typeof metrics.totalJobsCompleted === 'number' &&
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
    this.moduleMetrics.set(moduleName, resolvedMetrics)
    const mergedMetrics = {
      totalJobsCompleted: 0,
      rewardsScheduledForAddress: 0n
    }
    for (const [, metrics] of this.moduleMetrics) {
      mergedMetrics.totalJobsCompleted += metrics.totalJobsCompleted
      // Merging rewards metrics should be revisited as more modules start
      // paying rewards
      mergedMetrics.rewardsScheduledForAddress +=
        metrics.rewardsScheduledForAddress
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

export const metrics = new Metrics()
