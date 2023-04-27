import { SerializeStream, parseLog, formatLog } from './log.js'
import { Transform } from 'node:stream'
import { maybeCreateFile } from './util.js'
import { Tail } from 'tail'
import { on } from 'node:events'
import fs from 'node:fs/promises'
import { platform } from 'node:os'
import { randomUUID } from 'node:crypto'

class AddMetaStream extends Transform {
  constructor ({ source }) {
    super({ objectMode: true })
    this.source = source
  }

  _transform (obj, _, callback) {
    callback(null, { source: this.source, id: randomUUID(), ...obj })
  }
}

const activityLogLineToObject = line => {
  const { date, text } = parseLog(line)
  const { type, message, source, id } = JSON.parse(text)
  return { timestamp: date.toJSON(), type, source, message, id }
}

export class Activity {
  constructor (core) {
    this.core = core
  }

  async get () {
    return (await fs.readFile(this.core.paths.activity, 'utf-8'))
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => activityLogLineToObject(line))
  }

  async * follow ({ signal, nLines = 10 } = {}) {
    const tail = new Tail(this.core.paths.activity, {
      nLines,
      useWatchFile: platform() === 'win32'
    })
    for await (const [line] of on(tail, 'line', { signal })) {
      yield activityLogLineToObject(line)
    }
  }

  createWriteStream (source) {
    const addMetaStream = new AddMetaStream({ source })
    addMetaStream
      .pipe(new SerializeStream())
      .pipe(this.core.logs.createWriteStream(this.core.paths.activity))
    return addMetaStream
  }

  async maybeCreateActivityFile () {
    await maybeCreateFile(this.core.paths.activity)
  }
}

export const formatActivityObject = ({ type, message, timestamp }) => {
  return formatLog(
    `${type.toUpperCase().padEnd(5)} ${message}`,
    new Date(timestamp)
  )
}
