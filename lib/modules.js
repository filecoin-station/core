import * as os from 'node:os'
import assert from 'node:assert'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdir, chmod } from 'node:fs/promises'
import { fetch } from 'undici'
import { pipeline } from 'node:stream/promises'
import gunzip from 'gunzip-maybe'
import tar from 'tar-fs'
import unzip from 'unzip-stream'
import { once } from 'node:events'
import { createWriteStream } from 'node:fs'

const { GITHUB_TOKEN } = process.env
const authorization = GITHUB_TOKEN ? `Bearer ${GITHUB_TOKEN}` : undefined

export const install = async ({
  repo,
  distTag,
  executable,
  executableFrom,
  targets,
  arch = os.arch()
}) => {
  console.log('GitHub client:', authorization ? 'authorized' : 'anonymous')
  const target = targets.find(target =>
    target.platform === os.platform() && target.arch === arch
  )
  assert(target, `Unsupported platform: ${os.platform()} ${arch}`)

  const outDir = join(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    'modules'
  )
  await mkdir(outDir, { recursive: true })

  const outName = `${executable}-${os.platform()}-${arch}`
  const outFile = join(outDir, outName)

  console.log(' ⇣ downloading %s', outName)
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
      `Cannot fetch ${executable} binary ${os.platform()} ${arch}: ${res.status}\n` +
      await res.text()
    )
  }

  if (!res.body) {
    throw new Error(
      `Cannot fetch ${executable} binary ${os.platform()} ${arch}: no response body`
    )
  }

  if (target.asset.endsWith('tar.gz')) {
    await pipeline(res.body, gunzip(), tar.extract(outFile))
  } else {
    await mkdir(join(outDir, outName), { recursive: true })
    const parser = unzip.Parse()
    await Promise.all([
      (async () => {
        while (true) {
          const [entry] =
            /** @type {[UnzipStreamEntry]} */
            (await once(parser, 'entry'))
          if (entry.path === executableFrom) {
            const outPath = join(outDir, outName, executable)
            await pipeline(entry, createWriteStream(outPath))
            await chmod(outPath, 0o755)
            return
          }
        }
      })(),
      pipeline(res.body, parser)
    ])
  }
  console.log(' ✓ %s', outFile)
}
