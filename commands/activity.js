import { formatLog } from '../lib/log.js'
import { followActivity, getActivity } from '../lib/activity.js'

const formatActivityObject = ({ type, message, date }) => {
  return formatLog(`${type.toUpperCase().padEnd(5)} ${message}`, date)
}

export const activity = async ({ follow }) => {
  if (follow) {
    for await (const obj of followActivity()) {
      process.stdout.write(formatActivityObject(obj))
    }
  } else {
    process.stdout.write(
      (await getActivity())
        .map(obj => formatActivityObject(obj))
        .join('')
    )
  }
}
