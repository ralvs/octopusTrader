import supabase from './supabase.js'
import orderWorker from './orderWorker.js'
import positionWorker from './positionWorder.js'

const queuer = async (queue, msg, masterEquity, masterPosition) => {
  const { data: users, error } = await supabase
    .from('Client')
    .select('id, key, secret, testnet, equity, orders')
  if (error) throw new Error(error)

  users.forEach(async user => {
    if (msg.topic === 'position') positionWorker(msg.data, user, queue)
    if (msg.topic === 'order') orderWorker(queue, user, msg.data, masterEquity, masterPosition)
  })
}

export default queuer
