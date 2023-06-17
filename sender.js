import { RestClientV5 } from 'bybit-api'
import supabase from './supabase.js'
import orderHandler from './handleOrders.js'

// ########################

const positionHandler = (msg, client) => [
  () =>
    client.switchIsolatedMargin({
      category: 'linear',
      symbol: msg[0].symbol,
      tradeMode: msg[0].tradeMode,
      buyLeverage: msg[0].leverage,
      sellLeverage: msg[0].leverage,
      // sellLeverage: msg[1] ? msg[1].leverage : msg[0].leverage, // usando edge-mode
    }),
  () =>
    client.setLeverage({
      category: 'linear',
      symbol: msg[0].symbol,
      buyLeverage: msg[0].leverage,
      sellLeverage: msg[0].leverage,
    }),
  // () =>
  //   client.cancelAllOrders({
  //     category: 'linear',
  //     symbol: msg[0].symbol,
  //   }),
]

// ###########################################################################
// ###########################################################################

const sender = async (msg, masterEquity, masterPosition) => {
  const { data: users, error } = await supabase
    .from('Client')
    .select('id, key, secret, testnet, equity, orders')
  if (error) throw new Error(error)
  // console.log('🚀 ~ ', users)

  const toAllUsers = users.reduce((toRun, user) => {
    const client = new RestClientV5({
      key: user.key,
      secret: user.secret,
      testnet: user.testnet,
    })

    if (msg.topic === 'position') toRun.push(...positionHandler(msg.data, client))
    if (msg.topic === 'order')
      toRun.push(...orderHandler(msg.data, client, user, masterEquity, masterPosition))

    return toRun
  }, [])

  const start = performance.now()

  return (
    Promise.allSettled(toAllUsers.map(f => f()))
      .then(() => {
        // console.dir(out, { depth: null, colors: true })
        console.log('🚀 ~ FINISH ON CLIENTS')
        const end = performance.now()
        console.log(`🚀 🚀 🚀 🚀 🚀 ~ Execution time: ${end - start} ms`)
      })
      // .then(out => console.dir(out, { depth: null, colors: true }))
      .catch(err => console.log('END Error: ', err))
  )
}

// ###########################################################################
// ###########################################################################

export { sender }
