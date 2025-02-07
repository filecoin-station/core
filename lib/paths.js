import { join } from 'node:path'
import { homedir, platform } from 'node:os'
import assert from 'node:assert'
import { fileURLToPath } from 'node:url'

const {
  CACHE_ROOT,
  STATE_ROOT,
  LOCALAPPDATA,
  TEMP,
  XDG_CACHE_HOME = join(homedir(), '.cache'),
  XDG_STATE_HOME = join(homedir(), '.local', 'state')
} = process.env

export const getPaths = ({ cacheRoot, stateRoot }) => ({
  secrets: join(stateRoot, 'secrets'),
  runtimeCache: join(cacheRoot, 'runtimes'),
  runtimeState: join(stateRoot, 'runtimes'),
  subnetSourcesDir: join(cacheRoot, 'subnets', 'sources'),
  subnetVersionsDir: join(stateRoot, 'subnets', 'latest'),
  lockFile: join(stateRoot, '.lock')
})

export const getDefaultRootDirs = () => {
  switch (platform()) {
    case 'darwin': {
      const appId = 'network.checker.node'
      return {
        cacheRoot: CACHE_ROOT || join(homedir(), 'Library', 'Caches', appId),
        stateRoot: STATE_ROOT ||
          join(homedir(), 'Library', 'Application Support', appId)
      }
    }
    case 'win32': {
      assert(TEMP || CACHE_ROOT, '%TEMP% required')
      assert(LOCALAPPDATA || STATE_ROOT, '%LOCALAPPDATA% required')
      const appName = 'Checker Network Node'
      return {
        cacheRoot: CACHE_ROOT || join(TEMP, appName),
        // We must use LOCALAPPDATA (not APPDATA) to avoid sharing the state with other computers
        // inside Windows Domain
        stateRoot: STATE_ROOT || join(LOCALAPPDATA, appName)
      }
    }
    case 'linux': {
      const appSlug = 'checker-network-node'
      return {
        cacheRoot: CACHE_ROOT || join(XDG_CACHE_HOME, appSlug),
        stateRoot: STATE_ROOT || join(XDG_STATE_HOME, appSlug)
      }
    }
    default:
      throw new Error(`Unsupported platform: ${platform()}`)
  }
}

export const paths = getPaths(getDefaultRootDirs())
export const runtimeBinaries = fileURLToPath(
  new URL('../runtimes', import.meta.url)
)
export const packageJSON = fileURLToPath(
  new URL('../package.json', import.meta.url)
)
