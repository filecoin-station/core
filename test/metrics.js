'use strict'

const assert = require('node:assert')
const { Metrics } = require('../lib/metrics')

describe('Metrics', () => {
  describe('submit', () => {
    it('should merge metrics', () => {
      const metrics = new Metrics()
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
    it('should filter duplicate entries', () => {
      const metrics = new Metrics()
      let i = 0
      metrics.onUpdate(metrics => {
        if (i === 0) {
          assert.deepStrictEqual(metrics, {
            totalJobsCompleted: 1,
            totalEarnings: '0'
          })
        } else if (i === 1) {
          assert.deepStrictEqual(metrics, {
            totalJobsCompleted: 2,
            totalEarnings: '0'
          })
        } else {
          throw new Error('should not be called')
        }
        i++
      })
      metrics.submit('module1', {
        totalJobsCompleted: 1,
        totalEarnings: '0'
      })
      metrics.submit('module1', {
        totalJobsCompleted: 1,
        totalEarnings: '0'
      })
      metrics.submit('module2', {
        totalJobsCompleted: 1,
        totalEarnings: '0'
      })
    })
  })
})
