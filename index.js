import { Activity } from './lib/activity.js'
import { Logs } from './lib/log.js'
import { Metrics } from './lib/metrics.js'

export class Core {
  constructor (paths) {
    this.activity = new Activity(paths)
    this.logs = new Logs(paths)
    this.metrics = new Metrics(paths)
  }
}
