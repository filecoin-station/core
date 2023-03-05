import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'

const {
  XDG_STATE_HOME = join(homedir(), '.local', 'state')
} = process.env

export const paths = {
  metrics: join(XDG_STATE_HOME, 'filecoin-station', 'logs', 'metrics.log'),
  moduleStorage: join(XDG_STATE_HOME, 'filecoin-station', 'modules'),
  moduleLogs: join(XDG_STATE_HOME, 'filecoin-station', 'logs', 'modules'),
  moduleBinaries: join(dirname(fileURLToPath(import.meta.url)), '..', 'modules')
}
