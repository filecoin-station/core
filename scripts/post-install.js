#!/usr/bin/env node

import * as saturnNode from '../lib/saturn-node.js'
import * as bacalhau from '../lib/bacalhau.js'
import * as zinnia from '../lib/zinnia.js'

await Promise.all([
  saturnNode.install(),
  bacalhau.install(),
  zinnia.install()
])
