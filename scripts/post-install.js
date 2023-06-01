#!/usr/bin/env node

import * as bacalhau from '../lib/bacalhau.js'
import * as zinnia from '../lib/zinnia.js'

await Promise.all([
  bacalhau.install(),
  zinnia.install()
])
