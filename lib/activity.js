'use strict'

const EventEmitter = require('node:events')

class ActivityEvent {
  /**
   * @param {Object} options
   * @param {Date} options.timestamp
   * @param {("info"|"error")} options.type
   * @param {String} options.source
   * @param {String} options.message
   * @param {String} options.id
   */
  constructor ({ timestamp, type, source, message, id }) {
    this.timestamp = timestamp
    this.type = type
    this.source = source
    this.message = message
    this.id = id
  }
}

const formatActivityObject = ({ type, message }) => {
  return `${type.toUpperCase().padEnd(5)} ${message}`
    .trimEnd()
    .split(/\n/g)
    .map(line => `[${(new Date()).toLocaleString()}] ${line}`)
    .join('\n') + '\n'
}

module.exports = {
  activities: new EventEmitter(),
  ActivityEvent,
  formatActivityObject
}
