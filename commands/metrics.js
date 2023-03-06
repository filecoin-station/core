import fs from 'node:fs/promises'
import { Tail } from 'tail'
import { paths } from '../lib/paths.js'

const metricsLogLineToJSON = (metrics) =>
  JSON.stringify(
    JSON.parse(metrics.split(/\[([^\]]+)\] /).pop()),
    0,
    2
  )

const maybeCreateMetricsFile = async () => {
  try {
    await fs.stat(paths.metrics)
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err
    }
    await fs.writeFile(
      paths.metrics,
      `[${new Date().toLocaleTimeString()}] {"totalJobsCompleted":0}\n`
    )
  }
}

const followMetrics = () => {
  const tail = new Tail(paths.metrics, { nLines: 1 })
  tail.on('line', line => console.log(metricsLogLineToJSON(line)))
}

const getLatestMetrics = async () => {
  const metrics = await fs.readFile(paths.metrics, 'utf-8')
  console.log(metricsLogLineToJSON(metrics.trim().split('\n').pop()))
}

export const metrics = async () => {
  await maybeCreateMetricsFile()
  if (process.argv.includes('-f') || process.argv.includes('--follow')) {
    followMetrics()
  } else {
    await getLatestMetrics()
  }
}
