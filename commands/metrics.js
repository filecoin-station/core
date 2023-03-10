import fs from 'node:fs/promises'
import { Tail } from 'tail'
import { paths } from '../lib/paths.js'
import { formatLog, parseLog } from '../lib/log.js'

const metricsLogLineToJSON = metrics =>
  JSON.stringify(JSON.parse(parseLog(metrics).text), 0, 2)

const maybeCreateMetricsFile = async () => {
  try {
    await fs.writeFile(
      paths.metrics,
      formatLog(
        JSON.stringify({ totalJobsCompleted: 0, totalEarnings: '0' }) + '\n'
      ),
      { flag: 'wx' }
    )
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err
    }
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

export const metrics = async ({ follow }) => {
  await maybeCreateMetricsFile()
  if (follow) {
    followMetrics()
  } else {
    await getLatestMetrics()
  }
}
