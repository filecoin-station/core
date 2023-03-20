import { followMetrics, getLatestMetrics } from '../lib/metrics.js'

export const metrics = async ({ follow }) => {
  if (follow) {
    for await (const line of followMetrics()) {
      console.log(line)
    }
  } else {
    console.log(await getLatestMetrics())
  }
}
