import fs from 'node:fs/promises'
import { Tail } from 'tail'
import { paths } from '../lib/paths.js'

const metricsLogLineToJSON = (metrics) =>
  JSON.stringify(
    JSON.parse(metrics.split(/\[([^\]]+)\] /).pop()),
    0,
    2
  )

const tailWithDefaultValue = (path, defaultValue, _isFirstCall = true) => {
  let tail
  try {
    tail = new Tail(path, { nLines: 1 })
  } catch (err) {
    if (err.code === 'ENOENT') {
      if (_isFirstCall) {
        console.log(JSON.stringify(defaultValue, 0, 2))
      }
      setTimeout(() => tailWithDefaultValue(path, defaultValue, false), 1000)
      return
    }
    throw err
  }
  tail.on('line', line => console.log(metricsLogLineToJSON(line)))
}

const followMetrics = () => {
  tailWithDefaultValue(paths.metrics, { totalJobsCompleted: 0 })
}

const getLatestMetrics = async () => {
  let metrics
  try {
    metrics = await fs.readFile(paths.metrics, 'utf-8')
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(JSON.stringify({ totalJobsCompleted: 0 }, 0, 2))
      return
    }
    throw err
  }
  console.log(metricsLogLineToJSON(metrics.trim().split('\n').pop()))
}

export const metrics = async () => {
  const isFollow = process.argv.includes('-f') ||
    process.argv.includes('--follow')
  if (isFollow) {
    followMetrics()
  } else {
    await getLatestMetrics()
  }
}
