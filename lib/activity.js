import paths from './paths.js'
import { SerializeStream } from './log.js'

export const createActivityStream = () => {
  const serializeStream = new SerializeStream()
  serializeStream.pipe(createLogStream(paths.activity))
  return serializeStream
}