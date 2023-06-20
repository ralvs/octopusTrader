import { RestClientV5 } from 'bybit-api'
import supabase from './supabase.js'
import orderHandler from './handleOrders.js'

// ########################

const positionHandler = (queue, msg, client) => {
  queue.add(() =>
    client.switchIsolatedMargin({
      category: 'linear',
      symbol: msg[0].symbol,
      tradeMode: msg[0].tradeMode,
      buyLeverage: msg[0].leverage,
      sellLeverage: msg[0].leverage,
      // sellLeverage: msg[1] ? msg[1].leverage : msg[0].leverage, // usando edge-mode
    })
  )

  queue.add(() =>
    client.setLeverage({
      category: 'linear',
      symbol: msg[0].symbol,
      buyLeverage: msg[0].leverage,
      sellLeverage: msg[0].leverage,
    })
  )

  // queue.add(() =>
  //   client.cancelAllOrders({
  //     category: 'linear',
  //     symbol: msg[0].symbol,
  //   })
  // )
}

// ###########################################################################
// ###########################################################################

const propagate = async (queue, msg, masterEquity, masterPosition) => {
  const { data: users, error } = await supabase
    .from('Client')
    .select('id, key, secret, testnet, equity, orders')
  if (error) throw new Error(error)

  users.forEach(async user => {
    const client = new RestClientV5({
      key: user.key,
      secret: user.secret,
      testnet: user.testnet,
    })

    if (msg.topic === 'position') positionHandler(queue, msg.data, client)
    if (msg.topic === 'order') await orderHandler(queue, msg.data, client, user, masterEquity, masterPosition)
  })
}

export { propagate }
