import fs from 'node:fs/promises'

export const maybeCreateFile = async (path, content = '') => {
  try {
    await fs.writeFile(path, content, { flag: 'wx' })
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err
    }
  }
}
