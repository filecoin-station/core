import { execa } from 'execa'
import Sentry from '@sentry/node'
import { installBinaryModule, downloadSourceFiles, getBinaryModuleExecutable } from './modules.js'
import { moduleBinaries } from './paths.js'
import os from 'node:os'
import { once } from 'node:events'
import { ethers } from 'ethers'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const ZINNIA_DIST_TAG = 'v0.15.0'
const ZINNIA_MODULES = [
  {
    module: 'spark',
    repo: 'filecoin-station/spark',
    distTag: 'v1.6.0'
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

let lastCrashReportedAt = 0
const maybeReportCrashToSentry = (/** @type {unknown} */ err) => {
  const now = Date.now()
  if (now - lastCrashReportedAt < 4 /* HOURS */ * 3600_000) return
  lastCrashReportedAt = now

  console.log('Reporting the problem to Sentry for inspection by the Station team.')
  Sentry.captureException(err)
}

export async function run ({
  FIL_WALLET_ADDRESS,
  ethAddress,
  STATE_ROOT,
  CACHE_ROOT,
  onActivity,
  onMetrics
}) {
  const provider = new ethers.JsonRpcProvider(
    'https://api.node.glif.io/rpc/v1',
    null,
    { batchMaxCount: 1 }
  )
  const contract = new ethers.Contract(
    '0xaaef78eaf86dcf34f275288752e892424dda9341',
    JSON.parse(
      await fs.readFile(
        fileURLToPath(new URL('./abi.json', import.meta.url)),
        'utf8'
      )
    ),
    provider
  )

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

  childProcess.stdout.setEncoding('utf-8')
  childProcess.stdout.on('data', data => {
    handleEvents({
      contract,
      ethAddress,
      onActivity,
      onMetrics,
      text: data
    }).catch(err => {
      console.error(err)
      Sentry.captureException(err)
    })
  })
  childProcess.stderr.pipe(process.stderr, { end: false })

  let exitReason
  childProcess.on('exit', (code, signal) => {
    exitReason = signal ? `via signal ${signal}` : `with code: ${code}`
    const msg = `Zinnia exited ${exitReason}`
    onActivity({ type: 'info', message: msg })
  })

  await Promise.all([
    (async () => {
      try {
        await childProcess
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '' + err
        const message = `Cannot start Zinnia: ${errorMsg}`
        onActivity({ type: 'error', message })
        maybeReportCrashToSentry(err)
        throw err
      }
    })(),
    (async () => {
      const [code] = await once(childProcess, 'close')
      console.error(`Zinnia closed all stdio with code ${code ?? '<no code>'}`)
      childProcess.stderr.removeAllListeners()
      childProcess.stdout.removeAllListeners()
      const err = new Error(`Zinnia exited ${exitReason ?? 'for unknown reason'}`)
      maybeReportCrashToSentry(err)
      throw err
    })()
  ])
}

async function handleEvents ({
  contract,
  ethAddress,
  onActivity,
  onMetrics,
  text
}) {
  for (const line of text.trimEnd().split(/\n/g)) {
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
            rewardsScheduledForAddress:
              await getScheduledRewardsWithFallback(contract, ethAddress)
          })
          break

        default:
          console.error('Ignoring Zinnia event of unknown type:', event)
      }
    } catch (err) {
      console.error('Ignoring malformed Zinnia event:', line)
    }
  }
}

async function getScheduledRewardsWithFallback (contract, ethAddress) {
  try {
    return await contract.rewardsScheduledFor(ethAddress)
  } catch (err) {
    console.error('Failed to get scheduled rewards:', err.stack)
    return 0n
  }
}
