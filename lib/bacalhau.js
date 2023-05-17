'use strict'

const timers = require('node:timers/promises')
const execa = require('execa')
const { fetch } = require('undici')
const Sentry = require('@sentry/node')
const { installBinaryModule, getBinaryModuleExecutable } = require('./modules')

const DIST_TAG = 'v1.0.0'

async function install () {
  await installBinaryModule({
    module: 'bacalhau',
    repo: 'bacalhau-project/bacalhau',
    executable: 'bacalhau',
    distTag: DIST_TAG,
    targets: [
      { platform: 'darwin', arch: 'x64', asset: `bacalhau_${DIST_TAG}_darwin_amd64.tar.gz` },
      { platform: 'darwin', arch: 'arm64', asset: `bacalhau_${DIST_TAG}_darwin_arm64.tar.gz` },
      { platform: 'linux', arch: 'x64', asset: `bacalhau_${DIST_TAG}_linux_amd64.tar.gz` },
      { platform: 'linux', arch: 'arm64', asset: `bacalhau_${DIST_TAG}_linux_arm64.tar.gz` },
      { platform: 'win32', arch: 'x64', asset: `bacalhau_${DIST_TAG}_windows_amd64.tar.gz` }
    ]
  })
}

async function start ({
  FIL_WALLET_ADDRESS,
  storagePath,
  metricsStream,
  activityStream,
  logStream
}) {
  logStream.write('Starting Bacalhau')

  const childProcess = execa(
    getBinaryModuleExecutable({
      module: 'bacalhau',
      executable: 'bacalhau'
    }),
    [
      'serve',
      '--log-mode=station',
      '--node-type=compute',
      // Connect to the public network
      '--peer=env',
      '--private-internal-ipfs=false',
      // Limit resources
      '--limit-total-cpu=1',
      '--limit-total-gpu=0',
      '--limit-total-memory=200Mb',
      '--disable-engine=docker'
    ],
    {
      env: {
        FIL_WALLET_ADDRESS,
        ROOT_DIR: storagePath
      }
    }
  )

  const readyPromise = new Promise((resolve, reject) => {
    childProcess.stdout.setEncoding('utf-8')
    childProcess.stdout.on('data', data => {
      if (data.includes('/compute/debug') && data.includes(200)) {
        // Ignore noisy lines
        return
      }
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
              logStream.write(
                `Cannot fetch Bacalhau module stats. ${err.stack || err.message || err}`
              )
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
  const res = await fetch(apiUrl)
  if (!res.ok) {
    const msg = 'Cannot fetch Bacalhau stats: ' +
      `${res.status}\n${await res.text().catch(noop)}`
    throw new Error(msg)
  }

  const stats = await res.json()

  const totalJobsCompleted = stats?.jobsCompleted
  if (typeof totalJobsCompleted !== 'number') {
    const msg = 'Unexpected stats response - jobsCompleted is not a ' +
      'number. Is: ' + JSON.stringify(stats)
    throw new Error(msg)
  }
  metricsStream.write({ totalJobsCompleted, totalEarnings: '0' })
}

function noop () {
  // no-op
}

module.exports = {
  install,
  start
}
