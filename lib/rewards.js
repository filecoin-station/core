import timers from 'node:timers/promises'

/**
 * @param {object} args
 * @param {import('ethers').Contract[]} args.contracts
 * @param {string} args.ethAddress
 * @param {(m: Partial<import('./metrics.js').MetricsEvent>) => void} args.onMetrics
 */
export const runUpdateRewardsLoop = async ({ contracts, ethAddress, onMetrics }) => {
  while (true) {
    while (!contracts.length) {
      await timers.setTimeout(1000)
    }
    const rewards = await Promise.all([
      ...contracts.map(async contract => {
        return getContractScheduledRewardsWithFallback(contract, ethAddress)
      }),
      getSparkRewardsScheduledRewardsWithFallback(ethAddress)
    ])
    const totalRewards = rewards.reduce((a, b) => a + b, 0n)
    onMetrics({ rewardsScheduledForAddress: totalRewards })

    const delay = 10 * 60 * 1000 // 10 minutes
    const jitter = Math.random() * 20_000 - 10_000 // +- 10 seconds
    await timers.setTimeout(delay + jitter)
  }
}

async function getSparkRewardsScheduledRewardsWithFallback (ethAddress) {
  try {
    const res = await fetch(
      `https://spark-rewards.fly.dev/scheduled-rewards/${ethAddress}`
    )
    const json = await res.json()
    return typeof json === 'string'
      ? BigInt(json)
      : 0n // json can be `null`
  } catch (err) {
    console.error('Failed to get scheduled rewards:', err.stack)
    return 0n
  }
}

async function getContractScheduledRewardsWithFallback (contract, ethAddress) {
  try {
    return await contract.rewardsScheduledFor(ethAddress)
  } catch (err) {
    console.error('Failed to get scheduled rewards:', err.stack)
    return 0n
  }
}
