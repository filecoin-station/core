import { join, dirname } from 'node:path'
import { homedir, platform } from 'node:os'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'
import assert from 'node:assert'

const {
  ROOT_DIR,
  LOCALAPPDATA,
  XDG_STATE_HOME = join(homedir(), '.local', 'state')
} = process.env

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(await fs.readFile(join(repoRoot, 'package.json')))

export const getPaths = root => ({
  repoRoot,
  metrics: join(root, 'logs', 'metrics.log'),
  activity: join(root, 'logs', 'activity.log'),
  moduleStorage: join(root, 'modules'),
  moduleLogs: join(root, 'logs', 'modules'),
  allLogs: join(root, 'logs', 'all.log'),
  moduleBinaries: join(repoRoot, 'modules'),
  lockFile: join(root, '.lock')
})

const getRoot = () => {
  if (ROOT_DIR) {
    return ROOT_DIR
  }

  switch (platform()) {
    case 'darwin':
      return join(
        homedir(),
        'Library',
        'Application Support',
        'app.filstation.core'
      )
    case 'win32':
      assert(LOCALAPPDATA, '%LOCALAPPDATA% required')
      return join(LOCALAPPDATA, pkg.name)
    case 'linux':
      return join(XDG_STATE_HOME, pkg.name)
    default:
      throw new Error(`Unsupported platform: ${platform()}`)
  }
}

export const paths = getPaths(getRoot())
