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
  const sentryBuffer = []
  const tr = new Transform({
    transform (text, _, callback) {
      const formatted = formatLog(String(text))
      sentryBuffer.push(formatted)
      sentryBuffer.splice(0, sentryBuffer.length - 10)
      callback(null, formatted)
    }
  })
  tr.getSentryBuffer = () => sentryBuffer.join('\n')
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
