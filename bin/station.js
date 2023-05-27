#!/usr/bin/env node

import { station } from '../commands/station.js'
import Sentry from '@sentry/node'
import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'
import fs from 'node:fs/promises'

const pkg = JSON.parse(
  await fs.readFile(
    new URL('../package.json', import.meta.url),
    'utf8'
  )
)

Sentry.init({
  dsn: 'https://6c96a5c2ffa5448d9ec8ddda90012bc9@o1408530.ingest.sentry.io/4504792315199488',
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
