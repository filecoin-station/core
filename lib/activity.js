import { paths } from './paths.js'
import { createLogStream, SerializeStream, parseLog } from './log.js'
import { Transform } from 'node:stream'
import { maybeCreateFile } from './util.js'
import { Tail } from 'tail'
import { on } from 'node:events'
import fs from 'node:fs/promises'
import { platform } from 'node:os'

class AddSourceStream extends Transform {
  constructor (source) {
    super({ objectMode: true })
    this.source = source
  }

  _transform (obj, _, callback) {
    callback(null, { source: this.source, ...obj })
  }
}

export const createActivityStream = source => {
  const addSourceStream = new AddSourceStream(source)
  addSourceStream
    .pipe(new SerializeStream())
    .pipe(createLogStream(paths.activity))
  return addSourceStream
}

const activityLogLineToObject = line => {
  const { date, text } = parseLog(line)
  const { type, message, source } = JSON.parse(text)
  return { timestamp: date.toJSON(), type, source, message }
}

export const followActivity = async function * ({ signal } = {}) {
  const tail = new Tail(paths.activity, {
    nLines: 10,
    useWatchFile: platform() === 'win32'
  })
  for await (const [line] of on(tail, 'line', { signal })) {
    yield activityLogLineToObject(line)
  }
}

export const getActivity = async () => {
  return (await fs.readFile(paths.activity, 'utf-8'))
    .trim()
    .split('\n')
    .filter(Boolean)
    .map(line => activityLogLineToObject(line))
}

export const maybeCreateActivityFile = () => maybeCreateFile(paths.activity)
