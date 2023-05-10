'use strict'

const { join } = require('node:path')
const { homedir, platform } = require('node:os')
const assert = require('node:assert')

const {
  CACHE_ROOT,
  STATE_ROOT,
  LOCALAPPDATA,
  TEMP,
  XDG_CACHE_HOME = join(homedir(), '.cache'),
  XDG_STATE_HOME = join(homedir(), '.local', 'state')
} = process.env

const getPaths = ({ cacheRoot, stateRoot }) => ({
  metrics: join(stateRoot, 'logs', 'metrics'),
  allMetrics: join(stateRoot, 'logs', 'metrics', 'all.log'),
  activity: join(stateRoot, 'logs', 'activity.log'),
  moduleCache: join(cacheRoot, 'modules'),
  moduleState: join(stateRoot, 'modules'),
  moduleLogs: join(stateRoot, 'logs', 'modules'),
  allLogs: join(stateRoot, 'logs', 'all.log'),
  lockFile: join(stateRoot, '.lock')
})

const getDefaultRootDirs = () => {
  switch (platform()) {
    case 'darwin': {
      const appId = 'app.filstation.core'
      return {
        cacheRoot: CACHE_ROOT || join(homedir(), 'Library', 'Caches', appId),
        stateRoot: STATE_ROOT ||
          join(homedir(), 'Library', 'Application Support', appId)
      }
    }
    case 'win32': {
      assert(TEMP || CACHE_ROOT, '%TEMP% required')
      assert(LOCALAPPDATA || STATE_ROOT, '%LOCALAPPDATA% required')
      const appName = 'Filecoin Station Core'
      return {
        cacheRoot: CACHE_ROOT || join(TEMP, appName),
        stateRoot: STATE_ROOT || join(LOCALAPPDATA, appName)
      }
    }
    case 'linux': {
      const appSlug = 'filecoin-station-core'
      return {
        cacheRoot: CACHE_ROOT || join(XDG_CACHE_HOME, appSlug),
        stateRoot: STATE_ROOT || join(XDG_STATE_HOME, appSlug)
      }
    }
    default:
      throw new Error(`Unsupported platform: ${platform()}`)
  }
}

module.exports = {
  moduleBinaries: join(__dirname, '..', 'modules'),
  getPaths,
  getDefaultRootDirs
}
