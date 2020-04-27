'use strict'

const log = require('debug')('follow-registry:seq')

module.exports = async (config) => {
  let inProgress = []
  let lastSuccessful = config.since
  const seq = config.seq

  return {
    async read () {
      if (!isNaN(lastSuccessful)) {
        return lastSuccessful
      }

      try {
        lastSuccessful = parseInt(await seq.read())
      } catch (err) {
        log(err)
      }

      if (isNaN(lastSuccessful)) {
        lastSuccessful = 0
      }

      return lastSuccessful
    },
    start (seqNum) {
      inProgress.push({
        seq: seqNum,
        finished: false
      })
      inProgress.sort((a, b) => {
        // ascending seq order
        if (a.seq > b.seq) {
          return 1
        }

        if (b.seq > a.seq) {
          return -1
        }

        return 0
      })
    },
    async finish (seqNum) {
      let lastFinishedSeq

      // mark finished
      inProgress.forEach(op => {
        if (op.seq === seqNum) {
          op.finished = true
        }
      })

      const stillInProgress = []

      // work out the last finished sequence number
      for (let i = 0; i < inProgress.length; i++) {
        const op = inProgress[i]

        if (op.finished && !stillInProgress.length) {
          lastFinishedSeq = op.seq
        } else {
          stillInProgress.push(op)
        }
      }

      inProgress = stillInProgress

      if (lastFinishedSeq) {
        log(`Writing seq ${lastFinishedSeq}`)
        lastSuccessful = lastFinishedSeq
        await seq.write(lastFinishedSeq)
      }
    },
    async reset () {
      log('Resetting seq')
      await seq.reset()
    }
  }
}
