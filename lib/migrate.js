import { join } from 'node:path'
import { stat, rename, mkdir } from 'node:fs/promises'
import { paths } from './paths.js'
import { getOldStateRoot } from './paths.js'

const exists = path => stat(path).then(() => true).catch(() => false)

export const maybeMigrateRuntimeState = async () => {
  const newRuntimeStatePath = paths.runtimeState
  const oldRuntimeStatePath = join(getOldStateRoot(), 'modules')
  if (!(await exists(newRuntimeStatePath)) && await exists(oldRuntimeStatePath)) {
    console.error(
      `Migrating runtime state files from ${oldRuntimeStatePath} to ${newRuntimeStatePath}`
    )
    await mkdir(join(newRuntimeStatePath, '..'), { recursive: true })
    await rename(oldRuntimeStatePath, newRuntimeStatePath)
    console.error('Migration complete')
  }
}