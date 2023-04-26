import { followLogs, getLatestLogs, parseLog, formatLog } from '../lib/log.js'

export const logs = async ({ module, follow }) => {
  if (follow) {
    for await (const line of followLogs(module)) {
      const { text, date } = parseLog(line)
      process.stdout.write(formatLog(text, { date, isHumanReadable: true }))
    }
  } else {
    const lines = (await getLatestLogs(module))
      .toString()
      .trim()
      .split('\n')
      .filter(Boolean)
    for (const line of lines) {
      const { text, date } = parseLog(line)
      process.stdout.write(formatLog(text, { date, isHumanReadable: true }))
    }
  }
}
