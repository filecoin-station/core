#!/usr/bin/env node

'use strict'

const saturnNode = require('../lib/saturn-node')
const bacalhau = require('../lib/bacalhau')
const zinnia = require('../lib/zinnia')

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
