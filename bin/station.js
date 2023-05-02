#!/usr/bin/env node

import * as commands from '../commands/index.js'
import fs from 'node:fs/promises'
import { join } from 'node:path'
import { repoRoot, getDefaultRootDirs } from '../lib/paths.js'
import * as Sentry from '@sentry/node'
import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'
import { Core } from '../index.js'

const pkg = JSON.parse(await fs.readFile(join(repoRoot, 'package.json')))

Sentry.init({
  dsn: 'https://6c96a5c2ffa5448d9ec8ddda90012bc9@o1408530.ingest.sentry.io/4504792315199488',
  release: pkg.version,
  environment: pkg.sentryEnvironment,
  tracesSampleRate: 0.1,
  ignoreErrors: [/EACCES/, /EPERM/, /ENOSPC/, /EPIPE/]
})

const core = new Core(getDefaultRootDirs())
const modules = [
  'saturn-L2-node',
  'bacalhau'
]

await fs.mkdir(core.paths.moduleLogs, { recursive: true })
await fs.mkdir(core.paths.metrics, { recursive: true })
await core.activity.maybeCreateActivityFile()
await core.metrics.maybeCreateMetricsFile()
await core.logs.maybeCreateLogFile()
for (const module of modules) {
  await fs.mkdir(join(core.paths.moduleCache, module), { recursive: true })
  await fs.mkdir(join(core.paths.moduleState, module), { recursive: true })
  await core.metrics.maybeCreateMetricsFile(module)
  await core.logs.maybeCreateLogFile(module)
}

yargs(hideBin(process.argv))
  .usage('Usage: $0 <command> [options]')
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
    args => commands.station({ ...args, core })
  )
  .command(
    'metrics [module]',
    'Show metrics',
    () => {},
    args => commands.metrics({ ...args, core })
  )
  .commands(
    'activity',
    'Show activity log',
    yargs => yargs.option('json', {
      alias: 'j',
      type: 'boolean',
      description: 'Output JSON'
    }),
    args => commands.activity({ ...args, core })
  )
  .command(
    'logs [module]',
    'Show module logs',
    () => {},
    args => commands.logs({ ...args, core })
  )
  .choices('module', modules)
  .version(`${pkg.name}: ${pkg.version}`)
  .alias('v', 'version')
  .alias('h', 'help')
  .alias('f', 'follow')
  .parse()
