#!/usr/bin/env node

import * as commands from '../commands/index.js'
import fs from 'node:fs/promises'
import { join } from 'node:path'
import { paths } from '../lib/paths.js'
import * as Sentry from '@sentry/node'
import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'
import { maybeCreateMetricsFile } from '../lib/metrics.js'
import { maybeCreateActivityFile } from '../lib/activity.js'
import { maybeCreateLogFile } from '../lib/log.js'

const pkg = JSON.parse(await fs.readFile(join(paths.repoRoot, 'package.json')))

Sentry.init({
  dsn: 'https://6c96a5c2ffa5448d9ec8ddda90012bc9@o1408530.ingest.sentry.io/4504792315199488',
  release: pkg.version,
  environment: pkg.sentryEnvironment,
  tracesSampleRate: 0.1,
  ignoreErrors: [/EACCES/, /EPERM/, /ENOSPC/, /EPIPE/]
})

const modules = [
  'saturn-L2-node',
  'bacalhau'
]

await fs.mkdir(paths.moduleLogs, { recursive: true })
await fs.mkdir(paths.metrics, { recursive: true })
await maybeCreateActivityFile()
await maybeCreateMetricsFile()
await maybeCreateLogFile()
for (const module of modules) {
  await fs.mkdir(join(paths.moduleCache, module), { recursive: true })
  await fs.mkdir(join(paths.moduleState, module), { recursive: true })
  await maybeCreateMetricsFile(module)
  await maybeCreateLogFile(module)
}

yargs(hideBin(process.argv))
  .usage('Usage: $0 <command> [options]')
  .command(
    '$0',
    'Start Station',
    yargs => yargs.option('json', {
      alias: 'j',
      type: 'boolean',
      description: 'Output JSON'
    }),
    commands.station
  )
  .command('metrics [module]', 'Show metrics', () => {}, commands.metrics)
  .commands(
    'activity',
    'Show activity log',
    yargs => yargs.option('json', {
      alias: 'j',
      type: 'boolean',
      description: 'Output JSON'
    }),
    commands.activity
  )
  .command('logs [module]', 'Show module logs', () => {}, commands.logs)
  .choices('module', modules)
  .version(`${pkg.name}: ${pkg.version}`)
  .alias('v', 'version')
  .alias('h', 'help')
  .alias('f', 'follow')
  .parse()
