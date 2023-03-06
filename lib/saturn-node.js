import timers from 'node:timers/promises'
import { execa } from 'execa'
import { join } from 'node:path'
import { arch, platform } from 'node:os'
import { fetch } from 'undici'
import * as Sentry from '@sentry/node'

const archOverwritten = platform() === 'darwin' ? 'x64' : arch()

function forwardChunkFromSaturn (chunk, log) {
  const lines = chunk.trimEnd().split(/\n/g)
  for (const ln of lines) {
    log('[SATURN] %s', ln)
  }
}

async function start ({
  FIL_WALLET_ADDRESS,
  storagePath,
  binariesPath,
  metricsStream,
  logStream
}) {
  console.log('Starting Saturn node...')
  logStream.write('Starting Saturn node')

  const childProcess = execa(
    join(
      binariesPath,
      `saturn-L2-node-${platform()}-${archOverwritten}`,
      'saturn-L2-node'
    ), {
      env: {
        ROOT_DIR: storagePath,
        FIL_WALLET_ADDRESS
      }
    }
  )

  const readyPromise = new Promise((resolve, reject) => {
    childProcess.stdout.setEncoding('utf-8')
    childProcess.stdout.on('data', data => {
      forwardChunkFromSaturn(data, console.log)
      logStream.write(data)
    })

    childProcess.stderr.setEncoding('utf-8')
    childProcess.stderr.on('data', data => {
      forwardChunkFromSaturn(data, console.error)
      logStream.write(data)
    })

    let output = ''

    const readyHandler = data => {
      output += data.toString()

      const apiMatch = output.match(/^API: (http.*)$/m)
      if (apiMatch) {
        const apiUrl = apiMatch[1]

        logStream.write('Saturn node is up and ready')
        console.log('Saturn node is up and ready (API URL: %s)', apiUrl)
        childProcess.stdout.off('data', readyHandler)
        setInterval(() => {
          updateStats({ metricsStream, apiUrl })
            .catch(err => {
              console.warn('Cannot fetch Saturn module stats.', err)
            })
        }, 1000).unref()
        resolve()
      }
    }
    childProcess.stdout.on('data', readyHandler)
    childProcess.catch(reject)
  })

  childProcess.on('close', code => {
    console.log(`Saturn node closed all stdio with code ${code ?? '<no code>'}`)
    childProcess.stderr.removeAllListeners()
    childProcess.stdout.removeAllListeners()
    Sentry.captureException('Saturn node exited')
  })

  childProcess.on('exit', (code, signal) => {
    const reason = signal ? `via signal ${signal}` : `with code: ${code}`
    const msg = `Saturn node exited ${reason}`
    console.log(msg)
    logStream.write(msg)
  })

  try {
    await Promise.race([
      readyPromise,
      timers.setTimeout(500)
    ])
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : '' + err
    const message = `Cannot start Saturn node: ${errorMsg}`
    logStream.write(message)
    console.error('Cannot start Saturn node:', err)
  }
}

let lastTotalJobsCompleted

async function updateStats ({ metricsStream, apiUrl }) {
  const res = await fetch(apiUrl.replace('localhost', '127.0.0.1') + 'stats')
  if (!res.ok) {
    const msg = 'Cannot fetch Saturn node stats: ' +
      `${res.status}\n${await res.text().catch(noop)}`
    throw new Error(msg)
  }

  const stats = await res.json()

  const totalJobsCompleted = stats?.NSuccessfulRetrievals
  if (typeof totalJobsCompleted !== 'number') {
    const msg = 'Unexpected stats response - NSuccessfulRetrievals is not a ' +
      'number. Stats: ' + JSON.stringify(stats)
    throw new Error(msg)
  }
  if (totalJobsCompleted !== lastTotalJobsCompleted) {
    lastTotalJobsCompleted = totalJobsCompleted
    metricsStream.write(JSON.stringify({ totalJobsCompleted }))
  }
}

function noop () {
  // no-op
}

export { start }
