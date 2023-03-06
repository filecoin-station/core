import { pipeline, Transform } from 'node:stream'
import rfs from 'rotating-file-stream'
import { basename, dirname } from 'node:path'

const formatLog = text =>
  text
    .trimEnd()
    .split(/\n/g)
    .map(line => `[${new Date().toLocaleTimeString()}] ${line}`)
    .join('\n') + '\n'

const createLogStream = path => {
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
  pipeline(tr, ws, console.error)
  return tr
}

export { createLogStream }
