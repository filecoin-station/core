import timers from 'node:timers/promises'
import { execa } from 'execa'
import { arch, platform } from 'node:os'
import { fetch } from 'undici'
import * as Sentry from '@sentry/node'
import { installBinaryModule, getBinaryModuleExecutable } from './modules.js'

const DIST_TAG = 'v0.5.1'

export async function install () {
  await installBinaryModule({
    module: 'saturn-L2-node',
    repo: 'filecoin-saturn/L2-node',
    distTag: DIST_TAG,
    executable: 'saturn-L2-node',
    arch: platform() === 'darwin' ? 'x64' : arch(),
    targets: [
      { platform: 'darwin', arch: 'x64', asset: 'L2-node_Darwin_x86_64.zip' },
      { platform: 'linux', arch: 'arm64', asset: 'L2-node_Linux_arm64.tar.gz' },
      { platform: 'linux', arch: 'ia32', asset: 'L2-node_Linux_i386.tar.gz' },
      { platform: 'linux', arch: 'x64', asset: 'L2-node_Linux_x86_64.tar.gz' },
      { platform: 'win32', arch: 'x64', asset: 'L2-node_Windows_x86_64.tar.gz' }
    ]
  })
}

async function start ({
  FIL_WALLET_ADDRESS,
  MAX_DISK_SPACE,
  storagePath,
  metricsStream,
  activityStream,
  logStream
}) {
  logStream.write('Starting Saturn node')

  const childProcess = execa(
    getBinaryModuleExecutable({
      module: 'saturn-L2-node',
      executable: 'saturn-L2-node'
    }), {
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
  }
}

function handleActivityLogs (activityStream, text) {
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
}

export { start }
