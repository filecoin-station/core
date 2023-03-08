import fs from 'node:fs/promises'
import { Tail } from 'tail'
import { paths } from '../lib/paths.js'
import { join } from 'node:path'

const maybeCreateLogFile = async path => {
  try {
    await fs.writeFile(path, '', { flag: 'wx' })
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err
    }
  }
}

const followLogs = path => {
  const tail = new Tail(path, { nLines: 10 })
  tail.on('line', line => console.log(line))
}

const getLogs = async path => {
  process.stdout.write(await fs.readFile(path))
}

export const logs = async ({ module, follow }) => {
  const path = module
    ? join(paths.moduleLogs, `${module}.log`)
    : paths.allLogs
  await maybeCreateLogFile(path)
  if (follow) {
    followLogs(path)
  } else {
    await getLogs(path)
  }
}
