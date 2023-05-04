import { Activity } from './lib/activity.js'
import { Logs } from './lib/log.js'
import { Metrics } from './lib/metrics.js'
import { getPaths, getDefaultRootDirs } from './lib/paths.js'
import fs from 'node:fs/promises'
import { join } from 'node:path'

export { ActivityEvent } from './lib/activity.js'
export { MetricsEvent } from './lib/metrics.js'

export class Core {
  modules = [
    'zinnia',
    'saturn-L2-node',
    'bacalhau'
  ]

  /**
   * @param {Object} [options]
   * @param {String} [options.cacheRoot]
   * @param {String} [options.stateRoot]
   */
  constructor ({ cacheRoot, stateRoot } = getDefaultRootDirs()) {
    this.paths = getPaths({ cacheRoot, stateRoot })
    this.logs = new Logs(this.paths.moduleLogs, this.paths.allLogs)
    this.activity = new Activity(this.paths.activity, this.logs)
    this.metrics = new Metrics(
      this.paths.metrics,
      this.paths.allMetrics,
      this.logs
    )
  }

  async setup () {
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
}
