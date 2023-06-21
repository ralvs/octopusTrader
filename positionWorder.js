import { RestClientV5 } from 'bybit-api'

const positionWorker = (msg, user, queue) => {
  const client = new RestClientV5({
    key: user.key,
    secret: user.secret,
    testnet: user.testnet,
  })

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

export default positionWorker
