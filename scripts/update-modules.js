#!/usr/bin/env node

import { fetch } from 'undici'
import { join, dirname } from 'node:path'
import { mkdir, chmod } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { pipeline } from 'node:stream/promises'
import tar from 'tar-fs'
import gunzip from 'gunzip-maybe'
import unzip from 'unzip-stream'
import { once } from 'node:events'

const SATURN_DIST_TAG = 'v0.4.5'

const githubToken = process.env.GITHUB_TOKEN
const authorization = githubToken ? `Bearer ${githubToken}` : undefined

console.log('GitHub client:', authorization ? 'authorized' : 'anonymous')

const outDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'modules'
)

const targets = [
  { platform: 'darwin', arch: 'x64', url: 'Darwin_x86_64', archive: 'zip' },
  { platform: 'linux', arch: 'arm64', url: 'Linux_arm64', archive: 'tar.gz' },
  { platform: 'linux', arch: 'ia32', url: 'Linux_i386', archive: 'tar.gz' }
]

await Promise.all(targets.map(async ({ platform, arch, url, archive }) => {
  const outName = `saturn-L2-node-${platform}-${arch}`
  console.log(' ⇣ downloading %s', outName)
  const res = await fetch(
    `https://github.com/filecoin-saturn/L2-node/releases/download/${SATURN_DIST_TAG}/L2-node_${url}.${archive}`,
    {
      headers: {
        ...(authorization ? { authorization } : {})
      },
      redirect: 'follow'
    }
  )

  if (res.status >= 300) {
    throw new Error(
      `Cannot fetch saturn-l2 binary ${platform} ${arch}: ${res.status}\n` +
      await res.text()
    )
  }

  if (!res.body) {
    throw new Error(
      `Cannot fetch saturn-l2 binary ${platform} ${arch}: no response body`
    )
  }

  const outFile = join(outDir, outName)

  if (archive === 'tar.gz') {
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
          if (entry.path === 'L2-node') {
            const outPath = join(outDir, outName, 'saturn-L2-node')
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
}))

console.log('✨ DONE ✨')
