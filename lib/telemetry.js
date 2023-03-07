'use strict'

import { InfluxDB } from '@influxdata/influxdb-client'
import { createHash } from 'node:crypto'
import Sentry from '@sentry/node'
import assert from 'node:assert'

const { FIL_WALLET_ADDRESS } = process.env

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
    // Ignore unactionable InfluxDB errors
    if (
      /HttpError|getAddrInfo|RequestTimedOutError|ECONNRESET/i.test(String(err))
    ) {
      return
    }
    Sentry.captureException(err)
  })
}, 5000).unref()

export const writePoint = point => {
  assert(FIL_WALLET_ADDRESS)
  point.stringField(
    'wallet',
    createHash('sha256').update(FIL_WALLET_ADDRESS).digest('hex')
  )
  point.tag('station', 'core')
  writeClient.writePoint(point)
}
