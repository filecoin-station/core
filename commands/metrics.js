'use strict'

const metrics = async ({ core, follow, module }) => {
  if (follow) {
    for await (const obj of core.metrics.follow({ module })) {
      console.log(JSON.stringify(obj, null, 2))
    }
  } else {
    console.log(JSON.stringify(await core.metrics.getLatest(module), null, 2))
  }
}

module.exports = {
  metrics
}
