'use strict'

const log = require('debug')('follow-registry:registry')
const { URL } = require('url')
const request = require('./request')
const delay = require('delay')

async function downloadManifest (change, retries, config) {
  retries = retries || 0
  const registry = new URL(config.registry)
  registry.pathname = `${registry.pathname}${change.id}`

  const resource = registry.toString()

  try {
    log('getting', resource)

    const response = await request(resource, {
      headers: {
        'user-agent': config.ua,
        accept: 'application/vnd.npm.install-v1+json'
      }
    })

    return response.json()
  } catch (err) {
    if (retries > 0) {
      log(`Waiting ${config.metadataRetryBackoff}ms before retrying`)
      await delay(config.metadataRetryBackoff)

      return downloadManifest(change, retries--, config)
    }

    throw err
  }
}

module.exports = downloadManifest
