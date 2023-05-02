#!/usr/bin/env node

import { install as installSaturn } from '../lib/saturn-node.js'
import { install as installBacalhau } from '../lib/bacalhau.js'

await Promise.all([
  installSaturn(),
  installBacalhau()
])
