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
  /** @returns {Boolean} */
  emit () {
    throw new Error('Use #submit')
  }

  /**
   * @param {ActivityEvent} activity
   */
  submit (activity) {
    super.emit('activity', activity)
  }
}

module.exports = {
  activities: new Activities(),
  ActivityEvent,
  formatActivityObject
}
