// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of
export async function * streamAsyncIterable (stream) {
  const reader = stream.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) return
      yield value
    }
  } finally {
    reader.releaseLock()
  }
}
