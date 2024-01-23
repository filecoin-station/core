import { execa } from 'execa'
import Sentry from '@sentry/node'
import { installBinaryModule, updateSourceFiles, getBinaryModuleExecutable } from './modules.js'
import { moduleBinaries } from './paths.js'
import os from 'node:os'
import { once } from 'node:events'
import { ethers } from 'ethers'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import pRetry from 'p-retry'
import timers from 'node:timers/promises'

const ZINNIA_DIST_TAG = 'v0.16.0'
const ZINNIA_MODULES = [
  {
    module: 'spark',
    repo: 'filecoin-station/spark'
  }
]
const { TARGET_ARCH = os.arch() } = process.env

export const install = () => installBinaryModule({
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
})

let lastCrashReportedAt = 0
const maybeReportCrashToSentry = (/** @type {unknown} */ err) => {
  const now = Date.now()
  if (now - lastCrashReportedAt < 4 /* HOURS */ * 3600_000) return
  lastCrashReportedAt = now

  console.log('Reporting the problem to Sentry for inspection by the Station team.')
  Sentry.captureException(err)
}

const updateAllSourceFiles = async () => {
  const modules = await Promise.all(
    Object
      .values(ZINNIA_MODULES)
      .map(({ module, repo }) =>
        pRetry(
          () => updateSourceFiles({ module, repo }),
          {
            retries: 1000,
            onFailedAttempt: err => {
              console.error(err)
              console.error(`Failed to download ${module} source. Retrying...`)
            }
          }
        )
      )
  )
  const hasUpdated = modules.find(updated => updated === true)
  return hasUpdated
}

export async function run ({
  FIL_WALLET_ADDRESS,
  ethAddress,
  STATE_ROOT,
  CACHE_ROOT,
  onActivity,
  onMetrics,
  isUpdated = false
}) {
  const fetchRequest = new ethers.FetchRequest(
    'https://api.node.glif.io/rpc/v1'
  )
  fetchRequest.setHeader(
    'Authorization',
    'Bearer P1Kqr5vHZWNEISNyzfIqx8FbBwdGzaTG5Fn3pzkpHCU='
  )
  const provider = new ethers.JsonRpcProvider(
    fetchRequest,
    null,
    { batchMaxCount: 1 }
  )
  const contract = new ethers.Contract(
    '0x811765AccE724cD5582984cb35f5dE02d587CA12',
    JSON.parse(
      await fs.readFile(
        fileURLToPath(new URL('./abi.json', import.meta.url)),
        'utf8'
      )
    ),
    provider
  )

  const zinniadExe = getBinaryModuleExecutable({ module: 'zinnia', executable: 'zinniad' })
  // all paths are relative to `moduleBinaries`
  const modules = ZINNIA_MODULES.map(m => `${m.module}/main.js`)

  if (!isUpdated) {
    try {
      onActivity({
        type: 'info',
        message: 'Downloading latest Zinnia module source files...'
      })
      await updateAllSourceFiles()
    } catch (err) {
      onActivity({
        type: 'error',
        message: 'Failed to download latest Zinnia module source files'
      })
      throw err
    }
  }

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

  let shouldRestart

  await Promise.all([
    (async () => {
      while (true) {
        await timers.setTimeout(10 * 60 * 1000) // 10 minutes
        try {
          shouldRestart = await updateAllSourceFiles()
        } catch (err) {
          onActivity({
            type: 'error',
            message: 'Failed to update Zinnia module source files'
          })
        }
        if (shouldRestart) {
          onActivity({
            type: 'info',
            message: 'Updated Zinnia module source files, restarting...'
          })
          childProcess.kill()
          return
        }
      }
    })(),
    (async () => {
      try {
        await childProcess
      } catch (err) {
        if (shouldRestart) return
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
      if (shouldRestart) return
      const err = new Error(`Zinnia exited ${exitReason ?? 'for unknown reason'}`)
      maybeReportCrashToSentry(err)
      throw err
    })()
  ])

  if (shouldRestart) {
    return run({
      FIL_WALLET_ADDRESS,
      ethAddress,
      STATE_ROOT,
      CACHE_ROOT,
      onActivity,
      onMetrics,
      isUpdated: true
    })
  }
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
