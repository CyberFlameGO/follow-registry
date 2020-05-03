'use strict'

const followRegistry = require('./lib')

async function main () {
  for await (const { packument, seq, done } of followRegistry()) {
    console.info(packument.name, 'was updated', seq)

    await done()
  }
}

main()
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
