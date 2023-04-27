import { Core } from '../index.js'
import assert from 'node:assert'
import { getDefaultRootDirs } from '../lib/paths.js'

describe('API', () => {
  describe('Core()', () => {
    it('can be imported', () => {
      assert(Core)
    })
    it('can be constructed', () => {
      assert(new Core())
    })
    it('can be constructed with custom paths', () => {
      assert(new Core(getDefaultRootDirs()))
    })
  })
  describe('core.logs', () => {
    it('exports methods', () => {
      const core = new Core()
      assert(core.logs.get)
      assert(core.logs.follow)
    })
  })
  describe('core.activity', () => {
    it('exports methods', () => {
      const core = new Core()
      assert(core.activity.get)
      assert(core.activity.follow)
    })
  })
  describe('core.metrics', () => {
    it('exports methods', () => {
      const core = new Core()
      assert(core.metrics.getLatest)
      assert(core.metrics.follow)
    })
  })
})
