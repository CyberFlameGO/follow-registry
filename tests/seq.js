/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('chai-as-promised'))
chai.use(require('dirty-chai'))
const { expect } = chai
const sinon = require('sinon')
const seq = require('../lib/seq')

describe('seq', () => {
  const seqFile = '/foo/bar/baz.txt'
  let fs

  beforeEach(() => {
    fs = {
      mkdirp: sinon.stub(),
      readFileSync: sinon.stub(),
      unlinkSync: sinon.stub(),
      writeFile: sinon.stub()
    }
  })

  it('should ensure seq file directory exists', async () => {
    await seq({ fs, seqFile })

    expect(fs.mkdirp.calledWith('/foo/bar')).to.be.true()
  })

  describe('read', () => {
    it('should read a seq file', async () => {
      fs.readFileSync.withArgs(seqFile, 'utf8').returns('8')
      const s = await seq({ fs, seqFile })

      expect(s.read()).to.equal(8)
    })

    it('should return the default value when failing to read a seq file', async () => {
      fs.readFileSync.withArgs(seqFile, 'utf8').throws(new Error('Nope!'))
      const s = await seq({ fs, seqFile })

      expect(s.read()).to.equal(0)
    })

    it('should return allow overriding the seqfile value', async () => {
      const since = 5
      const s = await seq({ fs, seqFile, since })

      expect(s.read()).to.equal(since)
    })
  })

  describe('start/finish', () => {
    it('should update the seq file', async () => {
      const id = 6
      const s = await seq({ fs, seqFile })

      s.start(id)
      await s.finish(id)

      expect(fs.writeFile.calledWith(seqFile, id, 'utf8')).to.be.true()
    })

    it('should update the seq file out of order', async () => {
      const id1 = 6
      const id2 = 7
      const id3 = 8
      const s = await seq({ fs, seqFile })

      s.start(id1)
      s.start(id2)
      s.start(id3)

      await s.finish(id2)
      expect(fs.writeFile.called).to.be.false()

      await s.finish(id1)
      expect(fs.writeFile.calledWith(seqFile, id2, 'utf8')).to.be.true()

      await s.finish(id3)
      expect(fs.writeFile.calledWith(seqFile, id3, 'utf8')).to.be.true()
    })

    it('should update the seq file in order', async () => {
      const id1 = 6
      const id2 = 7
      const id3 = 8
      const s = await seq({ fs, seqFile })

      s.start(id1)
      s.start(id2)
      s.start(id3)

      await s.finish(id1)
      expect(fs.writeFile.calledWith(seqFile, id1, 'utf8')).to.be.true()

      await s.finish(id2)
      expect(fs.writeFile.calledWith(seqFile, id2, 'utf8')).to.be.true()

      await s.finish(id3)
      expect(fs.writeFile.calledWith(seqFile, id3, 'utf8')).to.be.true()
    })

    it('should update the seq file reverse order', async () => {
      const id1 = 6
      const id2 = 7
      const id3 = 8
      const s = await seq({ fs, seqFile })

      s.start(id1)
      s.start(id2)
      s.start(id3)

      await s.finish(id3)
      expect(fs.writeFile.called).to.be.false()

      await s.finish(id2)
      expect(fs.writeFile.called).to.be.false()

      await s.finish(id1)
      expect(fs.writeFile.calledWith(seqFile, id3, 'utf8')).to.be.true()
    })
  })

  describe('reset', () => {
    it('should reset the seqfile', async () => {
      const s = await seq({ fs, seqFile })

      s.reset()

      expect(fs.unlinkSync.calledWith(seqFile)).to.be.true()
    })
  })
})
