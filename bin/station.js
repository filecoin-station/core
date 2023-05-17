#!/usr/bin/env node

'use strict'

const commands = require('../commands')
const Sentry = require('@sentry/node')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
// We must not require('..') as that confuses TypeScript compiler.
// The compiler will look at our package.json, find that the types are in `dist/index.d.ts`
// and load that output file instead of the actual input `index.js`.
const { Core } = require('./index')
const pkg = require('../package.json')

Sentry.init({
  dsn: 'https://6c96a5c2ffa5448d9ec8ddda90012bc9@o1408530.ingest.sentry.io/4504792315199488',
  release: pkg.version,
  environment: pkg.sentryEnvironment,
  tracesSampleRate: 0.1,
  ignoreErrors: [/EACCES/, /EPERM/, /ENOSPC/, /EPIPE/]
})

const main = async () => {
  const core = await Core.create()

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
    .choices('module', core.modules)
    .version(`${pkg.name}: ${pkg.version}`)
    .alias('v', 'version')
    .alias('h', 'help')
    .alias('f', 'follow')
    .parse()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
