import { paths } from './paths.js'
import { createLogStream, SerializeStream } from './log.js'
import { Transform } from 'node:stream'

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
