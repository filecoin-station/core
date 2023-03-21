import { getLatestMetrics, followMetrics } from '../lib/metrics.js'
import http from 'node:http'
import { once } from 'node:events'

const asyncHandler = async (req, res) => {
  const url = new URL(req.url, 'http://localhost/')

  if (url.pathname === '/metrics') {
    res.setHeader('Content-Type', 'application/json')
    if (url.searchParams.has('follow')) {
      const controller = new AbortController()
      const { signal } = controller
      await Promise.all([
        (async () => {
          try {
            await once(req, 'close')
          } catch {
          } finally {
            controller.abort()
          }
        })(),
        (async () => {
          try {
            for await (const line of followMetrics({ signal })) {
              res.write(`${line}\n`)
            }
          } catch {}
        })()
      ])
    } else {
      res.end(await getLatestMetrics())
    }
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
