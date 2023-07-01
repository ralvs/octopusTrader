import { QueueEvents, Queue } from 'bullmq'
import dotenv from 'dotenv'
// import populateRepeat from './populateRepeat.js'
import supabase from './supabase.js'
// import getQueues from './bull-board.js'

dotenv.config()

const connection = { host: process.env.REDIS_HOST, port: 6379, password: process.env.REDIS_PASS }

const queueOrder = new Queue('order', { connection })
const queuePosition = new Queue('position', { connection })

// Review: should I do this way? Maybe is a waste of VM resources
// const queueRepeat = new Queue('repeat', { connection })
// populateRepeat(queueRepeat)

// await queueOrder.obliterate() // FORCED CLEAN UP
// await queuePosition.obliterate() // FORCED CLEAN UP

// ##########################
// Dashboard
// getQueues([queueOrder, queuePosition])
// ##########################

const queuer = async (msg, masterEquity, masterPosition) => {
  const { data: users, error } = await supabase
    .from('Client')
    .select('id, key, secret, testnet, equity, orders')
    // .eq('master', 'da1e7685-5ba6-4cde-8695-501fb35de05d') // Todo: filter From a Master
    .eq('id', 'da1e7685-5ba6-4cde-8695-501fb35de05d') // Review: remove breaks
  if (error) throw new Error(error)

  for (const user of users) {
    if (user.key.length !== 18 || user.secret.length !== 36) return // nothing to do here

    if (msg.topic === 'order')
      await queueOrder.add(
        user.id,
        { user, msg: msg.data, masterEquity, masterPosition, epoch: Date.now() },
        { removeOnComplete: 1000, removeOnFail: 5000 }
      )

    if (msg.topic === 'position')
      await queuePosition.add(
        user.id,
        { user, msg: msg.data, epoch: Date.now() },
        { removeOnComplete: 1000, removeOnFail: 5000 }
      )
  }
}

//
// ####################################################
//
// https://api.docs.bullmq.io/interfaces/QueueEventsListener.html#added

//
// ####################################################
//

const eventProcessor = qe => {
  let isRunning = false

  // qe.on('waiting', ({ jobId }) => {
  //   console.log(`A job with ID ${jobId} is waiting`)
  // })

  // eslint-disable-next-line no-unused-vars
  qe.on('added', ({ jobId, name }) => {
    if (!isRunning) {
      isRunning = true
      console.time('DONE')
      console.log('🚀 ~ START:')
      // console.log(`Job ${jobId} - ${name} ->> isRunning: ${isRunning}`)
    }
  })
  qe.on('drained', async () => {
    isRunning = false
    console.timeEnd('DONE')
    // console.log(`Job DRAINED, isRunning ${isRunning}`)
    // const counts = await queueOrder.getJobCounts('wait', 'completed', 'failed')
    // const types = await queueOrder.getJobCountByTypes()
    // console.log('🚀 ~ counts:', counts)
    // console.log('🚀 ~ types:', types)
  })

  // qe.on('active', ({ jobId, prev }) => {
  //   console.log(`Job ${jobId} is now active; previous status was ${prev}`)
  // })

  // qe.on('completed', ({ jobId, returnvalue }) => {
  //   console.log(`${jobId} has completed and returned ${returnvalue}`)
  // })

  qe.on('failed', ({ jobId, failedReason }) => {
    console.log(`${jobId} has failed with reason: ${failedReason}`)
    console.log('🚀 ~ ', failedReason.message || '', failedReason.cause || '')
  })
}

const queueEventsOrd = new QueueEvents('order', { connection })
eventProcessor(queueEventsOrd)

const queueEventsPos = new QueueEvents('position', { connection })
eventProcessor(queueEventsPos)

export default queuer
