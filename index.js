import { Activity } from './lib/activity.js'
import { Logs } from './lib/log.js'
import { Metrics } from './lib/metrics.js'
import { getPaths } from './lib/paths.js'

export class Core {
  constructor (cacheRoot, stateRoot) {
    const paths = this.paths = getPaths(cacheRoot, stateRoot)
    const logs = this.logs = new Logs(paths)
    this.activity = new Activity({ paths, logs })
    this.metrics = new Metrics({ paths, logs })
  }
}
