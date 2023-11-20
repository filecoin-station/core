import assert from 'node:assert'
import { Metrics } from '../lib/metrics.js'

describe('Metrics', () => {
  describe('submit', () => {
    it('should merge metrics', () => {
      const metrics = new Metrics()
      metrics.submit('module1', {
        totalJobsCompleted: 1,
        rewardsScheduledForAddress: 1n
      })
      metrics.submit('module2', {
        totalJobsCompleted: 2,
        rewardsScheduledForAddress: 2n
      })
      assert.deepStrictEqual(metrics.mergedMetrics, {
        totalJobsCompleted: 3,
        rewardsScheduledForAddress: 3n
      })
    })
    it('should filter duplicate entries', () => {
      const metrics = new Metrics()
      let i = 0
      metrics.onUpdate(metrics => {
        if (i === 0) {
          assert.deepStrictEqual(metrics, {
            totalJobsCompleted: 1,
            rewardsScheduledForAddress: 0n
          })
        } else if (i === 1) {
          assert.deepStrictEqual(metrics, {
            totalJobsCompleted: 2,
            rewardsScheduledForAddress: 0n
          })
        } else {
          throw new Error('should not be called')
        }
        i++
      })
      metrics.submit('module1', {
        totalJobsCompleted: 1,
        rewardsScheduledForAddress: 0n
      })
      metrics.submit('module1', {
        totalJobsCompleted: 1,
        rewardsScheduledForAddress: 0n
      })
      metrics.submit('module2', {
        totalJobsCompleted: 1,
        rewardsScheduledForAddress: 0n
      })
    })
  })
})
