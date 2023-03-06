import { join, dirname } from 'node:path'
import { homedir } from 'node:os'
import { fileURLToPath } from 'node:url'

export const getPaths = xdgStateHome => ({
  metrics: join(xdgStateHome, 'filecoin-station', 'logs', 'metrics.log'),
  moduleStorage: join(xdgStateHome, 'filecoin-station', 'modules'),
  moduleLogs: join(xdgStateHome, 'filecoin-station', 'logs', 'modules'),
  moduleBinaries: join(dirname(fileURLToPath(import.meta.url)), '..', 'modules')
})

export const paths = getPaths(
  process.env.XDG_STATE_HOME || join(homedir(), '.local', 'state')
)
