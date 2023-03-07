#!/usr/bin/env node

import * as commands from '../commands/index.js'
import fs from 'node:fs/promises'
import { join } from 'node:path'
import { paths } from '../lib/paths.js'
import * as Sentry from '@sentry/node'

const pkg = JSON.parse(await fs.readFile(join(paths.repoRoot, 'package.json')))

Sentry.init({
  dsn: 'https://6c96a5c2ffa5448d9ec8ddda90012bc9@o1408530.ingest.sentry.io/4504792315199488',
  release: pkg.version,
  environment: pkg.sentryEnvironment,
  tracesSampleRate: 0.1
})

if (process.argv.includes('-v') || process.argv.includes('--version')) {
  console.log('%s: %s', pkg.name, pkg.version)
  process.exit()
}

await fs.mkdir(join(paths.moduleStorage, 'saturn-L2-node'), { recursive: true })
await fs.mkdir(paths.moduleLogs, { recursive: true })

if (process.argv.includes('metrics')) {
  await commands.metrics()
} else {
  await commands.station()
}
