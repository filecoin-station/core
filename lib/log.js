import { pipeline, Transform, PassThrough } from 'node:stream'
import rfs from 'rotating-file-stream'
import { basename, dirname } from 'node:path'
import { paths } from './paths.js'

export const formatLog = text =>
  text
    .trimEnd()
    .split(/\n/g)
    .map(line => `[${new Date().toLocaleTimeString()}] ${line}`)
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
  pipeline(tr, ws, console.error)
  return tr
}

export const createLogStream = path => {
  const logStream = new PassThrough()
  pipeline(logStream, createSingleLogStream(path), console.error)
  pipeline(logStream, createSingleLogStream(paths.allLogs), console.error)
  return logStream
}
