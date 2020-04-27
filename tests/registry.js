/* eslint-env mocha */
'use strict'

const nock = require('nock')
const fs = require('fs-extra')
const chai = require('chai')
chai.use(require('chai-as-promised'))
chai.use(require('dirty-chai'))
const { expect } = chai
const registry = require('../lib/registry')

describe('registry', () => {
  let registryScope
  const config = {
    registry: 'https://registry.npmjs.com',
    retryBackoff: 5000
  }

  describe('split()', function () {
    it('should sanitize bad version data.', function () {
      var shelljs = require('./responses/shelljs.json')

      expect(shelljs.versions['0.0.1alpha1']).to.be.ok()
      expect(shelljs.versions['0.0.2pre1']).to.be.ok()
      expect(shelljs.versions['0.0.4pre1']).to.be.ok()
      expect(shelljs.versions['0.0.5pre1']).to.be.ok()
      expect(shelljs.versions['0.0.5pre2']).to.be.ok()
      expect(shelljs.versions['0.0.5pre3']).to.be.ok()
      expect(shelljs.versions['0.0.5pre4']).to.be.ok()

      var results = registry.split(shelljs)

      expect(results.json.versions['0.0.1-alpha1']).to.be.ok()
      expect(results.json.versions['0.0.2-pre1']).to.be.ok()
      expect(results.json.versions['0.0.4-pre1']).to.be.ok()
      expect(results.json.versions['0.0.5-pre1']).to.be.ok()
      expect(results.json.versions['0.0.5-pre2']).to.be.ok()
      expect(results.json.versions['0.0.5-pre3']).to.be.ok()
      expect(results.json.versions['0.0.5-pre4']).to.be.ok()
    })
  })

  describe('get()', function () {
    beforeEach(() => {
      registryScope = nock('https://registry.npmjs.com')
        .get('/shelljs')
        .reply(200, fs.readFileSync(`${__dirname}/responses/shelljs.json`))
    })

    it('should retrieve valid data from the default registry', async () => {
      const json = await registry.get({ id: 'shelljs' }, 0, config)

      expect(json.name).to.equal('shelljs')
      expect(registryScope.isDone()).to.be.true()
    })
  })

  describe('get() retries', function () {
    beforeEach(() => {
      registryScope = nock('https://registry.npmjs.com')
        .get('/shelljs')
        .replyWithError('Nerp')
        .get('/shelljs')
        .reply(200, fs.readFileSync(`${__dirname}/responses/shelljs.json`))
    })

    it('should retry when getting data fails', async () => {
      const json = await registry.get({ id: 'shelljs' }, 1, {
        ...config,
        retryBackoff: 0
      })

      expect(json.name).to.equal('shelljs')
      expect(registryScope.isDone()).to.be.true()
    })
  })
})
