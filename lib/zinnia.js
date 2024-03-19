import { execa } from 'execa'
import Sentry from '@sentry/node'
import { installBinaryModule, updateSourceFiles, getBinaryModuleExecutable } from './modules.js'
import os from 'node:os'
import { once } from 'node:events'
import { ethers } from 'ethers'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import pRetry from 'p-retry'
import timers from 'node:timers/promises'
import { join } from 'node:path'
import * as Name from 'w3name'

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

  console.error('Reporting the poblem to Sentry for inspection by the Station team.')

  /** @type {Parameters<Sentry.captureException>[1]} */
  const hint = {}
  // Detect execa errors, see
  // https://github.com/sindresorhus/execa?tab=readme-ov-file#execasyncerror
  if (err instanceof Error && 'shortMessage' in err && 'originalMessage' in err) {
    // Quoting from https://develop.sentry.dev/sdk/data-handling/
    // > Messages are limited to 8192 characters.
    // > Individual extra data items are limited to 16kB. Total extra data is limited to 256kb.
    // Let's store the full message including stdout && stderr in an extra field
    hint.extra = {
      details: err.message
    }
  }

  Sentry.captureException(err, hint)
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

async function getContractsWithRetry (provider, abi) {
  const contractAddresses = await pRetry(getContractAddresses, {
    retries: 10,
    onFailedAttempt: err => {
      console.error(err)
      console.error('Failed to get contract addresses. Retrying...')
      if (String(err).includes('You are being rate limited')) {
        const delaySeconds = 30 + (Math.random() * 60)
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
  signal,
  onActivity,
  childProcesses,
  moduleVersionsDir,
  moduleSourcesDir,
  shouldRestart
}) => {
  while (true) {
    const delay = 10 * 60 * 1000 // 10 minutes
    const jitter = Math.random() * 20_000 - 10_000 // +- 10 seconds
    try {
      await timers.setTimeout(delay + jitter, null, { signal })
    } catch (err) {
      if (err.name === 'AbortError') return
      throw err
    }
    try {
      shouldRestart.set(await updateAllSourceFiles({
        moduleVersionsDir,
        moduleSourcesDir
      }))
    } catch (err) {
      onActivity({
        type: 'error',
        message: 'Failed to update Zinnia module source code'
      })
      console.error(err)
      maybeReportErrorToSentry(err)
    }
    if (shouldRestart.get()) {
      onActivity({
        type: 'info',
        message: 'Updated Zinnia module source code, restarting...'
      })
      for (const childProcess of childProcesses) {
        childProcess.kill()
      }
      return
    }
    if (signal.aborted) {
      return
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
    const newContracts = await getContractsWithRetry(provider, abi)
    contracts.splice(0)
    contracts.push(...newContracts)
    if (signal.aborted) {
      return
    }
  }
}

const catchChildProcessExit = async ({
  childProcesses,
  shouldRestart,
  onActivity
}) => {
  try {
    await Promise.race(childProcesses)
  } catch (err) {
    if (!shouldRestart.get()) {
      onActivity({ type: 'error', message: 'Zinnia crashed' })
      maybeReportErrorToSentry(err)
      throw err
    }
  } finally {
    for (const childProcess of childProcesses) {
      childProcess.kill()
    }
  }
}

const waitForStdioClose = async ({ childProcesses, controller }) => {
  const results = await Promise.all(
    childProcesses.map(childProcess => once(childProcess, 'close'))
  )
  const codes = results.map(([code]) => code ?? '<no code>')
  console.error(`Zinnia closed all stdio with codes ${codes.join(', ')}`)
  for (const childProcess of childProcesses) {
    childProcess.stderr.removeAllListeners()
    childProcess.stdout.removeAllListeners()
  }
  controller.abort()
}

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
  const abi = JSON.parse(
    await fs.readFile(
      fileURLToPath(new URL('./abi.json', import.meta.url)),
      'utf8'
    )
  )

  const contracts = await getContractsWithRetry(provider, abi)
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
      [join(module, 'main.js')],
      {
        cwd: moduleSourcesDir,
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

  const shouldRestart = {
    value: false,
    set (value) {
      this.value = value
    },
    get () {
      return this.value
    }
  }
  const controller = new AbortController()
  const { signal } = controller

  await Promise.all([
    runUpdateSourceFilesLoop({
      signal,
      onActivity,
      childProcesses,
      moduleVersionsDir,
      moduleSourcesDir,
      shouldRestart
    }),
    runUpdateContractsLoop({ signal, provider, abi, contracts }),
    catchChildProcessExit({ childProcesses, shouldRestart, onActivity }),
    waitForStdioClose({ childProcesses, controller })
  ])

  if (shouldRestart.get()) {
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
