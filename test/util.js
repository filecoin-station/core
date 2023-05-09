'use strict'

const { join } = require('node:path')

// From https://lotus.filecoin.io/lotus/manage/manage-fil/
exports.FIL_WALLET_ADDRESS = 'f1abjxfbp274xpdqcpuaykwkfb43omjotacm2p3za'

exports.station = join(__dirname, '..', 'bin', 'station.js')
