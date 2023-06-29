import timers from 'node:timers/promises'
import execa from 'execa'
import Sentry from '@sentry/node'
import { installBinaryModule, downloadSourceFiles, getBinaryModuleExecutable } from './modules.js'
import { moduleBinaries } from './paths.js'
import os from 'node:os'

const ZINNIA_DIST_TAG = 'v0.13.0'
const ZINNIA_MODULES = [
  {
    module: 'spark',
    repo: 'filecoin-station/spark',
    distTag: 'v1.2.0'
  }
]
const { TARGET_ARCH = os.arch() } = process.env

export async function install () {
  await Promise.all([
    installBinaryModule({
      module: 'zinnia',
      repo: 'filecoin-station/zinnia',
      distTag: ZINNIA_DIST_TAG,
      executable: 'zinniad',
      arch: TARGET_ARCH,
      targets: [
        { platform: 'darwin', arch: 'arm64', asset: 'zinniad-macos-arm64.zip' },
        { platform: 'darwin', arch: 'x64', asset: 'zinniad-macos-x64.zip' },
        { platform: 'linux', arch: 'arm64', asset: 'zinniad-linux-arm64.tar.gz' },
        { platform: 'linux', arch: 'x64', asset: 'zinniad-linux-x64.tar.gz' },
        { platform: 'win32', arch: 'x64', asset: 'zinniad-windows-x64.zip' }
      ]
    }),

    ...Object.values(ZINNIA_MODULES).map(downloadSourceFiles)
  ])
}

export async function start ({
  FIL_WALLET_ADDRESS,
  STATE_ROOT,
  CACHE_ROOT,
  onActivity,
  onMetrics
}) {
  const startAgain = () => {
    if (childProcess.exitCode == null && childProcess.signalCode == null) {
      // Should we report this problem to Sentry? I think this can happen only as a result of
      // a programmer error on our side.
      console.error("Wanted to start Zinnia after it exited, but it is still running.");
      return
    }
    start({
      FIL_WALLET_ADDRESS,
      STATE_ROOT,
      CACHE_ROOT,
      onActivity,
      onMetrics
    })
  }

  const zinniadExe = getBinaryModuleExecutable({ module: 'zinnia', executable: 'zinniad' })
  const modules = [
    // all paths are relative to `moduleBinaries`
    'spark/main.js'
  ]
  const childProcess = execa(zinniadExe, modules, {
    cwd: moduleBinaries,
    env: {
      FIL_WALLET_ADDRESS,
      STATE_ROOT,
      CACHE_ROOT
    }
  })

  const readyPromise = new Promise((resolve, reject) => {
    childProcess.stdout.setEncoding('utf-8')
    childProcess.stdout.on('data', data => {
      handleEvents({ onActivity, onMetrics, text: data })
    })
    childProcess.stderr.pipe(process.stderr, { end: false })

    childProcess.stdout.once('data', _data => {
      // This is based on an implicit assumption that zinniad reports an info activity
      // after it starts
      resolve()
    })
    childProcess.catch(reject)
  })

  childProcess.on('close', code => {
    console.error(`Zinnia closed all stdio with code ${code ?? '<no code>'}`)
    childProcess.stderr.removeAllListeners()
    childProcess.stdout.removeAllListeners()
    Sentry.captureException('Zinnia exited')

    setTimeout(startAgain, 5_000)
  })

  childProcess.on('exit', (code, signal) => {
    const reason = signal ? `via signal ${signal}` : `with code: ${code}`
    const msg = `Zinnia exited ${reason}`
    onActivity({ type: 'info', message: msg })
  })

  try {
    await Promise.race([
      readyPromise,
      timers.setTimeout(500)
    ])
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : '' + err
    const message = `Cannot start Zinnia: ${errorMsg}`
    onActivity({ type: 'error', message })
    // We can get here in two ways:
    // 1. `zinniad` cannot be started (execa returns error)
    // 2. We don't receive any activity from `zinniad` before the timeout
    // The first case can be easily handled by restarting() zinnia after a timeout,
    // or maybe we should not do anything because most likely Zinnia is going to crash again.
    // However, how to handle the timeout? We are leaving the process running, so eventually
    // we will receive the first activity, then subsequent activities. All will work correctly,
    // except the misleading error activity saying "Cannot start Zinnia".
  }
}

function handleEvents ({ onActivity, onMetrics, text }) {
  text
    .trimEnd()
    .split(/\n/g)
    .forEach(line => {
      try {
        const event = JSON.parse(line)
        switch (event.type) {
          case 'activity:info':
            onActivity({
              type: 'info',
              message: event.message.replace(/Module Runtime/, 'Zinnia'),
              source: event.module
            })
            break

          case 'activity:error':
            onActivity({
              type: 'error',
              message: event.message.replace(/Module Runtime/, 'Zinnia'),
              source: event.module
            })
            break

          case 'jobs-completed':
            onMetrics({
              totalJobsCompleted: event.total,
              totalEarnings: '0'
            })
            break

          default:
            console.error('Ignoring Zinnia event of unknown type:', event)
        }
      } catch (err) {
        console.error('Ignoring malformed Zinnia event:', line)
      }
    })
}
