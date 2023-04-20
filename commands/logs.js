import { followLogs, getLatestLogs } from '../lib/log.js'

export const logs = async ({ module, follow }) => {
  if (follow) {
    for await (const line of followLogs(module)) {
      console.log(line)
    }
  } else {
    process.stdout.write(await getLatestLogs(module))
  }
}
