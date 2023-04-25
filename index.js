import { Activity } from './lib/activity.js'
import { Logs } from './lib/log.js'
import { Metrics } from './lib/metrics.js'

export class Core {
  constructor (paths) {
    this.paths = paths
    const logs = this.logs = new Logs(paths)
    this.activity = new Activity({ paths, logs })
    this.metrics = new Metrics({ paths, logs })
  }
}
