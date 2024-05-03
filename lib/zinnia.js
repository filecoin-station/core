import { execa } from 'execa'
import Sentry from '@sentry/node'
import { installBinaryModule, updateSourceFiles, getBinaryModuleExecutable } from './modules.js'
import os from 'node:os'
import { ethers } from 'ethers'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import pRetry from 'p-retry'
import timers from 'node:timers/promises'
import { join } from 'node:path'
import * as Name from 'w3name'

const ZINNIA_DIST_TAG = 'v0.18.3'
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
  MODULE_FILTER = '',
  // https://github.com/filecoin-station/contract-addresses
  CONTRACT_ADDRESSES_IPNS_KEY = 'k51qzi5uqu5dmaqrefqazad0ca8b24fb79zlacfjw2awdt5gjf2cr6jto5jyqe'
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

  /** @type {Parameters<Sentry.captureException>[1]} */
  const hint = { extra: {} }
  if (typeof err === 'object') {
    if ('reportedToSentry' in err && err.reportedToSentry === true) {
      return
    }
    Object.assign(err, { reportedToSentry: true })
    if ('details' in err && typeof err.details === 'string') {
      // Quoting from https://develop.sentry.dev/sdk/data-handling/
      // > Messages are limited to 8192 characters.
      // > Individual extra data items are limited to 16kB. Total extra data is limited to 256kb.
      // Let's store the additional details (e.g. stdout && stderr) in an extra field
      const tail = err.details.split(/\n/g).slice(-50).join('\n')
      hint.extra.details = tail
    }
    if ('moduleName' in err && typeof err.moduleName === 'string') {
      hint.extra.moduleName = err.moduleName
    }
  }

  console.error('Reporting the problem to Sentry for inspection by the Station team.')
  Sentry.captureException(err, hint)
}

let lastTotalJobsCompleted = 0
let lastRewardsScheduledForAddress = 0n

const matchesModuleFilter = module =>
  MODULE_FILTER === '' || module === MODULE_FILTER

const capitalize = str => `${str.charAt(0).toUpperCase()}${str.slice(1)}`

const updateAllSourceFiles = async ({
  moduleVersionsDir,
  moduleSourcesDir,
  signal
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
            signal,
            retries: 10,
            onFailedAttempt: err => {
              console.error(err)
              console.error(`Failed to download ${module} source. Retrying...`)
              if (String(err).includes('You are being rate limited')) {
                const delaySeconds = 30 + (Math.random() * 60)
                // Don't DDOS the w3name services
                console.error(
                  `Rate limited. Waiting ${delaySeconds} seconds...`
                )
                return timers.setTimeout(delaySeconds * 1000)
              }
            }
          }
        )
      )
  )
  const hasUpdated = modules.find(updated => updated === true)
  return hasUpdated
}

async function getContractAddresses () {
  const name = Name.parse(CONTRACT_ADDRESSES_IPNS_KEY)
  const revision = await Name.resolve(name)
  return revision.value.split('\n').filter(Boolean)
}

async function getContractsWithRetry ({ provider, abi, signal }) {
  const contractAddresses = await pRetry(getContractAddresses, {
    signal,
    retries: 10,
    onFailedAttempt: err => {
      console.error(err)
      console.error('Failed to get contract addresses. Retrying...')
      if (String(err).includes('You are being rate limited')) {
        const delaySeconds = 60 + (Math.random() * 60)
        // Don't DDOS the w3name services
        console.error(
          `Rate limited. Waiting ${delaySeconds} seconds...`
        )
        return timers.setTimeout(delaySeconds * 1000)
      }
    }
  })
  console.error(`Meridian contract addresses: ${contractAddresses.join(', ')}`)
  return contractAddresses.map(address => {
    return new ethers.Contract(address, abi, provider)
  })
}

const runUpdateSourceFilesLoop = async ({
  controller,
  signal,
  onActivity,
  moduleVersionsDir,
  moduleSourcesDir
}) => {
  while (true) {
    if (signal.aborted) {
      return
    }
    const delay = 10 * 60 * 1000 // 10 minutes
    const jitter = Math.random() * 20_000 - 10_000 // +- 10 seconds
    try {
      await timers.setTimeout(delay + jitter, null, { signal })
    } catch (err) {
      if (err.name === 'AbortError') return
      throw err
    }
    try {
      const shouldRestart = await updateAllSourceFiles({
        moduleVersionsDir,
        moduleSourcesDir,
        signal
      })
      if (shouldRestart) {
        onActivity({
          type: 'info',
          message: 'Updated Zinnia module source code, restarting...'
        })
        controller.abort()
        return
      }
    } catch (err) {
      onActivity({
        type: 'error',
        message: 'Failed to update Zinnia module source code'
      })
      console.error(err)
      maybeReportErrorToSentry(err)
    }
  }
}

const runUpdateContractsLoop = async ({ signal, provider, abi, contracts }) => {
  while (true) {
    const delay = 10 * 60 * 1000 // 10 minutes
    const jitter = Math.random() * 20_000 - 10_000 // +- 10 seconds
    try {
      await timers.setTimeout(delay + jitter, null, { signal })
    } catch (err) {
      if (err.name === 'AbortError') return
      throw err
    }
    const newContracts = await getContractsWithRetry({ provider, abi, signal })
    contracts.splice(0)
    contracts.push(...newContracts)
    if (signal.aborted) {
      return
    }
  }
}

