import { followMetrics, getLatestMetrics } from '../lib/metrics.js'

export const metrics = async ({ follow, module }) => {
  if (follow) {
    for await (const obj of followMetrics(module)) {
      console.log(JSON.stringify(obj, 0, 2))
    }
  } else {
    console.log(JSON.stringify(await getLatestMetrics(module), 0, 2))
  }
}
