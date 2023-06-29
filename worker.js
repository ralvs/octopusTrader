/* eslint-disable no-unused-vars */
import { Worker } from 'bullmq'
import dotenv from 'dotenv'
import workerOrder from './workerOrder.js'
import workerPosition from './workerPosition.js'

dotenv.config()

const connection = { host: process.env.REDIS_HOST, port: 6379, password: process.env.REDIS_PASS }
const concurrency = parseInt(process.env.CONCURRENCY)
const timeout = 6000

const wO = new Worker(
  'order',
  async job => {
    const { user, msg, masterEquity, masterPosition, epoch } = job.data
    // eslint-disable-next-line no-throw-literal
    if (epoch + timeout < Date.now()) throw 'job timeout'

    return workerOrder(user, msg, masterEquity, masterPosition)
  },
  { connection, concurrency }
)

//
//
// #######################################################
//
//

const wP = new Worker(
  'position',
  async job => {
    const { msg, user, epoch } = job.data
    // eslint-disable-next-line no-throw-literal
    if (epoch + timeout < Date.now()) throw 'job timeout'

    return workerPosition(user, msg)
  },
  { connection, concurrency }
)

const eventProcessor = we => {
  we.on('error', err => {
    console.log('🚀 ~ we err:', err)
  })

  we.on('failed', (job, returnvalue) => {
    console.log(`${job.id} has failed with reason ${returnvalue}`)
    console.dir(returnvalue, { depth: null })
  })

  we.on('completed', (job, returnvalue) => {
    console.log('🚀 ~ job completed:', job.id, job.name)
    console.log('🚀 ~ returnvalue:', returnvalue)
  })
}

eventProcessor(wO)
eventProcessor(wP)
