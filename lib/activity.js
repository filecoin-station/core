'use strict'

const EventEmitter = require('node:events')

class ActivityEvent {
  /**
   * @param {Object} options
   * @param {("info"|"error")} options.type
   * @param {String} options.source
   * @param {String} options.message
   */
  constructor ({ type, source, message }) {
    this.type = type
    this.source = source
    this.message = message
  }
}

const formatActivityObject = ({ type, message }) => {
  return `${type.toUpperCase().padEnd(5)} ${message}`
    .trimEnd()
    .split(/\n/g)
    .map(line => `[${(new Date()).toLocaleString()}] ${line}`)
    .join('\n') + '\n'
}

class Activities extends EventEmitter {
  /**
   * @param {ActivityEvent} activity
   */
  submit (activity) {
    this.emit('activity', activity)
  }
}

module.exports = {
  activities: new Activities(),
  ActivityEvent,
  formatActivityObject
}
