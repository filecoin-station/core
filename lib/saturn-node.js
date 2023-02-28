import { fileURLToPath } from 'node:url'
import { createWriteStream } from 'node:fs'
import timers from 'node:timers/promises'
import { execa } from 'execa'
import { join, dirname } from 'node:path'
import { arch, platform } from 'node:os'

const modules = join(dirname(fileURLToPath(import.meta.url)), '..', 'modules')
const archOverwritten = platform() === 'darwin' ? 'x64' : arch()

function forwardChunkFromSaturn (chunk, log) {
  const lines = chunk.trimEnd().split(/\n/g)
  for (const ln of lines) {
    log('[SATURN] %s', ln)
  }
}

async function start ({ ROOT, FIL_WALLET_ADDRESS }) {
  const logStream = createWriteStream(
    join(ROOT, 'logs', 'modules', 'saturn-L2-node.log'),
    { flags: 'a' }
  )

  function appendToChildLog (text) {
    logStream.write(text
      .trimEnd()
      .split(/\n/g)
      .map(line => `[${new Date().toLocaleTimeString()}] ${line}`)
      .join('\n')
    )
  }

  console.log('Starting Saturn node...')
  appendToChildLog('Starting Saturn node')

  const childProcess = execa(
    join(
      modules,
      `saturn-L2-node-${platform()}-${archOverwritten}`,
      'saturn-L2-node'
    ), {
      env: {
        ROOT_DIR: join(ROOT, 'modules', 'saturn-L2-node'),
        FIL_WALLET_ADDRESS
      }
    }
  )

  let apiUrl

  const readyPromise = new Promise((resolve, reject) => {
    childProcess.stdout.setEncoding('utf-8')
    childProcess.stdout.on('data', data => {
      forwardChunkFromSaturn(data, console.log)
      appendToChildLog(data)
    })

    childProcess.stderr.setEncoding('utf-8')
    childProcess.stderr.on('data', data => {
      forwardChunkFromSaturn(data, console.error)
      appendToChildLog(data)
    })

    let output = ''

    const readyHandler = data => {
      output += data.toString()

      const apiMatch = output.match(/^API: (http.*)$/m)
      if (apiMatch) {
        apiUrl = apiMatch[1]

        appendToChildLog('Saturn node is up and ready')
        console.log('Saturn node is up and ready (API URL: %s)', apiUrl)
        childProcess.stdout.off('data', readyHandler)
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
  })

  childProcess.on('exit', (code, signal) => {
    const reason = signal ? `via signal ${signal}` : `with code: ${code}`
    const msg = `Saturn node exited ${reason}`
    console.log(msg)
    appendToChildLog(msg)
  })

  try {
    await Promise.race([
      readyPromise,
      timers.setTimeout(500)
    ])
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : '' + err
    const message = `Cannot start Saturn node: ${errorMsg}`
    appendToChildLog(message)
    console.error('Cannot start Saturn node:', err)
  }

  return apiUrl
}

export { start }
