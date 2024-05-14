export class Obj {
  constructor (value = null) {
    this._value = value
  }

  set (val) {
    this._value = val
  }

  get () {
    return this._value
  }
}
