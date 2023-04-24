import {
  followActivity,
  getActivity,
  formatActivityObject
} from '../lib/activity.js'

export const activity = async ({ follow, json }) => {
  if (follow) {
    for await (const obj of followActivity()) {
      if (json) {
        process.stdout.write(JSON.stringify(obj) + '\n')
      } else {
        process.stdout.write(formatActivityObject(obj))
      }
    }
  } else {
    const activity = await getActivity()
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
