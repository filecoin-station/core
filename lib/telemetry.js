'use strict'

const { InfluxDB, Point } = require('@influxdata/influxdb-client')
const { createHash, randomUUID } = require('node:crypto')
const Sentry = require('@sentry/node')
const assert = require('node:assert')
const { platform, arch } = require('node:os')
const pkg = require('../package.json')

const { FIL_WALLET_ADDRESS, RUNNING_IN_STATION_DESKTOP } = process.env

const client = new InfluxDB({
  url: 'https://eu-central-1-1.aws.cloud2.influxdata.com',
  token:
    // station-anonymous-write
    '0fZyu9zjDvYlaNfOeuwgnQoUI0VcSzeYDpnOLjQyr30mz-Plqels5JHEwgKRbtCcDJbQmv62VnOV_FsZVxgoow=='
})

const writeClient = client.getWriteApi(
  'Filecoin Station', // org
  'station', // bucket
  'ns' // precision
)

setInterval(() => {
  writeClient.flush().catch(err => {
    if (
      // Unactionable InfluxDB errors
      /HttpError|getAddrInfo|RequestTimedOutError|ECONNRESET|EPIPE/i
        .test(String(err))
    ) {
      return
    }
    Sentry.captureException(err)
  })
}, 5_000).unref()

const startPingLoop = () => {
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
    point.tag(
      'running_in_station_desktop',
      String(['1', 'true'].includes(RUNNING_IN_STATION_DESKTOP))
    )
    writeClient.writePoint(point)
  }, 10_000)
}

module.exports = {
  writeClient,
  startPingLoop
}
