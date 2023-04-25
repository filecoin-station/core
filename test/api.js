import { Core } from '../index.js'
import assert from 'node:assert'
import { getDefaultRootDirs } from '../lib/paths.js'

describe('API', () => {
  it('can be imported', () => {
    assert(Core)
  })
  it('can be constructed', () => {
    assert(new Core(...getDefaultRootDirs()))
  })
})
