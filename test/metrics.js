import assert from 'node:assert'
import { Metrics } from '../lib/metrics.js'

describe('Metrics', () => {
  describe('submit', () => {
    it('should merge metrics', () => {
      const metrics = new Metrics()
      metrics.submit('module1', {
        totalJobsCompleted: 1,
        scheduledRewards: '0'
      })
      metrics.submit('module2', {
        totalJobsCompleted: 2,
        scheduledRewards: '0'
      })
      assert.deepStrictEqual(metrics.mergedMetrics, {
        totalJobsCompleted: 3,
        scheduledRewards: '0'
      })
    })
    it('should filter duplicate entries', () => {
      const metrics = new Metrics()
      let i = 0
      metrics.onUpdate(metrics => {
        if (i === 0) {
          assert.deepStrictEqual(metrics, {
            totalJobsCompleted: 1,
            scheduledRewards: '0'
          })
        } else if (i === 1) {
          assert.deepStrictEqual(metrics, {
            totalJobsCompleted: 2,
            scheduledRewards: '0'
          })
        } else {
          throw new Error('should not be called')
        }
        i++
      })
      metrics.submit('module1', {
        totalJobsCompleted: 1,
        scheduledRewards: '0'
      })
      metrics.submit('module1', {
        totalJobsCompleted: 1,
        scheduledRewards: '0'
      })
      metrics.submit('module2', {
        totalJobsCompleted: 1,
        scheduledRewards: '0'
      })
    })
  })
})
