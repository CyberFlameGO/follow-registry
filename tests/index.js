/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('chai-as-promised'))
chai.use(require('dirty-chai'))
const { expect } = chai
const fs = require('fs-extra')
const nock = require('nock')
const follow = require('../')

describe('follow-registry', function () {
  let replicationScope
  let registryScope

  beforeEach(() => {
    nock.cleanAll()

    registryScope = nock('https://registry.npmjs.com')
      .get('/bayes-test-20170221')
      .reply(200, fs.readFileSync(`${__dirname}/responses/modules/bayes-test-20170221.json`))
      .get('/cmacc-form-generalclauses')
      .reply(200, fs.readFileSync(`${__dirname}/responses/modules/cmacc-form-generalclauses.json`))
      .get('/fast-stream')
      .reply(200, fs.readFileSync(`${__dirname}/responses/modules/fast-stream.json`))
      .get('/fnp')
      .reply(200, fs.readFileSync(`${__dirname}/responses/modules/fnp.json`))
      .get('/homebridge-tesla-climate-control')
      .reply(200, fs.readFileSync(`${__dirname}/responses/modules/homebridge-tesla-climate-control.json`))
      .get('/huffman.js')
      .reply(200, fs.readFileSync(`${__dirname}/responses/modules/huffman.js.json`))
      .get('/iebc')
      .reply(200, fs.readFileSync(`${__dirname}/responses/modules/iebc.json`))
      .get('/@jag82/note')
      .reply(200, fs.readFileSync(`${__dirname}/responses/modules/jag82-note.json`))
      .get('/@kgarza/citeproc-doi')
      .reply(200, fs.readFileSync(`${__dirname}/responses/modules/kgarza-citeproc-doi.json`))
      .get('/@lhechenberger/automated-release')
      .reply(200, fs.readFileSync(`${__dirname}/responses/modules/lhechenberger-automated-release.json`))
      .get('/lopezdonaque-test')
      .reply(200, fs.readFileSync(`${__dirname}/responses/modules/lopezdonaque-test.json`))
      .get('/mag-app-youtube-2.0.0beta-3')
      .reply(200, fs.readFileSync(`${__dirname}/responses/modules/mag-app-youtube-2.0.0beta-3.json`))
      .get('/michael-test-20170221')
      .reply(200, fs.readFileSync(`${__dirname}/responses/modules/michael-test-20170221.json`))
      .get('/nezha-cli')
      .reply(200, fs.readFileSync(`${__dirname}/responses/modules/nezha-cli.json`))
      .get('/ng2-material-dropdown-fix')
      .reply(200, fs.readFileSync(`${__dirname}/responses/modules/ng2-material-dropdown-fix.json`))
      .get('/postcss-french-stylesheets')
      .reply(200, fs.readFileSync(`${__dirname}/responses/modules/postcss-french-stylesheets.json`))
      .get('/rekog')
      .reply(200, fs.readFileSync(`${__dirname}/responses/modules/rekog.json`))
      .get('/sojs-script')
      .reply(200, fs.readFileSync(`${__dirname}/responses/modules/sojs-script.json`))
      .get('/state-component')
      .reply(200, fs.readFileSync(`${__dirname}/responses/modules/state-component.json`))
      .get('/vue-formidable')
      .reply(200, fs.readFileSync(`${__dirname}/responses/modules/vue-formidable.json`))
  })

  describe('changes', () => {
    beforeEach(() => {
      replicationScope = nock('https://replicate.npmjs.com')
        .get('/registry/_changes?since=12657&feed=continuous&heartbeat=30000')
        .reply(200, fs.readFileSync(`${__dirname}/responses/changes-12657.ndjson`))
    })

    it('should emit changes', async () => {
      let changes = 0

      for await (const { change, done } of follow({
        since: 12657,
        retries: 0,
        concurrency: 10
      })) {
        expect(change).to.have.property('name').that.is.a('string')
        expect(change).to.have.property('versions').that.is.an.instanceof(Array)
        expect(change).to.have.property('tarballs').that.is.an.instanceof(Array)

        changes++
        await done()

        if (changes === 20) {
          expect(replicationScope.isDone()).to.be.true()
          expect(registryScope.isDone()).to.be.true()

          break
        }
      }
    })
  })

  describe('inactivity timeout', () => {
    beforeEach(() => {
      replicationScope = nock('https://replicate.npmjs.com')
        .get('/registry/_changes?since=12657&feed=continuous&heartbeat=30000')
        .delayBody(2000)
        .reply(200, '') // first response has no updates
        .get('/registry/_changes?since=12657&feed=continuous&heartbeat=30000')
        .reply(200, fs.readFileSync(`${__dirname}/responses/changes-12657.ndjson`))
    })

    it('should hit an inactivity timeeout', async () => {
      let changes = 0

      for await (const { done } of follow({
        since: 12657,
        retries: 0,
        inactivityTimeout: 100,
        inactivityBackoff: 10,
        concurrency: 10
      })) {
        changes++

        await done()

        if (changes === 20) {
          expect(replicationScope.isDone()).to.be.true()
          expect(registryScope.isDone()).to.be.true()

          break
        }
      }
    })
  })

  describe('reset', () => {
    it('should reset the seq number', async () => {
      await follow.reset()
      const res = await follow.seq()

      expect(res).to.equal(0)
    })
  })
})
