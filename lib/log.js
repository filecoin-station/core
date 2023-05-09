'use strict'

const { Transform, PassThrough } = require('node:stream')
const rfs = require('rotating-file-stream')
const { basename, dirname, join } = require('node:path')
const { maybeCreateFile } = require('./util')
const fs = require('node:fs/promises')
const { Tail } = require('tail')
const { platform } = require('node:os')
const { on } = require('node:events')

const formatLog = (
  text,
  { timestamp = new Date(), pretty = false } = {}
) => {
  const timestampFormatted = pretty
    ? timestamp.toLocaleString()
    : timestamp.toISOString()
  return text
    .trimEnd()
    .split(/\n/g)
    .map(line => `[${timestampFormatted}] ${line}`)
    .join('\n') + '\n'
}

const parseLog = line => {
  const [, timestamp, text = ''] = /\[([^\]]+)\] (.+)?/.exec(line)
  return { timestamp: new Date(timestamp), text }
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

class SerializeStream extends Transform {
  constructor () {
    super({ objectMode: true })
  }

  _transform (obj, _, callback) {
    callback(null, JSON.stringify(obj))
  }
}

class Logs {
  constructor (moduleLogsPath, allLogsPath) {
    this.moduleLogsPath = moduleLogsPath
    this.allLogsPath = allLogsPath
  }

  #getLogFilePath (module) {
    return module
      ? join(this.moduleLogsPath, `${module}.log`)
      : this.allLogsPath
  }

  /**
   * @param {string} [module]
   * @returns {Promise<string>}
   */
  async get (module) {
    return await fs.readFile(this.#getLogFilePath(module), { encoding: 'utf-8' })
  }

  /**
   * @param {string} [module]
   * @returns {AsyncGenerator<string>}
   */
  async * follow (module) {
    const tail = new Tail(this.#getLogFilePath(module), {
      nLines: 10,
      useWatchFile: platform() === 'win32'
    })
    for await (const [line] of on(tail, 'line')) {
      yield line
    }
  }

  async maybeCreateLogFile (module) {
    await maybeCreateFile(this.#getLogFilePath(module))
  }

  createWriteStream (path) {
    const logStream = new PassThrough()
    logStream
      .pipe(new PrefixStream(`[${basename(path, '.log')}] `))
      .pipe(createSingleLogStream(this.allLogsPath))
    logStream.pipe(createSingleLogStream(path))
    return logStream
  }
}

module.exports = {
  formatLog,
  parseLog,
  SerializeStream,
  Logs
}
