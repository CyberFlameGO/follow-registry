'use strict'

const log = require('debug')('follow-registry:seq')
const fsExtra = require('fs-extra')
const path = require('path')

module.exports = async (config) => {
  let inProgress = []
  let lastSuccessful = config.since
  const fs = config.fs || fsExtra

  log(`Creating seq dir ${path.dirname(config.seqFile)}`)
  await fs.mkdirp(path.dirname(config.seqFile))

  return {
    read () {
      if (!isNaN(lastSuccessful)) {
        return lastSuccessful
      }

      try {
        log(`Reading seq file ${config.seqFile}`)
        lastSuccessful = parseInt(fs.readFileSync(config.seqFile, 'utf8'))
      } catch (err) {
        log(err)
      }

      if (isNaN(lastSuccessful)) {
        log('Seq file was invalid')
        lastSuccessful = 0
      }

      return lastSuccessful
    },
    start (seq) {
      inProgress.push({
        seq,
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
    async finish (seq) {
      let lastFinishedSeq

      // mark finished
      inProgress.forEach(op => {
        if (op.seq === seq) {
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
        log(`Writing seq file ${config.seqFile} ${lastFinishedSeq}`)
        await fs.writeFile(config.seqFile, lastFinishedSeq, 'utf8')
      }
    },
    reset () {
      log(`Removing seq file ${config.seqFile}`)
      fs.unlinkSync(config.seqFile)
    }
  }
}
