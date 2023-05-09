#!/usr/bin/env node

'use strict'

const saturnNode = require('../lib/saturn-node')
const bacalhau = require('../lib/bacalhau')
const zinnia = require('../lib/zinnia')

await Promise.all([
  saturnNode.instal(),
  bacalhau.install(),
  zinnia.install()
])
