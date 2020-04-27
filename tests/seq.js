/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('chai-as-promised'))
chai.use(require('dirty-chai'))
const { expect } = chai
const seq = require('../lib/seq')

describe('seq', () => {
  let seqNum
  let inMemorySeq

  beforeEach(() => {
    seqNum = 0
    inMemorySeq = {
      read: () => seqNum,
      write: (data) => {
        seqNum = data
      },
      reset: () => {
        seqNum = 0
      }
    }
  })

  describe('read', () => {
    it('should read a seq file', async () => {
      seqNum = 8

      const s = await seq({ seq: inMemorySeq })

      await expect(s.read()).to.eventually.equal(seqNum)
    })

    it('should return the default value when failing to read a seq file', async () => {
      const s = await seq({ seq: inMemorySeq })

      await expect(s.read()).to.eventually.equal(0)
    })

    it('should allow overriding the initial seqfile value', async () => {
      const since = 5
      const updated = 6
      const s = await seq({ seq: inMemorySeq, since })

      expect(s.read()).to.eventually.equal(since)

      s.start(updated)
      await s.finish(updated)
      expect(seqNum).to.equal(updated)
      expect(s.read()).to.eventually.equal(updated)
    })
  })

  describe('start/finish', () => {
    it('should update the seq num', async () => {
      const id = 6
      const s = await seq({ seq: inMemorySeq })

      s.start(id)
      await s.finish(id)

      expect(seqNum).to.equal(id)
    })

    it('should update the seq file out of order', async () => {
      const id1 = 6
      const id2 = 7
      const id3 = 8
      const s = await seq({ seq: inMemorySeq })

      s.start(id1)
      s.start(id2)
      s.start(id3)

      await s.finish(id2)
      expect(seqNum).to.equal(0)

      await s.finish(id1)
      expect(seqNum).to.equal(id2)

      await s.finish(id3)
      expect(seqNum).to.equal(id3)
    })

    it('should update the seq file in order', async () => {
      const id1 = 6
      const id2 = 7
      const id3 = 8
      const s = await seq({ seq: inMemorySeq })

      s.start(id1)
      s.start(id2)
      s.start(id3)

      await s.finish(id1)
      expect(seqNum).to.equal(id1)

      await s.finish(id2)
      expect(seqNum).to.equal(id2)

      await s.finish(id3)
      expect(seqNum).to.equal(id3)
    })

    it('should update the seq file reverse order', async () => {
      const id1 = 6
      const id2 = 7
      const id3 = 8
      const s = await seq({ seq: inMemorySeq })

      s.start(id1)
      s.start(id2)
      s.start(id3)

      await s.finish(id3)
      expect(seqNum).to.equal(0)

      await s.finish(id2)
      expect(seqNum).to.equal(0)

      await s.finish(id1)
      expect(seqNum).to.equal(id3)
    })
  })

  describe('reset', () => {
    it('should reset the seqfile', async () => {
      const s = await seq({ seq: inMemorySeq })

      s.start(5)
      await s.finish(5)
      expect(seqNum).to.equal(5)

      await s.reset()

      expect(seqNum).to.equal(0)
    })
  })
})
