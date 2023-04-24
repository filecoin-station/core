import { arch, platform } from 'node:os'
import assert from 'node:assert'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdir } from 'node:fs/promises'
import { fetch } from 'undici'
import { pipeline } from 'node:stream/promises'
import gunzip from 'gunzip-maybe'
import tar from 'tar-fs'

const { GITHUB_TOKEN } = process.env
const authorization = GITHUB_TOKEN ? `Bearer ${GITHUB_TOKEN}` : undefined

export const install = async ({ repo, distTag, executable, targets }) => {
  console.log('GitHub client:', authorization ? 'authorized' : 'anonymous')
  const target = targets.find(target =>
    target.platform === platform() && target.arch === arch()
  )
  assert(target, `Unsupported platform: ${platform()} ${arch()}`)

  const outDir = join(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    'modules'
  )
  await mkdir(outDir, { recursive: true })

  const outName = `${executable}-${platform()}-${arch()}`
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
      `Cannot fetch ${executable} binary ${platform()} ${arch()}: ${res.status}\n` +
      await res.text()
    )
  }

  if (!res.body) {
    throw new Error(
      `Cannot fetch ${executable} binary ${platform()} ${arch()}: no response body`
    )
  }

  await pipeline(res.body, gunzip(), tar.extract(outFile))
  console.log(' ✓ %s', outFile)
}
