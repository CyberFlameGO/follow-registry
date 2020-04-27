# @achingbrain/follow-registry <!-- omit in toc -->

[![Build Status](https://travis-ci.org/achingbrain/follow-registry.svg?branch=master)](https://travis-ci.org/achingbrain/follow-registry) [![Dependency Status](https://david-dm.org/achingbrain/follow-registry/status.svg)](https://david-dm.org/achingbrain/follow-registry)

> Follows the npm registry and yields change objects when new modules are published

- [Usage](#usage)
- [Changes feed](#changes-feed)
- [Acknowledgements](#acknowledgements)

## Usage

```javascript
const followRegistry = require('@achinbrain/follow-registry')

// All options are optional
const options = {
  // user agent used to request metadata etc
  ua: 'npm-registry-follower',

  // where to get the changes from
  replicator: 'https://replicate.npmjs.com/registry/_changes',

  // where to get module details from
  registry: 'https://registry.npmjs.com',

  // how many sets of metadata to request concurrently
  concurrency: 50,

  // restart the feed if no changes are received for this long
  inactivityTimeout: 3600000,

  // how long to wait after inactivityTimeout
  inactivityBackoff: 5000,

  // how many times to try fetching module metadata
  metadataRetries: 5,

  // how long to wait between retries
  metadataRetryBackoff: 5000,

  // override which seq value to start streaming changes from
  since: undefined,

  // override sequence file storage
  seq: {
    async read (), // returns a seq number
    async write (seq), // stores a seq number
    async reset () // resets the seq number
  }
}

for await (const { change, done } of followRegistry(options)) {
  //...do something with change
  console.info(`${change.name} was updated`)

  // signal we are done processing this change
  //
  // Important - if `done` is not called, the change will be
  // reprocessed the next time `followRegistry` is run
  await done()
}

// read the last sucessfully processed seq
const seq = await follow.seq(options)

// reset the last sucessfully processed seq
await follow.reset(options)
```

## Changes feed

Instead of using the "standard" feed, this pulls the feed and breaks up the data into usable bits:

    {
        name: .. the module name
        versions: [ .. version info split into parts ..],
        tarballs: [ .. all of the tarball data (shasum and url) .. ],
        json: .. metadata retrieved from the registry
    }

## Acknowledgements

Forked from [davglass/follow-registry](https://github.com/davglass/follow-registry).
