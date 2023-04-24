import timers from 'node:timers/promises'
import { execa } from 'execa'
import { join, dirname } from 'node:path'
import { arch, platform } from 'node:os'
import { fetch } from 'undici'
import * as Sentry from '@sentry/node'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { pipeline } from 'node:stream/promises'
import tar from 'tar-fs'
import gunzip from 'gunzip-maybe'
import assert from 'node:assert'

export async function install () {
  const { GITHUB_TOKEN } = process.env
  const DIST_TAG = 'v0.3.28'
  const targets = [
    { platform: 'darwin', arch: 'x64', url: 'darwin_amd64' },
    { platform: 'darwin', arch: 'arm64', url: 'darwin_arm64' },
    { platform: 'linux', arch: 'x64', url: 'linux_amd64' },
    { platform: 'linux', arch: 'arm64', url: 'linux_arm64' },
    { platform: 'win32', arch: 'x64', url: 'windows_amd64' }
  ]
  const authorization = GITHUB_TOKEN ? `Bearer ${GITHUB_TOKEN}` : undefined
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

  const outName = `bacalhau-${platform()}-${arch()}`
  const outFile = join(outDir, outName)

  console.log(' ⇣ downloading %s', outName)
  const res = await fetch(
    `https://github.com/bacalhau-project/bacalhau/releases/download/${DIST_TAG}/bacalhau_${DIST_TAG}_${target.url}.tar.gz`,
    {
      headers: {
        ...(authorization ? { authorization } : {})
      },
      redirect: 'follow'
    }
  )

  if (res.status >= 300) {
    throw new Error(
      `Cannot fetch bacalhau binary ${platform()} ${arch()}: ${res.status}\n` +
      await res.text()
    )
  }

  if (!res.body) {
    throw new Error(
      `Cannot fetch bacalhau binary ${platform()} ${arch()}: no response body`
    )
  }

  await pipeline(res.body, gunzip(), tar.extract(outFile))
  console.log(' ✓ %s', outFile)
}

export async function start ({
  /* FIL_WALLET_ADDRESS,
  MAX_DISK_SPACE,
  storagePath,
  binariesPath,
  metricsStream,
  activityStream, */
  logStream
}) {
  logStream.write('Starting Bacalhau')

  /* const childProcess = execa(
    join(
      binariesPath,
      `saturn-L2-node-${platform()}-${archOverwritten}`,
      `saturn-L2-node${platform() === 'win32' ? '.exe' : ''}`
    ), {
      env: {
        ROOT_DIR: storagePath,
        FIL_WALLET_ADDRESS,
        MAX_L2_DISK_SPACE: MAX_DISK_SPACE
      }
    }
  )

  const readyPromise = new Promise((resolve, reject) => {
    childProcess.stdout.setEncoding('utf-8')
    childProcess.stdout.on('data', data => {
      logStream.write(data)
      handleActivityLogs(activityStream, data)
    })

    childProcess.stderr.setEncoding('utf-8')
    childProcess.stderr.on('data', data => {
      logStream.write(data)
    })

    let output = ''

    const readyHandler = data => {
      output += data.toString()

      const apiMatch = output.match(/^API: (http.*)$/m)
      if (apiMatch) {
        const apiUrl = apiMatch[1]

        logStream.write('Saturn node is up and ready')
        childProcess.stdout.off('data', readyHandler)
        activityStream.write({
          type: 'info',
          message: 'Saturn module started.'
        })
        setInterval(() => {
          updateStats({ metricsStream, apiUrl })
            .catch(err => {
              logStream.write('Cannot fetch Saturn module stats.', err)
            })
        }, 1000).unref()
        resolve()
      }
    }
    childProcess.stdout.on('data', readyHandler)
    childProcess.catch(reject)
  })

  childProcess.on('close', code => {
    logStream.write(
      `Saturn node closed all stdio with code ${code ?? '<no code>'}`
    )
    childProcess.stderr.removeAllListeners()
    childProcess.stdout.removeAllListeners()
    Sentry.captureException('Saturn node exited')
  })

  childProcess.on('exit', (code, signal) => {
    const reason = signal ? `via signal ${signal}` : `with code: ${code}`
    const msg = `Saturn node exited ${reason}`
    logStream.write(msg)
    activityStream.write({ type: 'info', message: msg })
  })

  try {
    await Promise.race([
      readyPromise,
      timers.setTimeout(500)
    ])
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : '' + err
    const message = `Cannot start Saturn node: ${errorMsg}`
    logStream.write(message)
    activityStream.write({ type: 'error', message })
  } */
}

/* function handleActivityLogs (activityStream, text) {
  text
    .trimEnd()
    .split(/\n/g)
    .forEach(line => {
      const m = line.match(/^(INFO|ERROR): (.*)$/)
      if (m) {
        activityStream.write({ type: m[1].toLowerCase(), message: m[2] })
      }
    })
}

async function updateStats ({ metricsStream, apiUrl }) {
  const res = await fetch(apiUrl.replace('localhost', '127.0.0.1') + 'stats')
  if (!res.ok) {
    const msg = 'Cannot fetch Saturn node stats: ' +
      `${res.status}\n${await res.text().catch(noop)}`
    throw new Error(msg)
  }

  const stats = await res.json()

  const totalJobsCompleted = stats?.NSuccessfulRetrievals
  if (typeof totalJobsCompleted !== 'number') {
    const msg = 'Unexpected stats response - NSuccessfulRetrievals is not a ' +
      'number. Stats: ' + JSON.stringify(stats)
    throw new Error(msg)
  }
  metricsStream.write({ totalJobsCompleted, totalEarnings: '0' })
}

function noop () {
  // no-op
} */
