import { followLogs, getLatestLogs, parseLog, formatLog } from '../lib/log.js'

export const logs = async ({ module, follow }) => {
  if (follow) {
    for await (const line of followLogs(module)) {
      const { text, timestamp } = parseLog(line)
      process.stdout.write(formatLog(text, { timestamp, pretty: true }))
    }
  } else {
    const lines = (await getLatestLogs(module))
      .toString()
      .trim()
      .split('\n')
      .filter(line => line !== '')
    for (const line of lines) {
      const { text, timestamp } = parseLog(line)
      process.stdout.write(formatLog(text, { timestamp, pretty: true }))
    }
  }
}
