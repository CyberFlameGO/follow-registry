'use strict'

const log = require('debug')('follow-registry')
const request = require('./request')
const createSeq = require('./seq.js')
const registry = require('./registry.js')
const parallelBatch = require('it-parallel-batch')
const delay = require('delay')
const AbortController = require('abort-controller')

const defaultConfig = {
  ua: 'npm-registry-follower',
  replicator: 'https://replicate.npmjs.com/registry/_changes',
  registry: 'https://registry.npmjs.com',
  seqFile: '/tmp/registry-follow.seq',
  concurrency: 50, // how many updates to process at once
  inactivityTimeout: 3600000, // how long to wait before restarting the change feed
  inactivityBackoff: 5000,
  metadataRetries: 5, // how many times to try fetching registry data
  metadataRetryBackoff: 5000, // how long to wait between retries
  handler: async (change) => {}, // invoked with every change
  since: undefined // override which seq value to start streaming changes from
}

async function * streamChanges (config) {
  if (config.signal && config.signal.aborted) {
    return
  }

  while (true) {
    try {
      const resource = `${config.replicator}?${new URLSearchParams({
        since: config.seq.read(),
        feed: 'continuous',
        heartbeat: 30000
      })}`

      log('fetching', resource)

      const controller = new AbortController()

      // abort if we don't receive updates for a while
      let timeout = setTimeout(() => {
        controller.abort()
      }, config.inactivityTimeout)
      timeout.unref()

      const response = await request(resource, {
        headers: {
          'user-agent': config.ua,
        },
        signal: controller.signal
      })

      for await (const change of response.ndjson()) {
        if (!change.seq) {
          log('Invalid change', change)
          continue
        }

        // update inactivity timeout
        clearTimeout(timeout)
        timeout = setTimeout(() => {
          controller.abort()
        }, config.inactivityTimeout)
        timeout.unref()

        // start processing
        const seq = change.seq
        config.seq.start(seq)

        yield async () => {
          const doc = await registry.get(change, config.metadataRetries, config)
          const processed = registry.split(doc)

          if (processed.json.error) {
            if (processed.json.error !== 'not_found') {
              throw new Error(`Failed to process seq ${seq} ${processed.json.error} ${processed.json.reason}`)
            }

            log('could not process', seq, processed.json.error)
          }

          return {
            change: processed,
            done: () => {
              log('writing seq', seq)
              return config.seq.finish(seq)
            }
          }
        }
      }
    } catch (err) {
      log(`Request error ${err}`)
      await delay(config.inactivityBackoff)
    }
  }
}

async function * followRegistry (config = {}) {
  config = {
    ...defaultConfig,
    ...config
  }

  if (!config.seq) {
    config.seq = await createSeq(config)
  }

  yield * parallelBatch(streamChanges(config), config.concurrency)
}

module.exports = followRegistry
