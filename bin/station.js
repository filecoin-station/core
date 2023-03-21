#!/usr/bin/env node

import * as commands from '../commands/index.js'
import fs from 'node:fs/promises'
import { join } from 'node:path'
import { paths } from '../lib/paths.js'
import * as Sentry from '@sentry/node'
import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'
import { maybeCreateMetricsFile } from '../lib/metrics.js'

const pkg = JSON.parse(await fs.readFile(join(paths.repoRoot, 'package.json')))

Sentry.init({
  dsn: 'https://6c96a5c2ffa5448d9ec8ddda90012bc9@o1408530.ingest.sentry.io/4504792315199488',
  release: pkg.version,
  environment: pkg.sentryEnvironment,
  tracesSampleRate: 0.1
})

await fs.mkdir(join(paths.moduleStorage, 'saturn-L2-node'), { recursive: true })
await fs.mkdir(paths.moduleLogs, { recursive: true })
await maybeCreateMetricsFile()

yargs(hideBin(process.argv))
  .usage('Usage: $0 <command> [options]')
  .command(
    '$0',
    'Start Station',
    yargs => yargs
      .option('listen', {
        alias: 'l',
        type: 'boolean',
        description: 'Open HTTP API'
      })
      .option('port', {
        alias: 'p',
        type: 'number',
        default: 7834,
        description: 'HTTP API port'
      }),
    commands.station
  )
  .command('metrics', 'Show metrics', () => {}, commands.metrics)
  .commands('activity', 'Show activity log', () => {}, commands.activity)
  .command('logs [module]', 'Show module logs', () => {}, commands.logs)
  .choices('module', ['saturn-l2-node'])
  .version(`${pkg.name}: ${pkg.version}`)
  .alias('v', 'version')
  .alias('h', 'help')
  .alias('f', 'follow')
  .parse()
