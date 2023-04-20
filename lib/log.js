import { Transform, PassThrough } from 'node:stream'
import rfs from 'rotating-file-stream'
import { basename, dirname, join } from 'node:path'
import { paths } from './paths.js'
import { maybeCreateFile } from './util.js'
import fs from 'node:fs/promises'
import { Tail } from 'tail'
import { platform } from 'node:os'
import { on } from 'node:events'

export const formatLog = (text, date = new Date()) =>
  text
    .trimEnd()
    .split(/\n/g)
    .map(line => `[${date.toLocaleString()}] ${line}`)
    .join('\n') + '\n'

export const parseLog = line => {
  const [, date, text] = line.split(/\[([^\]]+)\] /)
  return { date: new Date(date), text }
}

const createSingleLogStream = path => {
  const tr = new Transform({
    transform (text, _, callback) {
      callback(null, formatLog(String(text)))
    }
  })
  const ws = rfs.createStream(basename(path), {
    size: '10M',
    compress: 'gzip',
    maxFiles: 1,
    path: dirname(path),
    history: `.${basename(path)}.history`
  })
  tr.pipe(ws)
  return tr
}

class PrefixStream extends Transform {
  constructor (prefix) {
    super()
    this.prefix = prefix
  }

  _transform (chunk, _, callback) {
    callback(null, chunk
      .toString()
      .trimEnd()
      .split(/\n/g)
      .map(line => `${this.prefix}${line}`)
      .join('\n') + '\n')
  }
}

export const createLogStream = path => {
  const logStream = new PassThrough()
  logStream
    .pipe(new PrefixStream(`[${basename(path, '.log')}] `))
    .pipe(createSingleLogStream(paths.allLogs))
  logStream.pipe(createSingleLogStream(path))
  return logStream
}

export class SerializeStream extends Transform {
  constructor () {
    super({ objectMode: true })
  }

  _transform (obj, _, callback) {
    callback(null, JSON.stringify(obj))
  }
}

const getLogFilePath = module => {
  return module
    ? join(paths.moduleLogs, `${module}.log`)
    : paths.allLogs
}

/**
 * @param {string=} module
 */
export const getLatestLogs = async module => {
  return await fs.readFile(getLogFilePath(module))
}

export const followLogs = async function * (module) {
  const tail = new Tail(getLogFilePath(module), {
    nLines: 10,
    useWatchFile: platform() === 'win32'
  })
  for await (const [line] of on(tail, 'line')) {
    yield line
  }
}

export const maybeCreateLogFile = module =>
  maybeCreateFile(getLogFilePath(module))