const runUpdateRewardsLoop = async ({ signal, contracts, ethAddress, onMetrics }) => {
  while (true) {
    const contractRewards = await Promise.all(contracts.map(async contract => {
      return getScheduledRewardsWithFallback(contract, ethAddress)
    }))
    if (signal.aborted) {
      return
    }
    const totalRewards = contractRewards.reduce((a, b) => a + b, 0n)
    onMetrics({
      totalJobsCompleted: lastTotalJobsCompleted,
      rewardsScheduledForAddress: totalRewards
    })
    lastRewardsScheduledForAddress = totalRewards

    const delay = 10 * 60 * 1000 // 10 minutes
    const jitter = Math.random() * 20_000 - 10_000 // +- 10 seconds
    try {
      await timers.setTimeout(delay + jitter, null, { signal })
    } catch (err) {
      if (err.name === 'AbortError') return
      throw err
    }
  }
}

const catchChildProcessExit = async ({
  childProcesses,
  controller,
  onActivity
}) => {
  try {
    const tasks = childProcesses.map(p => (async () => {
      try {
        await p
      } catch (err) {
        // When the child process crash, attach the module name & the exit reason to the error object
        const exitReason = p.exitCode
          ? `with exit code ${p.exitCode}`
          : p.signalCode ? `via signal ${p.signalCode}` : undefined
        throw Object.assign(err, { moduleName: p.moduleName, exitReason })
      }
    })())

    await Promise.race(tasks)
  } catch (err) {
    const moduleName = capitalize(err.moduleName ?? 'Zinnia')
    const exitReason = err.exitReason ?? 'for unknown reason'
    const message = `${moduleName} crashed ${exitReason}`
    const isCritical = err.moduleName !== 'voyager'
    const type = isCritical ? 'error' : 'info'
    onActivity({ type, message })

    if (isCritical) {
      const moduleErr = new Error(message, { cause: err })
      // Store the full error message including stdout & stder in the top-level `details` property
      Object.assign(moduleErr, { details: err.message })

      // Apply a custom rule to force Sentry to group all issues with the same module & exit code
      // See https://docs.sentry.io/platforms/node/usage/sdk-fingerprinting/#basic-example
      Sentry.withScope(scope => {
        scope.setFingerprint([message])
        maybeReportErrorToSentry(moduleErr)
      })
    }
    throw err
  } finally {
    controller.abort()
  }
}

export async function run ({
  STATION_ID,
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
  const abi = JSON.parse(
    await fs.readFile(
      fileURLToPath(new URL('./abi.json', import.meta.url)),
      'utf8'
    )
  )

  const contracts = await getContractsWithRetry({ provider, abi, signal: null })
  const zinniadExe = getBinaryModuleExecutable({ module: 'zinnia', executable: 'zinniad' })

  if (!isUpdated) {
    try {
      onActivity({
        type: 'info',
        message: 'Updating source code for Zinnia modules...'
      })
      await updateAllSourceFiles({
        moduleVersionsDir,
        moduleSourcesDir,
        signal: null
      })
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

  const controller = new AbortController()
  const { signal } = controller
  const childProcesses = []

  for (const { module } of ZINNIA_MODULES) {
    if (!matchesModuleFilter(module)) continue

    // all paths are relative to `moduleBinaries`
    const childProcess = execa(
      zinniadExe,
      [join(module, 'main.js')],
      {
        cwd: moduleSourcesDir,
        env: {
          STATION_ID,
          FIL_WALLET_ADDRESS,
          STATE_ROOT,
          CACHE_ROOT
        },
        signal
      }
    )
    childProcesses.push(Object.assign(childProcess, { moduleName: module }))

    let timeoutId
    const resetTimeout = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        onActivity({
          type: 'error',
          message: `${capitalize(module)} has been inactive for 5 minutes, restarting...`
        })
        controller.abort()
      }, 5 * 60 * 1000)
    }
    resetTimeout()
    signal.addEventListener('abort', () => clearTimeout(timeoutId))

    childProcess.stdout.setEncoding('utf-8')
    childProcess.stdout.on('data', data => {
      resetTimeout()
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
    childProcess.stderr.setEncoding('utf-8')
    childProcess.stderr.on('data', data => {
      resetTimeout()
      process.stderr.write(data)
    })

    childProcess.on('exit', (code, signal) => {
      const exitReason = signal ? `via signal ${signal}` : `with code: ${code}`
      const msg = `${capitalize(module)} exited ${exitReason}`
      onActivity({ type: 'info', message: msg })
    })
  }

  try {
    await Promise.all([
      runUpdateSourceFilesLoop({
        controller,
        signal,
        onActivity,
        moduleVersionsDir,
        moduleSourcesDir
      }),
      runUpdateContractsLoop({ signal, provider, abi, contracts }),
      runUpdateRewardsLoop({ signal, contracts, ethAddress, onMetrics }),
      catchChildProcessExit({ childProcesses, onActivity, controller })
    ])
    console.error('Zinnia main loop ended')
  } catch (err) {
    console.error('Zinnia main loop errored', err)
    maybeReportErrorToSentry(err)
  } finally {
    controller.abort()
  }

  // This infinite recursion has no risk of exceeding the maximum call stack
  // size, as awaiting promises unwinds the stack
  return run({
    STATION_ID,
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
          const totalJobsCompleted = Object.values(jobsCompleted).reduce((a, b) => a + b, 0)
          onMetrics({
            totalJobsCompleted,
            rewardsScheduledForAddress: lastRewardsScheduledForAddress
          })
          lastTotalJobsCompleted = totalJobsCompleted
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
