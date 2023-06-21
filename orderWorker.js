import { RestClientV5 } from 'bybit-api'
import supabase from './supabase.js'

const orderWorker = (queue, { key, secret, testnet, id, orders }, msg, masterEquity, masterPosition) => {
  const client = new RestClientV5({
    key,
    secret,
    testnet,
  })

  msg.forEach(async m => {
    switch (m.orderStatus) {
      case 'New':
      case 'Filled':
        let clientQty = '0'
        let equity = null

        // ################################################
        // starting positions or open limit orders
        if (!m.reduceOnly) {
          const balance = await client.getWalletBalance({
            accountType: 'CONTRACT',
            coin: 'USDT',
          })

          equity = balance.result.list[0].coin[0].equity
          clientQty = ((equity * m.qty) / masterEquity).toFixed(8)
        } else {
          // making partial profit or closing position
          const positionInfo = await client.getPositionInfo({
            category: 'linear',
            symbol: m.symbol,
          })

          const x = positionInfo.result.list[0].size
          clientQty = m.qty === masterPosition ? x : ((x * m.qty) / masterPosition).toFixed(8)
        }
        // ################################################

        const params = {
          category: 'linear',
          symbol: m.symbol,
          orderType: m.orderType,
          orderLinkId: orders[m.orderId] ? m.orderId : '',
          price: m.price,
          // ...(isQtyChanged && { qty: clientQty }),
          qty: clientQty,
          side: m.side,
          stopLoss: m.stopLoss,
          takeProfit: m.takeProfit,
          reduceOnly: m.reduceOnly,
        }

        if (m.orderStatus === 'New' && orders[m.orderId]) {
          console.log('🚀 ~ params:', params)
          queue.add(() => client.amendOrder(params))
          return
        }

        if (m.orderStatus === 'New') orders[m.orderId] = true
        else delete orders[m.orderId] // orderStatus=Filled and !orders[m.orderId]

        const { error } = await supabase
          .from('Client')
          .update({
            ...(equity && { equity }),
            orders,
          })
          .eq('id', id)
        if (error) console.log('🚀 ~ error updating users orders 111:', error)

        queue.add(() =>
          client.submitOrder({
            ...params,
            qty: clientQty,
            orderLinkId: orders[m.orderId] ? m.orderId : '',
          })
        )

        break

      case 'Cancelled':
        if (!orders[m.orderId]) return true

        delete orders[m.orderId]
        const { error2 } = await supabase.from('Client').update({ orders }).eq('id', id)
        if (error2) console.log('🚀 ~ error updating users orders 222:', error2)

        queue.add(() =>
          client.cancelOrder({
            category: 'linear',
            symbol: m.symbol,
            orderLinkId: m.orderId,
          })
        )
        break

      case 'Untriggered': // setting stop/take from open position
      case 'Deactivated': // removing stop/take
        let stop = NaN
        let take = NaN
        if (m.stopOrderType === 'StopLoss') stop = m.orderStatus === 'Deactivated' ? '0' : m.triggerPrice
        if (m.stopOrderType === 'TakeProfit') take = m.orderStatus === 'Deactivated' ? '0' : m.triggerPrice

        queue.add(() =>
          client.setTradingStop({
            category: 'linear',
            symbol: m.symbol,
            stopLoss: stop, // '0' = clear | NaN = to ignore
            takeProfit: take, // '0' = clear | NaN = to ignore
            positionIdx: 0, // one-way mode
          })
        )
        break

      default:
        break
    }
  })
}
export default orderWorker
