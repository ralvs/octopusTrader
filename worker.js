/* eslint-disable no-unused-vars */
import { Worker } from 'bullmq'
import dotenv from 'dotenv'
import workerOrder from './workerOrder.js'
import workerPosition from './workerPosition.js'

dotenv.config()

const options = {
  connection: { host: process.env.REDIS_HOST, port: 6379, password: process.env.REDIS_PASS },
  concurrency: parseInt(process.env.CONCURRENCY),
}
const timeout = 6000

const wO = new Worker(
  'order',
  async job => {
    const { user, msg, masterEquity, masterPosition, epoch } = job.data
    if (epoch + timeout < Date.now()) throw new Error('Job Timeout')

    return workerOrder(user, msg, masterEquity, masterPosition)
  },
  { ...options }
)

// ############################

const wP = new Worker(
  'position',
  async job => {
    const { msg, user, epoch } = job.data
    if (epoch + timeout < Date.now()) throw new Error('Job Timeout')

    return workerPosition(user, msg)
  },
  { ...options }
)

//
//
// #######################################################
//
//

const eventProcessor = we => {
  we.on('error', err => {
    console.log('🚀 ~ we err:', err)
  })

  we.on('failed', (job, returnvalue) => {
    console.log(`Job ${job.id} from client id ${job.name} has failed`)
    console.log('🚀 ~ ', returnvalue.message, returnvalue.cause || '')
  })

  we.on('completed', (job, returnvalue) => {
    console.log('🚀 ~ Job completed: ', job.id, job.name)
    console.log('🚀 ~ returnvalue:', returnvalue)
  })
}

eventProcessor(wO)
eventProcessor(wP)
