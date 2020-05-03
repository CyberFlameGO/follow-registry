/* eslint-env mocha */
'use strict'

const nock = require('nock')
const fs = require('fs-extra')
const chai = require('chai')
chai.use(require('chai-as-promised'))
chai.use(require('dirty-chai'))
const { expect } = chai
const downloadManifest = require('../lib/download-manifest')

describe('download-manifest', () => {
  let registryScope
  const config = {
    registry: 'https://registry.npmjs.com',
    retryBackoff: 5000
  }

  describe('get()', function () {
    beforeEach(() => {
      registryScope = nock('https://registry.npmjs.com')
        .get('/shelljs')
        .reply(200, fs.readFileSync(`${__dirname}/responses/shelljs.json`))
    })

    it('should retrieve valid data from the default registry', async () => {
      const json = await downloadManifest({ id: 'shelljs' }, 0, config)

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
      const json = await downloadManifest({ id: 'shelljs' }, 1, {
        ...config,
        retryBackoff: 0
      })

      expect(json.name).to.equal('shelljs')
      expect(registryScope.isDone()).to.be.true()
    })
  })
})
