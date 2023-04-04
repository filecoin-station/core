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
import { platform, arch } from 'node:os'
import assert from 'node:assert'

const SATURN_DIST_TAG = 'v0.5.0'
const githubToken = process.env.GITHUB_TOKEN
const authorization = githubToken ? `Bearer ${githubToken}` : undefined

console.log('GitHub client:', authorization ? 'authorized' : 'anonymous')

const targets = [
  { platform: 'darwin', arch: 'x64', url: 'Darwin_x86_64', archive: 'zip' },
  { platform: 'linux', arch: 'arm64', url: 'Linux_arm64', archive: 'tar.gz' },
  { platform: 'linux', arch: 'ia32', url: 'Linux_i386', archive: 'tar.gz' },
  { platform: 'linux', arch: 'x64', url: 'Linux_x86_64', archive: 'tar.gz' },
  { platform: 'win32', arch: 'x64', url: 'Windows_x86_64', archive: 'tar.gz' }
]

const archOverwritten = platform() === 'darwin' ? 'x64' : arch()
const target = targets.find(target =>
  target.platform === platform() &&
  target.arch === archOverwritten
)
assert(target, `Unsupported platform: ${platform} ${arch}`)

const outDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'modules'
)
await mkdir(outDir)

const outName = `saturn-L2-node-${platform()}-${archOverwritten}`
const outFile = join(outDir, outName)

console.log(' ⇣ downloading %s', outName)
const res = await fetch(
  `https://github.com/filecoin-saturn/L2-node/releases/download/${SATURN_DIST_TAG}/L2-node_${target.url}.${target.archive}`,
  {
    headers: {
      ...(authorization ? { authorization } : {})
    },
    redirect: 'follow'
  }
)

if (res.status >= 300) {
  throw new Error(
    `Cannot fetch saturn-l2 binary ${platform()} ${archOverwritten}: ${res.status}\n` +
    await res.text()
  )
}

if (!res.body) {
  throw new Error(
    `Cannot fetch saturn-l2 binary ${platform()} ${archOverwritten}: no response body`
  )
}

if (target.archive === 'tar.gz') {
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
