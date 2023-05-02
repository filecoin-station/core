import * as os from 'node:os'
import assert from 'node:assert'
import { join } from 'node:path'
import { mkdir, chmod } from 'node:fs/promises'
import { fetch } from 'undici'
import { pipeline } from 'node:stream/promises'
import gunzip from 'gunzip-maybe'
import tar from 'tar-fs'
import unzip from 'unzip-stream'
import { once } from 'node:events'
import { createWriteStream } from 'node:fs'
import { moduleBinaries } from './paths.js'

const { GITHUB_TOKEN } = process.env
const authorization = GITHUB_TOKEN ? `Bearer ${GITHUB_TOKEN}` : undefined

export const getBinaryModuleExecutable = ({
  module,
  executable
}) => {
  return join(
    moduleBinaries,
    module,
    `${executable}${os.platform() === 'win32' ? '.exe' : ''}`
  )
}

export const installBinaryModule = async ({
  module,
  repo,
  distTag,
  executable,
  arch = os.arch(),
  targets
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
    await Promise.all([
      (async () => {
        while (true) {
          const [entry] =
            /** @type {[UnzipStreamEntry]} */
            (await once(parser, 'entry'))
          if (entry.path === executable) {
            const outPath = join(moduleBinaries, module, executable)
            await pipeline(entry, createWriteStream(outPath))
            await chmod(outPath, 0o755)
            return
          }
        }
      })(),
      pipeline(res.body, parser)
    ])
  }
  console.log(`[${module}] ✓ ${outFile}`)
}

export async function downloadSourceFiles ({ module, repo, distTag }) {
  await mkdir(moduleBinaries, { recursive: true })
  const outDir = join(moduleBinaries, module)

  console.log(`[${module}]  ⇣ downloading source files`)

  const url = `https://${repo}/archive/refs/tags/${distTag}.tar.gz`
  const res = await fetch(url, {
    headers: {
      ...(authorization ? { authorization } : {})
    },
    redirect: 'follow'
  })

  if (res.status >= 300) {
    throw new Error(
      `[${module}] Cannot fetch ${module} archive for tag ${distTag}: ${res.status}\n` +
      await res.text()
    )
  }

  if (!res.body) {
    throw new Error(
      `[${module}] Cannot fetch ${module} archive for tag ${distTag}: no response body`
    )
  }

  // `{ strip: 1}` tells tar to remove the top-level directory (e.g. `mod-peer-checker-v1.0.0`)
  await pipeline(res.body, gunzip(), tar.extract(outDir, { strip: 1 }))
  console.log(`[${module}]  ✓ ${outDir}`)
}
