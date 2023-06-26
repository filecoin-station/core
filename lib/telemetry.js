import { InfluxDB, Point } from '@influxdata/influxdb-client'
import { createHash, randomUUID } from 'node:crypto'
import Sentry from '@sentry/node'
import assert from 'node:assert'
import { platform, arch } from 'node:os'
import fs from 'node:fs/promises'
import * as paths from './paths.js'

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
    // station-anonymous-write
    '0fZyu9zjDvYlaNfOeuwgnQoUI0VcSzeYDpnOLjQyr30mz-Plqels5JHEwgKRbtCcDJbQmv62VnOV_FsZVxgoow=='
})

export const writeClient = client.getWriteApi(
  'Filecoin Station', // org
  'station', // bucket
  'ns' // precision
)

setInterval(() => {
  writeClient.flush().catch(err => {
    if (
      // Unactionable InfluxDB errors
      /HttpError|getAddrInfo|RequestTimedOutError|ECONNRESET|EPIPE|ENETDOWN/i
        .test(String(err))
    ) {
      return
    }
    Sentry.captureException(err)
  })
}, 5_000).unref()

export const startPingLoop = () => {
  assert(FIL_WALLET_ADDRESS)
  const processUUID = randomUUID()
  return setInterval(() => {
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
  }, 10_000)
}
