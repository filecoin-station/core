import fs from 'node:fs/promises'
import { Tail } from 'tail'
import { paths } from '../lib/paths.js'
import { join } from 'node:path'
import { maybeCreateFile } from '../lib/util.js'

const followLogs = path => {
  const tail = new Tail(path, { nLines: 10, useWatchFile: true })
  tail.on('line', line => console.log(line))
}

const getLogs = async path => {
  process.stdout.write(await fs.readFile(path))
}

export const logs = async ({ module, follow }) => {
  const path = module
    ? join(paths.moduleLogs, `${module}.log`)
    : paths.allLogs
  await maybeCreateFile(path)
  if (follow) {
    followLogs(path)
  } else {
    await getLogs(path)
  }
}
