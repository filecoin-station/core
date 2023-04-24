import { getActivity, followActivity } from './lib/activity.js'
import { getLatestLogs, followLogs } from './lib/log.js'
import { getLatestMetrics, followMetrics } from './lib/metrics.js'

export const core = {
  activity: {
    get: getActivity,
    follow: followActivity
  },
  logs: {
    get: getLatestLogs,
    follow: followLogs
  },
  metrics: {
    getLatest: getLatestMetrics,
    follow: followMetrics
  }
}
