import timers from 'node:timers/promises'
import execa from 'execa'
import Sentry from '@sentry/node'
import { installBinaryModule, downloadSourceFiles, getBinaryModuleExecutable } from './modules.js'
import { moduleBinaries } from './paths.js'

const ZINNIA_DIST_TAG = 'v0.10.1'
const ZINNIA_MODULES = [
  {
    module: 'spark',
    repo: 'filecoin-station/spark',
    distTag: 'v0.0.2'
  }
]

export async function install () {
  await Promise.all([
    installBinaryModule({
      module: 'zinnia',
      repo: 'filecoin-station/zinnia',
      distTag: ZINNIA_DIST_TAG,
      executable: 'zinniad',
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
