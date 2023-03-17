import fs from 'node:fs/promises'
import { Tail } from 'tail'
import { paths } from '../lib/paths.js'
import { parseLog, formatLog } from '../lib/log.js'
import { maybeCreateFile } from '../lib/util.js'

const formatLogLine = line => {
  const { date, text } = parseLog(line)
  const { type, message } = JSON.parse(text)
  return formatLog(`${type.toUpperCase().padEnd(5)} ${message}`, date)
}

const followActivity = () => {
  const tail = new Tail(paths.activity, { nLines: 10 })
  tail.on('line', line => process.stdout.write(formatLogLine(line)))
}

const getActivity = async () => {
  const activityLog = await fs.readFile(paths.activity, 'utf-8')
  for (const line of activityLog.trim().split('\n').filter(Boolean)) {
    process.stdout.write(formatLogLine(line))
  }
}

export const activity = async ({ follow }) => {
  await maybeCreateFile(paths.activity)
  if (follow) {
    followActivity()
  } else {
    await getActivity()
  }
}
