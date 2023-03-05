#!/usr/bin/env node

import * as commands from '../commands/index.js'

if (process.argv.includes('metrics')) {
  await commands.metrics()
} else {
  await commands.station()
}
