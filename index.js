import { Activity } from './lib/activity.js'
import { Logs } from './lib/log.js'
import { Metrics } from './lib/metrics.js'
import { getPaths, getDefaultRootDirs } from './lib/paths.js'

export class Core {
  /**
   * @param {Object} [options]
   * @param {String} [options.cacheRoot]
   * @param {String} [options.stateRoot]
   */
  constructor ({ cacheRoot, stateRoot } = getDefaultRootDirs()) {
    this.paths = getPaths({ cacheRoot, stateRoot })
    this.logs = new Logs(this)
    this.activity = new Activity(this)
    this.metrics = new Metrics(this)
  }
}
