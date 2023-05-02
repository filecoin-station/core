import { parseLog, formatLog } from '../lib/log.js'

export const logs = async ({ core, module, follow }) => {
  if (follow) {
    for await (const line of core.logs.follow(module)) {
      const { text, timestamp } = parseLog(line)
      process.stdout.write(formatLog(text, { timestamp, pretty: true }))
    }
  } else {
    process.stdout.write(await core.logs.get(module))
    const lines = (await core.logs.get(module))
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
