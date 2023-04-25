import { Core } from '../index.js'
import assert from 'node:assert'

describe('API', () => {
  it('can be imported', () => {
    assert(Core)
  })
  it('can be constructed', () => {
    assert(new Core())
  })
})
