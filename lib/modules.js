import os from 'node:os'
import assert from 'node:assert'
import { join } from 'node:path'
import { mkdir, chmod } from 'node:fs/promises'
import { fetch } from 'undici'
import { pipeline } from 'node:stream/promises'
import unzip from 'unzip-stream'
import { createWriteStream } from 'node:fs'
import { moduleBinaries } from './paths.js'
import * as tar from 'tar'

/** @typedef {import('unzip-stream').UnzipStreamEntry} UnzipStreamEntry */

const { GITHUB_TOKEN } = process.env
const authorization = GITHUB_TOKEN ? `Bearer ${GITHUB_TOKEN}` : undefined

export const getBinaryModuleExecutable = ({
  module,
  executable
}) => {
  return join(
    moduleBinaries,
    module,
    getExecutableFileName(executable)
  )
}

const getExecutableFileName = executable => {
  return `${executable}${os.platform() === 'win32' ? '.exe' : ''}`
}

export const installBinaryModule = async ({
  module,
  repo,
  distTag,
  executable,
  targets,
  arch
}) => {
  console.log(
    `[${module}] GitHub client: ${authorization ? 'authorized' : 'anonymous'}`
  )
  const target = targets.find(target =>
    target.platform === os.platform() && target.arch === arch
  )
  assert(target, `[${module}] Unsupported platform: ${os.platform()} ${arch}`)

  await mkdir(moduleBinaries, { recursive: true })
  const outFile = join(moduleBinaries, module)

  console.log(`[${module}] ⇣ downloading ${os.platform()} ${arch}`)
  const res = await fetch(
    `https://github.com/${repo}/releases/download/${distTag}/${target.asset}`,
    {
      headers: {
        ...(authorization ? { authorization } : {})
      },
      redirect: 'follow'
    }
  )

  if (res.status >= 300) {
    throw new Error(
      `[${module}] Cannot fetch binary ${os.platform()} ${arch}: ${res.status}\n` +
      await res.text()
    )
  }

  if (!res.body) {
    throw new Error(
      `[${module}] Cannot fetch binary ${os.platform()} ${arch}: no response body`
    )
  }

  if (target.asset.endsWith('tar.gz')) {
    await mkdir(outFile, { recursive: true })
    await pipeline(
      /** @type {any} */(res.body),
      /** @type {any} */(tar.x({ C: outFile }))
    )
  } else {
    await mkdir(join(moduleBinaries, module), { recursive: true })
    const parser = unzip.Parse()
    parser.on('entry', async entry => {
      const executableFileName = getExecutableFileName(executable)
      const outPath = join(moduleBinaries, module, entry.path)
      await pipeline(entry, createWriteStream(outPath))
      if (entry.path === executableFileName) {
        await chmod(outPath, 0o755)
      }
    })
    await pipeline(res.body, parser)
  }
  console.log(`[${module}] ✓ ${outFile}`)
}
