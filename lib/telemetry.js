import { InfluxDB, Point } from '@influxdata/influxdb-client'
import { createHash, randomUUID } from 'node:crypto'
import Sentry from '@sentry/node'
import assert from 'node:assert'
import { platform, arch, cpus, freemem, totalmem } from 'node:os'
import fs from 'node:fs/promises'
import * as paths from './paths.js'
import timers from 'node:timers/promises'

const { FIL_WALLET_ADDRESS, DEPLOYMENT_TYPE = 'cli' } = process.env

const validDeploymentTypes = ['cli', 'docker', 'station-desktop']
assert(
  validDeploymentTypes.includes(DEPLOYMENT_TYPE),
  `Invalid DEPLOYMENT_TYPE: ${DEPLOYMENT_TYPE}. Options: ${validDeploymentTypes.join(', ')}`
)

const pkg = JSON.parse(await fs.readFile(paths.packageJSON, 'utf8'))

const client = new InfluxDB({
  url: 'https://eu-central-1-1.aws.cloud2.influxdata.com',
  token:
    // station-core-18-1-3
    // TODO: Use token that can write to both buckets
    '4lFA4c8uMCOIAdkJp6EnQAm6wm9W53e4yun24fl4plrRFHSyUbGdfbXNVALwc0pxWq3-1DRTgpjz8UNlhUY_QA=='
})

export const writeClient = client.getWriteApi(
  'Filecoin Station', // org
  'station', // bucket
  'ns' // precision
)

const writeClientMachines = client.getWriteApi(
  'Filecoin Station', // org
  'station-machines', // bucket
  's' // precision
)

const unactionableErrors =
  /HttpError|getAddrInfo|RequestTimedOutError|ECONNRESET|EPIPE|ENETDOWN|ENOBUFS|EHOSTUNREACH|ERR_TLS_CERT_ALTNAME_INVALID|ETIMEDOUT|EPROTO|ENETUNREACH/i

const handleFlushError = err => {
  if (unactionableErrors.test(String(err))) {
    return
  }
  if (typeof err?.code === 'string' && unactionableErrors.test(err.code)) {
    return
  }
  Sentry.captureException(err)
}

export const runPingLoop = async () => {
  assert(FIL_WALLET_ADDRESS)
  const processUUID = randomUUID()
  while (true) {
    const point = new Point('ping')
    point.stringField(
      'wallet',
      createHash('sha256').update(FIL_WALLET_ADDRESS).digest('hex')
    )
    point.stringField('process_uuid', processUUID)
    point.stringField('version', pkg.version)
    point.tag('station', 'core')
    point.tag('platform', platform())
    point.tag('arch', arch())
    point.tag('deployment_type', DEPLOYMENT_TYPE)
    writeClient.writePoint(point)
    writeClient.flush().catch(handleFlushError)
    await timers.setTimeout(10 * 60 * 1000) // 10 minutes
  }
}

export const runMachinesLoop = async () => {
  while (true) {
    const point = new Point('machine')
    point.intField('cpu_count', cpus().length)
    point.intField('cpu_speed_mhz', cpus()[0].speed)
    const model = cpus()[0].model.toLowerCase()
    point.tag(
      'cpu_brand',
      model.includes('intel')
        ? 'intel'
        : model.includes('amd')
          ? 'amd'
          : model.includes('apple')
            ? 'apple'
            : 'unknown'
    )
    point.intField('memory_free_b', freemem())
    point.intField('memory_total_b', totalmem())
    writeClientMachines.writePoint(point)
    writeClientMachines.flush().catch(handleFlushError)
    await timers.setTimeout(86_400) // 1 day
  }
}
