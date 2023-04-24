import { core } from '../index.js'
import assert from 'node:assert'

describe('API', () => {
  it('can be imported', async () => {
    assert(core)
  })
})
