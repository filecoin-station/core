import { pipeline, Transform } from 'node:stream'
import { createWriteStream } from 'node:fs'

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
  const ws = createWriteStream(
    path,
    { flags: 'a' }
  )
  pipeline(tr, ws, console.error)
  return tr
}

export { createLogStream }
