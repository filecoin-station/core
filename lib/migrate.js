import { join } from 'node:path'
import { stat, rename } from 'node:fs/promises'
import { getDefaultRootDirs } from './paths.js'
import { getOldStateRoot } from './paths.js'

const exists = path => stat(path).then(() => true).catch(() => false)

export const maybeMigrateRuntimeState = async () => {
  const newRuntimeStatePath = getDefaultRootDirs().runtimeState
  const oldRuntimeStatePath = join(getOldStateRoot(), 'modules')
  console.log({ newRuntimeStatePath, oldRuntimeStatePath})
  if (!(await exists(newRuntimeStatePath)) && await exists(oldRuntimeStatePath)) {
    console.error(
      `Migrating runtime state files from ${oldRuntimeStatePath} to ${newRuntimeStatePath}`
    )
    await rename(oldRuntimeStatePath, newRuntimeStatePath)
    console.error('Migration complete')
  }
}