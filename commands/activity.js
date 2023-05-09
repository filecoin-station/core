'use strict'

const { formatActivityObject } = require('../lib/activity')

const activity = async ({ core, follow, json }) => {
  if (follow) {
    for await (const obj of core.activity.follow()) {
      if (json) {
        process.stdout.write(JSON.stringify(obj) + '\n')
      } else {
        process.stdout.write(formatActivityObject(obj))
      }
    }
  } else {
    const activity = await core.activity.get()
    if (json) {
      console.log(JSON.stringify(activity, 0, 2))
    } else {
      process.stdout.write(
        activity
          .map(obj => formatActivityObject(obj))
          .join('')
      )
    }
  }
}

module.exports = {
  activity
}
