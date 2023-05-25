'use strict'

const assert = require('node:assert')
const { metrics } = require('../lib/metrics')

describe('Metrics', () => {
  describe('submit', () => {
    it('should merge metrics', () => {
      metrics.submit('module1', {
        totalJobsCompleted: 1,
        totalEarnings: '0'
      })
      metrics.submit('module2', {
        totalJobsCompleted: 2,
        totalEarnings: '0'
      })
      assert.deepStrictEqual(metrics.mergedMetrics, {
        totalJobsCompleted: 3,
        totalEarnings: '0'
      })
    })
  })
})
