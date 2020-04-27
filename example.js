'use strict'

const followRegistry = require('./lib')

async function main () {
  for await (const { change, done } of followRegistry()) {
    console.info(change.name, 'was updated', change.seq)

    await done()
  }
}

main()
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
