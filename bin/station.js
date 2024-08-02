#!/usr/bin/env node

import { station } from '../commands/station.js'
import * as Sentry from '@sentry/node'
import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'
import fs from 'node:fs/promises'
import * as paths from '../lib/paths.js'

const pkg = JSON.parse(await fs.readFile(paths.packageJSON, 'utf8'))

Sentry.init({
  dsn: 'https://c21b3ce464c161f63d32fc64be84477a@o1408530.ingest.us.sentry.io/4504792315199488',
  release: pkg.version,
  environment: pkg.sentryEnvironment,
  tracesSampleRate: 0.1,
  ignoreErrors: [/EACCES/, /EPERM/, /ENOSPC/, /EPIPE/]
})

yargs(hideBin(process.argv))
  .usage('Usage: $0 [options]')
  .command(
    '$0',
    'Start Station',
    yargs => yargs
      .option('json', {
        alias: 'j',
        type: 'boolean',
        description: 'Output JSON'
      })
      .option('experimental', {
        type: 'boolean',
        description: 'Also run experimental modules'
      })
      .option('recreateStationIdOnError', {
        type: 'boolean',
        description: 'Recreate Station ID if it is corrupted'
      }),
    ({ json, experimental, recreateStationIdOnError }) => station({ json, experimental, recreateStationIdOnError })
  )
  .version(`${pkg.name}: ${pkg.version}`)
  .alias('v', 'version')
  .alias('h', 'help')
  .parse()
