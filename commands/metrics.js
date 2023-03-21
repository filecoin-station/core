import { followMetrics, getLatestMetrics } from '../lib/metrics.js'

export const metrics = async ({ follow }) => {
  if (follow) {
    for await (const obj of followMetrics()) {
      console.log(JSON.stringify(obj, 0, 2))
    }
  } else {
    console.log(JSON.stringify(await getLatestMetrics(), 0, 2))
  }
}
