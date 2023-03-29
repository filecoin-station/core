import { join, dirname } from 'node:path'
import { homedir, platform } from 'node:os'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert'

const {
  CACHE_ROOT,
  STATE_ROOT,
  LOCALAPPDATA,
  XDG_CACHE_HOME = join(homedir(), '.local', 'cache'),
  XDG_STATE_HOME = join(homedir(), '.local', 'state')
} = process.env

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

export const getPaths = (cacheRoot, stateRoot) => ({
  repoRoot,
  metrics: join(stateRoot, 'logs', 'metrics.log'),
  activity: join(stateRoot, 'logs', 'activity.log'),
  moduleCache: join(cacheRoot, 'modules'),
  moduleState: join(stateRoot, 'modules'),
  moduleLogs: join(stateRoot, 'logs', 'modules'),
  allLogs: join(stateRoot, 'logs', 'all.log'),
  moduleBinaries: join(repoRoot, 'modules'),
  lockFile: join(stateRoot, '.lock')
})

const getRootDirs = () => {
  switch (platform()) {
    case 'darwin':
      return [
        CACHE_ROOT ||
          join(homedir(), 'Library', 'Caches', 'app.filstation.core'),
        STATE_ROOT ||
          join(
            homedir(),
            'Library',
            'Application Support',
            'app.filstation.core'
          )
      ]
    case 'win32':
      assert(LOCALAPPDATA, '%LOCALAPPDATA% required')
      return [
        CACHE_ROOT || join(LOCALAPPDATA, 'Filecoin Station Core', 'Cache'),
        STATE_ROOT || join(LOCALAPPDATA, 'Filecoin Station Core', 'State')
      ]
    case 'linux':
      return [
        CACHE_ROOT || join(XDG_CACHE_HOME, 'filecoin-station-core'),
        STATE_ROOT || join(XDG_STATE_HOME, 'filecoin-station-core')
      ]
    default:
      throw new Error(`Unsupported platform: ${platform()}`)
  }
}

export const paths = getPaths(...getRootDirs())
