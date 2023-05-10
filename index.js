'use strict'

const { Activity } = require('./lib/activity')
const { Logs } = require('./lib/log')
const { Metrics } = require('./lib/metrics')
const { getPaths, getDefaultRootDirs } = require('./lib/paths')
const fs = require('node:fs/promises')
const { join } = require('node:path')
const { ActivityEvent } = require('./lib/activity.js')
const { MetricsEvent } = require('./lib/metrics.js')

class Core {
  modules = [
    'zinnia',
    'saturn-L2-node',
    'bacalhau'
  ]

  /** @private */
  constructor ({ cacheRoot, stateRoot }) {
    this.paths = getPaths({ cacheRoot, stateRoot })
    this.logs = new Logs(this.paths.moduleLogs, this.paths.allLogs)
    this.activity = new Activity(this.paths.activity, this.logs)
    this.metrics = new Metrics(
      this.paths.metrics,
      this.paths.allMetrics,
      this.logs
    )
  }

  async #setup () {
    await fs.mkdir(this.paths.moduleLogs, { recursive: true })
    await fs.mkdir(this.paths.metrics, { recursive: true })
    await this.activity.maybeCreateActivityFile()
    await this.metrics.maybeCreateMetricsFile()
    await this.logs.maybeCreateLogFile()
    for (const module of this.modules) {
      await fs.mkdir(join(this.paths.moduleCache, module), { recursive: true })
      await fs.mkdir(join(this.paths.moduleState, module), { recursive: true })
      await this.metrics.maybeCreateMetricsFile(module)
      await this.logs.maybeCreateLogFile(module)
    }
  }

  /**
   * @param {Object} [options]
   * @param {String} [options.cacheRoot]
   * @param {String} [options.stateRoot]
   * @returns {Promise<Core>}
   */
  static async create ({ cacheRoot, stateRoot } = getDefaultRootDirs()) {
    const core = new Core({ cacheRoot, stateRoot })
    await core.#setup()
    return core
  }
}

module.exports = {
  Core,
  ActivityEvent,
  MetricsEvent
}
