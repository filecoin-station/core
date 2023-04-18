import { followMetrics } from '../lib/metrics.js'
import { followActivity } from '../lib/activity.js'

export const events = async () => {
  await Promise.all([
    (async () => {
      for await (const metrics of followMetrics()) {
        console.log(JSON.stringify({
          type: 'jobs-completed',
          total: metrics.totalJobsCompleted
        }))
      }
    })(),
    (async () => {
      for await (const activity of followActivity()) {
        console.log(JSON.stringify({
          timestamp: activity.timestamp,
          type: `activity:${activity.type}`,
          module: activity.source,
          message: activity.message
        }))
      }
    })()
  ])
}
