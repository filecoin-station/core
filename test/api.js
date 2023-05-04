import { Core } from '../index.js'
import assert from 'node:assert'
import { getDefaultRootDirs } from '../lib/paths.js'

describe('API', () => {
  describe('Core', () => {
    it('can be imported', () => {
      assert(Core)
    })
  })
  describe('Core.create', () => {
    it('can be constructed', async () => {
      assert(await Core.create())
    })
    it('can be constructed with custom paths', async () => {
      assert(await Core.create(getDefaultRootDirs()))
    })
  })
  describe('core.logs', () => {
    it('exports methods', async () => {
      const core = await Core.create()
      assert(core.logs.get)
      assert(core.logs.follow)
    })
  })
  describe('core.activity', () => {
    it('exports methods', async () => {
      const core = await Core.create()
      assert(core.activity.get)
      assert(core.activity.follow)
    })
  })
  describe('core.metrics', () => {
    it('exports methods', async () => {
      const core = await Core.create()
      assert(core.metrics.getLatest)
      assert(core.metrics.follow)
    })
  })
})
