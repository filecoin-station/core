#!/usr/bin/env node

import * as saturnNode from '../lib/saturn-node.js'
import * as bacalhau from '../lib/bacalhau.js'
import * as zinnia from '../lib/zinnia.js'

const main = async () => {
  await Promise.all([
    saturnNode.install(),
    bacalhau.install(),
    zinnia.install()
  ])
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
