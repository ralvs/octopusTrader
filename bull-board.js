import express from 'express'
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js'
import { ExpressAdapter } from '@bull-board/express'

const serverAdapter = new ExpressAdapter()
serverAdapter.setBasePath('/admin')

const getQueues = arrayQueues => {
  createBullBoard({
    queues: [...arrayQueues.map(q => new BullMQAdapter(q))],
    serverAdapter,
  })
}

const app = express()
app.use(express.static('public'))
app.use('/admin', serverAdapter.getRouter())

app.listen(3000, () => {
  console.log('Server running on port 3000')
})

export default getQueues
