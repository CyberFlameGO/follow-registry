'use strict'

const fetch = require('node-fetch')

module.exports = async (resource, options) => {
  const response = await fetch(resource, options)

  if (!response.ok) {
    throw new Error(response)
  }

  response.iterator = function () {
    const it = streamToAsyncIterator(response.body)

    if (!isAsyncIterator(it)) {
      throw new Error('Can\'t convert fetch body into a Async Iterator')
    }

    return it
  }

  response.ndjson = async function * () {
    for await (const obj of ndjson(response.iterator())) {
      yield obj
    }
  }

  return response
}

const ndjson = async function * (source) {
  const decoder = new TextDecoder()
  let buf = ''

  for await (const chunk of source) {
    buf += decoder.decode(chunk, { stream: true })
    const lines = buf.split(/\r?\n/)

    for (let i = 0; i < lines.length - 1; i++) {
      const l = lines[i].trim()

      if (l.length > 0) {
        yield JSON.parse(l)
      }
    }
    buf = lines[lines.length - 1]
  }

  buf += decoder.decode()
  buf = buf.trim()

  if (buf.length !== 0) {
    yield JSON.parse(buf)
  }
}

const streamToAsyncIterator = function (source) {
  if (isAsyncIterator(source)) {
    // Workaround for https://github.com/node-fetch/node-fetch/issues/766
    if (Object.prototype.hasOwnProperty.call(source, 'readable') && Object.prototype.hasOwnProperty.call(source, 'writable')) {
      const iter = source[Symbol.asyncIterator]()

      const wrapper = {
        next: iter.next.bind(iter),
        return: () => {
          source.destroy()

          return iter.return()
        },
        [Symbol.asyncIterator]: () => {
          return wrapper
        }
      }

      return wrapper
    }

    return source
  }

  const reader = source.getReader()

  return {
    next () {
      return reader.read()
    },
    return () {
      reader.releaseLock()
      return {}
    },
    [Symbol.asyncIterator] () {
      return this
    }
  }
}

const isAsyncIterator = (obj) => {
  return typeof obj === 'object' &&
  obj !== null &&
  // typeof obj.next === 'function' &&
  typeof obj[Symbol.asyncIterator] === 'function'
}
