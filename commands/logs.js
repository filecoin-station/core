import fs from 'node:fs/promises'
import { Tail } from 'tail'
import { paths } from '../lib/paths.js'
import { join } from 'node:path'

const maybeCreateLogFile = async module => {
  try {
    await fs.writeFile(
      join(paths.moduleLogs, `${module}.log`),
      '',
      { flag: 'wx' }
    )
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err
    }
  }
}

const followLogs = module => {
  const tail = new Tail(join(paths.moduleLogs, `${module}.log`), { nLines: 10 })
  tail.on('line', line => console.log(line))
}

const getLogs = async module => {
  const logs = await fs.readFile(join(paths.moduleLogs, `${module}.log`))
  process.stdout.end(logs)
}

export const logs = async ({ module = 'saturn-l2-node', follow }) => {
  await maybeCreateLogFile(module)
  if (follow) {
    followLogs(module)
  } else {
    await getLogs(module)
  }
}
