import timers from 'node:timers/promises'

export const runUpdateRewardsLoop = async ({ contracts, ethAddress, onMetrics, lastTotalJobsCompleted, lastRewardsScheduledForAddress }) => {
  while (true) {
    while (!contracts.get()) {
      await timers.setTimeout(1000)
    }
    const contractRewards = await Promise.all(contracts.get().map(async contract => {
      return getScheduledRewardsWithFallback(contract, ethAddress)
    }))
    const totalRewards = contractRewards.reduce((a, b) => a + b, 0n)
    onMetrics({
      totalJobsCompleted: lastTotalJobsCompleted.get(),
      rewardsScheduledForAddress: totalRewards
    })
    lastRewardsScheduledForAddress.set(totalRewards)

    const delay = 10 * 60 * 1000 // 10 minutes
    const jitter = Math.random() * 20_000 - 10_000 // +- 10 seconds
    await timers.setTimeout(delay + jitter)
  }
}

async function getScheduledRewardsWithFallback (contract, ethAddress) {
  try {
    return await contract.rewardsScheduledFor(ethAddress)
  } catch (err) {
    console.error('Failed to get scheduled rewards:', err.stack)
    return 0n
  }
}
