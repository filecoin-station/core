import os from 'node:os'
import assert from 'node:assert'
import { join } from 'node:path'
import { mkdir, chmod, rm, readFile, writeFile } from 'node:fs/promises'
import { fetch } from 'undici'
import { pipeline } from 'node:stream/promises'
import gunzip from 'gunzip-maybe'
import tar from 'tar-fs'
import unzip from 'unzip-stream'
import { createWriteStream } from 'node:fs'
import { moduleBinaries } from './paths.js'
import * as Name from 'w3name'

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
    await pipeline(res.body, gunzip(), tar.extract(outFile))
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

async function getLatestCID (ipnsKey) {
  const name = Name.parse(ipnsKey)
  const revision = await Name.resolve(name)
  // /ipfs/:cid
  return revision.value.split('/').pop()
}

async function getLastSeenModuleCID ({ module, moduleVersionsDir }) {
  try {
    return await readFile(join(moduleVersionsDir, module), 'utf-8')
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err
    }
  }
  return undefined
}

async function setLastSeenModuleCID ({ module, cid, moduleVersionsDir }) {
  await mkdir(moduleVersionsDir, { recursive: true })
  await writeFile(join(moduleVersionsDir, module), cid)
}

export async function updateSourceFiles ({ module, ipnsKey, moduleVersionsDir }) {
  await mkdir(moduleBinaries, { recursive: true })
  const outDir = join(moduleBinaries, module)

  const lastSeenCID = await getLastSeenModuleCID({ module, moduleVersionsDir })
  if (lastSeenCID !== undefined) {
    // Use `console.error` because with `--json` stdout needs to be JSON only
    console.error(`[${module}]  ⇣ checking for updates`)
  }

  const cid = await getLatestCID(ipnsKey)
  const isUpdate = lastSeenCID !== cid
  if (!isUpdate) {
    console.error(`[${module}]  ✓ no update available`)
    return isUpdate
  }

  const url = `https://${cid}.ipfs.w3s.link`
  console.error(`[${module}]  ⇣ downloading source files via ${url}`)
  const res = await fetch(url)

  if (res.status >= 300) {
    throw new Error(
      `[${module}] Cannot fetch ${module} archive for ${cid}: ${res.status}\n` +
      await res.text()
    )
  }

  if (!res.body) {
    throw new Error(
      `[${module}] Cannot fetch ${module} archive for ${cid}: no response body`
    )
  }

  try {
    // `{ strip: 1}` tells tar to remove the top-level directory (e.g. `mod-peer-checker-v1.0.0`)
    await pipeline(res.body, gunzip(), tar.extract(outDir, { strip: 1 }))
  } catch (err) {
    await rm(outDir, { recursive: true })
    throw err
  }

  await setLastSeenModuleCID({ module, cid, moduleVersionsDir })
  console.error(`[${module}]  ✓ ${outDir}`)

  return isUpdate
}
