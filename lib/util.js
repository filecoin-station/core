'use strict'

const fs = require('node:fs/promises')

const maybeCreateFile = async (path, content = '') => {
  try {
    await fs.writeFile(path, content, { flag: 'wx' })
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err
    }
  }
}

module.exports = {
  maybeCreateFile
}
