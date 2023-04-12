import timers from 'node:timers/promises'
import { execa } from 'execa'
import { join } from 'node:path'
import { arch, platform } from 'node:os'
import { fetch } from 'undici'
import * as Sentry from '@sentry/node'

function forwardChunkFromZinnia (chunk, log) {
  const lines = chunk.trimEnd().split(/\n/g)
  for (const ln of lines) {
    log('[ZINNIA] %s', ln)
  }
}

async function start ({
  FIL_WALLET_ADDRESS,
  STATE_ROOT,
  CACHE_ROOT,
  moduleBinaries,
  metricsStream,
  activityStream,
  logStream
}) {
  console.log('Starting Zinnia runtime...')
  logStream.write('Starting Zinnia runtime')

  const zinniadExe = join(moduleBinaries, `zinniad${platform() === 'win32' ? '.exe' : ''}`)
  const modules = [
    // all paths are relative to `moduleBinaries`
    'peer-checker/peer-checker.js'
  ]
  const childProcess = execa(zinniadExe, modules, {
    cwd: moduleBinaries,
    env: {
      WALLET_ADDRESS: FIL_WALLET_ADDRESS,
      STATE_ROOT,
      CACHE_ROOT,
    }
  })

  const readyPromise = new Promise((resolve, reject) => {
    childProcess.stdout.setEncoding('utf-8')
    childProcess.stdout.on('data', data => {
      forwardChunkFromZinnia(data, console.log)
      logStream.write(data)
      handleEvents({activityStream, metricsStream}, data)
    })

    childProcess.stderr.setEncoding('utf-8')
    childProcess.stderr.on('data', data => {
      forwardChunkFromZinnia(data, console.error)
      logStream.write(data)
    })

    childProcess.stdout.once('data', _data => {
      // This is based on an implicit assumption that zinniad reports an info activity
      // after it starts
      resolve()
    })
    childProcess.catch(reject)
  })

  childProcess.on('close', code => {
    console.log(`Zinnia Runtime closed all stdio with code ${code ?? '<no code>'}`)
    childProcess.stderr.removeAllListeners()
    childProcess.stdout.removeAllListeners()
    Sentry.captureException('Zinnia runtime exited')
  })

  childProcess.on('exit', (code, signal) => {
    const reason = signal ? `via signal ${signal}` : `with code: ${code}`
    const msg = `Zinnia Runtime exited ${reason}`
    console.log(msg)
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
    const message = `Cannot start Zinnia Runtime: ${errorMsg}`
    logStream.write(message)
    console.error('Cannot start Zinnia Runtime:', err)
    activityStream.write({ type: 'error', message })
  }
}

function handleEvents ({activityStream, metricsStream}, text) {
  text
    .trimEnd()
    .split(/\n/g)
    .forEach(line => {
      try {
        const event = JSON.parse(line);
        switch (event.type) {
          case 'activity:info':
            activityStream.write({
              type: 'info',
              message: event.message,
              source: event.module ?? 'Runtime'
            })
            break

          case 'activity:error':
            activityStream.write({
              type: 'error',
              message: event.message,
              source: event.module ?? 'Runtime'
            })
            break

          case 'jobs-completed':
            metricsStream.write({ totalJobsCompleted: event.total, totalEarnings: '0' })
            break

          default:
            console.error('Ignoring Zinnia event of unknown type:', event)
        }
      } catch (err) {
        console.error("Ignoring malformed Zinnia event:", line)
      }
    })
}

export { start }
