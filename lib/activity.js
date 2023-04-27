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

class ActivityEvent {
  /**
   * @param {Object} options
   * @param {Date} options.timestamp
   * @param {String} options.type
   * @param {String} options.source
   * @param {String} options.message
   * @param {String} options.id
   */
  constructor ({ timestamp, type, source, message, id }) {
    this.timestamp = timestamp
    this.type = type
    this.source = source
    this.message = message
    this.id = id
  }

  /**
   * @param {String} line
   * @returns {ActivityEvent}
   */
  static fromLogLine (line) {
    const { date, text } = parseLog(line)
    const { type, message, source, id } = JSON.parse(text)
    return new ActivityEvent({
      timestamp: date.toJSON(),
      type,
      source,
      message,
      id
    })
  }
}

export class Activity {
  constructor (core) {
    this.core = core
  }

  /**
   * @returns {Promise<[ActivityEvent]>}
   */
  async get () {
    return (await fs.readFile(this.core.paths.activity, 'utf-8'))
      .trim()
      .split('\n')
      .filter(Boolean)
      .map(line => ActivityEvent.fromLogLine(line))
  }

  /**
   * @param {Object} [options]
   * @param {AbortSignal} [options.signal]
   * @param {number} [ptions.nLines=10]
   * @returns {AsyncGenerator<ActivityEvent>}
   */
  async * follow ({ signal, nLines = 10 } = {}) {
    const tail = new Tail(this.core.paths.activity, {
      nLines,
      useWatchFile: platform() === 'win32'
    })
    for await (const [line] of on(tail, 'line', { signal })) {
      yield ActivityEvent.fromLogLine(line)
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
