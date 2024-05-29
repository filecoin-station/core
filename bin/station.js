#!/usr/bin/env node

import { station } from '../commands/station.js'
import * as Sentry from '@sentry/node'
import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'
import fs from 'node:fs/promises'
import * as paths from '../lib/paths.js'

const pkg = JSON.parse(await fs.readFile(paths.packageJSON, 'utf8'))

Sentry.init({
  dsn: 'https://3b1d31e8f060624bb21a70142f53a56e@o1408530.ingest.us.sentry.io/4504792315199488',
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
      }),
    ({ json, experimental }) => station({ json, experimental })
  )
  .version(`${pkg.name}: ${pkg.version}`)
  .alias('v', 'version')
  .alias('h', 'help')
  .parse()
