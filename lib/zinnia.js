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
import { join } from 'node:path'

const ZINNIA_DIST_TAG = 'v0.17.0'
const ZINNIA_MODULES = [
  {
    module: 'spark',
    ipnsKey: 'k51qzi5uqu5dlej5gtgal40sjbowuau5itwkr6mgyuxdsuhagjxtsfqjd6ym3g'
  }, {
    module: 'voyager',
    ipnsKey: 'k51qzi5uqu5dkwh6rrqvzugsogy3vr1ksxqyhiw5rs61qlgv6vw0ww15r9wskw'
  }
]
const {
  TARGET_ARCH = os.arch(),
  MODULE_FILTER = ''
} = process.env

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
const maybeReportErrorToSentry = (/** @type {unknown} */ err) => {
  const now = Date.now()
  if (now - lastCrashReportedAt < 4 /* HOURS */ * 3600_000) return
  lastCrashReportedAt = now

  console.error('Reporting the problem to Sentry for inspection by the Station team.')
  Sentry.captureException(err)
}

const matchesModuleFilter = module =>
  MODULE_FILTER === '' || module === MODULE_FILTER

const capitalize = str => `${str.charAt(0).toUpperCase()}${str.slice(1)}`

const updateAllSourceFiles = async ({
  moduleVersionsDir,
  moduleSourcesDir
}) => {
  const modules = await Promise.all(
    Object
      .values(ZINNIA_MODULES)
      .filter(({ module }) => matchesModuleFilter(module))
      .map(({ module, ipnsKey }) =>
        pRetry(
          () => updateSourceFiles({
            module,
            ipnsKey,
            moduleVersionsDir,
            moduleSourcesDir
          }),
          {
            retries: 10,
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

// Temporarily sum up scheduled rewards from the previous and the new contract,
// until we have fully migrated to the new contract
const contractAddresses = [
  '0x811765AccE724cD5582984cb35f5dE02d587CA12', // 1.2
  '0x8460766Edc62B525fc1FA4D628FC79229dC73031' // 1.3
]

export async function run ({
  FIL_WALLET_ADDRESS,
  ethAddress,
  STATE_ROOT,
  CACHE_ROOT,
  moduleVersionsDir,
  moduleSourcesDir,
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
  const contracts = await Promise.all(contractAddresses.map(async address => {
    return new ethers.Contract(
      address,
      JSON.parse(
        await fs.readFile(
          fileURLToPath(new URL('./abi.json', import.meta.url)),
          'utf8'
        )
      ),
      provider
    )
  }))

  const zinniadExe = getBinaryModuleExecutable({ module: 'zinnia', executable: 'zinniad' })

  if (!isUpdated) {
    try {
      onActivity({
        type: 'info',
        message: 'Updating source code for Zinnia modules...'
      })
      await updateAllSourceFiles({ moduleVersionsDir, moduleSourcesDir })
      onActivity({
        type: 'info',
        message: 'Zinnia module source code up to date'
      })
    } catch (err) {
      onActivity({
        type: 'error',
        message: 'Failed to download latest Zinnia module source code'
      })
      throw err
    }
  }

  const childProcesses = []

  for (const { module } of ZINNIA_MODULES) {
    if (!matchesModuleFilter(module)) continue

    // all paths are relative to `moduleBinaries`
    const childProcess = execa(
      zinniadExe,
      [join(moduleSourcesDir, module, 'main.js')],
      {
        cwd: moduleBinaries,
        env: {
          FIL_WALLET_ADDRESS,
          STATE_ROOT,
          CACHE_ROOT
        }
      }
    )
    childProcesses.push(childProcess)

    childProcess.stdout.setEncoding('utf-8')
    childProcess.stdout.on('data', data => {
      handleEvents({
        module,
        contracts,
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

    childProcess.on('exit', (code, signal) => {
      const exitReason = signal ? `via signal ${signal}` : `with code: ${code}`
      const msg = `${capitalize(module)} exited ${exitReason}`
      onActivity({ type: 'info', message: msg })
    })
  }

  let shouldRestart

  await Promise.all([
    (async () => {
      while (true) {
        await timers.setTimeout(10 * 60 * 1000) // 10 minutes
        try {
          shouldRestart = await updateAllSourceFiles({
            moduleVersionsDir,
            moduleSourcesDir
          })
        } catch (err) {
          onActivity({
            type: 'error',
            message: 'Failed to update Zinnia module source code'
          })
          console.error(err)
          maybeReportErrorToSentry(err)
        }
        if (shouldRestart) {
          onActivity({
            type: 'info',
            message: 'Updated Zinnia module source code, restarting...'
          })
          for (const childProcess of childProcesses) {
            childProcess.kill()
          }
          return
        }
      }
    })(),
    (async () => {
      try {
        await Promise.race(childProcesses)
      } catch (err) {
        if (!shouldRestart) {
          const errorMsg = err instanceof Error ? err.message : '' + err
          const message = `Cannot start Zinnia: ${errorMsg}`
          onActivity({ type: 'error', message })
          maybeReportErrorToSentry(err)
          throw err
        }
      } finally {
        for (const childProcess of childProcesses) {
          childProcess.kill()
        }
      }
    })(),
    (async () => {
      const results = await Promise.all(
        childProcesses.map(childProcess => once(childProcess, 'close'))
      )
      const codes = results.map(([code]) => code ?? '<no code>')
      console.error(`Zinnia closed all stdio with codes ${codes.join(', ')}`)
      for (const childProcess of childProcesses) {
        childProcess.stderr.removeAllListeners()
        childProcess.stdout.removeAllListeners()
      }
    })()
  ])

  if (shouldRestart) {
    // This infinite recursion has no risk of exceeding the maximum call stack
    // size, as awaiting promises unwinds the stack
    return run({
      FIL_WALLET_ADDRESS,
      ethAddress,
      STATE_ROOT,
      CACHE_ROOT,
      moduleVersionsDir,
      moduleSourcesDir,
      onActivity,
      onMetrics,
      isUpdated: true
    })
  }
}

const jobsCompleted = {}

async function handleEvents ({
  module,
  contracts,
  ethAddress,
  onActivity,
  onMetrics,
  text
}) {
  for (const line of text.trimEnd().split(/\n/g)) {
    try {
      const event = JSON.parse(line)
      switch (event.type) {
        case 'activity:started':
          onActivity({
            type: 'info',
            message: `${capitalize(module)} started`,
            source: module
          })
          break
        case 'activity:info':
          onActivity({
            type: 'info',
            message:
              event.message.replace(/Module Runtime/, capitalize(module)),
            source: event.module
          })
          break

        case 'activity:error':
          onActivity({
            type: 'error',
            message:
              event.message.replace(/Module Runtime/, capitalize(module)),
            source: event.module
          })
          break

        case 'jobs-completed': {
          jobsCompleted[module] = event.total
          const contractRewards = await Promise.all(contracts.map(async contract => {
            return getScheduledRewardsWithFallback(contract, ethAddress)
          }))
          const totalRewards = contractRewards.reduce((a, b) => a + b, 0n)
          onMetrics({
            totalJobsCompleted: Object.values(jobsCompleted).reduce((a, b) => a + b, 0),
            rewardsScheduledForAddress: totalRewards
          })
          break
        }

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
