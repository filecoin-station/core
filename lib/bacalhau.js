import timers from 'node:timers/promises'
import { execa } from 'execa'
import { join } from 'node:path'
import { platform, arch } from 'node:os'
import { fetch } from 'undici'
import * as Sentry from '@sentry/node'
import { install as installModule } from './modules.js'

export async function install () {
  const distTag = 'v0.3.28'
  await installModule({
    repo: 'bacalhau-project/bacalhau',
    executable: 'bacalhau',
    distTag,
    targets: [
      { platform: 'darwin', arch: 'x64', asset: `bacalhau_${distTag}_darwin_amd64.tar.gz` },
      { platform: 'darwin', arch: 'arm64', asset: `bacalhau_${distTag}_darwin_arm64.tar.gz` },
      { platform: 'linux', arch: 'x64', asset: `bacalhau_${distTag}_linux_amd64.tar.gz` },
      { platform: 'linux', arch: 'arm64', asset: `bacalhau_${distTag}_linux_arm64.tar.gz` },
      { platform: 'win32', arch: 'x64', asset: `bacalhau_${distTag}_windows_amd64.tar.gz` }
    ]
  })
}

export async function start ({
  FIL_WALLET_ADDRESS,
  storagePath,
  // MAX_DISK_SPACE,
  metricsStream,
  activityStream,
  binariesPath,
  logStream
}) {
  logStream.write('Starting Bacalhau')

  const childProcess = execa(
    join(
      binariesPath,
      `bacalhau-${platform()}-${arch()}`,
      `bacalhau${platform() === 'win32' ? '.exe' : ''}`
    ),
    [
      'serve',
      '--log-mode=station',
      '--node-type=compute'
    ],
    {
      env: {
        FIL_WALLET_ADDRESS,
        ROOT_DIR: storagePath,
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

        logStream.write('Bacalhau is up and ready')
        childProcess.stdout.off('data', readyHandler)
        activityStream.write({
          type: 'info',
          message: 'Bacalhau module started.'
        })
        setInterval(() => {
          updateStats({ metricsStream, apiUrl })
            .catch(err => {
              logStream.write('Cannot fetch Bacalhau module stats.', err)
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
      `Bacalhau closed all stdio with code ${code ?? '<no code>'}`
    )
    childProcess.stderr.removeAllListeners()
    childProcess.stdout.removeAllListeners()
    Sentry.captureException('Bacalhau exited')
  })

  childProcess.on('exit', (code, signal) => {
    const reason = signal ? `via signal ${signal}` : `with code: ${code}`
    const msg = `Bacalhau exited ${reason}`
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
    const message = `Cannot start Bacalhau: ${errorMsg}`
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
    const msg = 'Cannot fetch Bacalhau stats: ' +
      `${res.status}\n${await res.text().catch(noop)}`
    throw new Error(msg)
  }

  const stats = await res.json()

  const totalJobsCompleted = stats?.totalJobsCompleted
  if (typeof totalJobsCompleted !== 'number') {
    const msg = 'Unexpected stats response - totalJobsCompleted is not a ' +
      'number. Is: ' + JSON.stringify(stats)
    throw new Error(msg)
  }
  metricsStream.write({ totalJobsCompleted, totalEarnings: '0' })
}

function noop () {
  // no-op
}
