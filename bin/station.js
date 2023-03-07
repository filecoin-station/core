#!/usr/bin/env node

import * as commands from '../commands/index.js'
import fs from 'node:fs/promises'
import { join } from 'node:path'
import { paths } from '../lib/paths.js'
import * as Sentry from '@sentry/node'
import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'

const { argv } = yargs(hideBin(process.argv))
const pkg = JSON.parse(await fs.readFile(join(paths.repoRoot, 'package.json')))

Sentry.init({
  dsn: 'https://6c96a5c2ffa5448d9ec8ddda90012bc9@o1408530.ingest.sentry.io/4504792315199488',
  release: pkg.version,
  environment: pkg.sentryEnvironment,
  tracesSampleRate: 0.1
})

if (argv.version || argv.v) {
  console.log('%s: %s', pkg.name, pkg.version)
  process.exit()
}

await fs.mkdir(join(paths.moduleStorage, 'saturn-L2-node'), { recursive: true })
await fs.mkdir(paths.moduleLogs, { recursive: true })

if (argv._[0] === 'metrics') {
  await commands.metrics(argv)
} else if (argv._[0] === 'logs') {
  await commands.logs(argv)
} else if (argv._.length > 0) {
  console.error(`Unknown command: ${argv._[0]}`)
  process.exit(1)
} else {
  await commands.station()
}
