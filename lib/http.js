import { getLatestMetrics } from '../lib/metrics.js'
import http from 'node:http'

const asyncHandler = async (req, res) => {
  if (req.url === '/metrics') {
    res.setHeader('Content-Type', 'application/json')
    res.end(await getLatestMetrics())
  } else {
    res.statusCode = 404
    res.end(http.STATUS_CODES[404])
  }
}

export const handler = (req, res) => {
  asyncHandler(req, res).catch(err => {
    console.error(err)
    res.statusCode = 500
    res.end(err?.stack || err?.message || String(err))
  })
}
