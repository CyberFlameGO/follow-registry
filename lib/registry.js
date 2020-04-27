'use strict'

const log = require('debug')('follow-registry:registry')
const { URL } = require('url')
const normalize = require('normalize-registry-metadata')
const request = require('./request')
const delay = require('delay')

async function getDoc (change, retries, config) {
  retries = retries || 0
  var registry = new URL(config.registry)
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

      return getDoc(change, retries--, config)
    }

    throw err
  }
}
exports.get = getDoc

function splitVersions (json) {
  var parts = []

  function addVersionAs (name, version) {
    var versionJson = json.versions[version]
    if (typeof versionJson === 'undefined') {
      return
    }
    parts.push({
      version: name,
      json: JSON.parse(JSON.stringify(versionJson))
    })
  }

  if (json['dist-tags']) {
    Object.keys(json['dist-tags']).forEach(function (name) {
      var tag = json['dist-tags'][name]
      addVersionAs(name, tag)
    })
  }
  if (json.versions) {
    Object.keys(json.versions).forEach(function (name) {
      addVersionAs(name, name)
    })
  }
  return parts
}

function splitTarballs (doc) {
  return doc.versions ? Object.keys(doc.versions).map(function (v) {
    var item = doc.versions[v]
    return {
      path: new URL(item.dist.tarball).pathname,
      tarball: item.dist.tarball,
      shasum: item.dist.shasum
    }
  }) : []
}

function split (json) {
  normalize(json)
  return {
    name: json.name,
    versions: splitVersions(json),
    tarballs: splitTarballs(json),
    json
  }
}

exports.split = split
