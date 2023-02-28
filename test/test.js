import test from 'test'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'

const run = () => execa(join(
  dirname(fileURLToPath(import.meta.url)),
  '../bin/station.js'
))

test('CLI', async t => {
  await run()
})
