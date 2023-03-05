import fs from 'node:fs/promises'
import { Tail } from 'tail'
import { paths } from '../lib/paths.js'

const formatMetrics = (metrics) =>
  JSON.stringify(
    JSON.parse(metrics.split(/\[([^\]]+)\] /).pop()),
    0,
    2
  )

export const metrics = async () => {
  const isFollow = process.argv.includes('-f') ||
    process.argv.includes('--follow')
  if (isFollow) {
    const tail = new Tail(paths.metrics, { nLines: 1 })
    tail.on('line', line => console.log(formatMetrics(line)))
  } else {
    const metrics = await fs.readFile(paths.metrics, 'utf-8')
    console.log(formatMetrics(metrics.trim().split('\n').pop()))
  }
}
