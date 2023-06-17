import supabase from './supabase.js'

const orderHandler = (msg, client, { id, orders }, masterEquity, masterPosition) =>
  msg.map(m => {
    switch (m.orderStatus) {
      case 'New':
      case 'Filled':
        return async () => {
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
            // ################################################
            // close position completely

            // // close all opened orders
            // if (m.qty === masterPosition) {
            //   // didn't use 'await' to keep going faster
            //   client.cancelAllOrders({
            //     category: 'linear',
            //     symbol: m.symbol,
            //   })

            //   const { data, error } = await supabase
            //     .from('Client')
            //     .update({ orders: {} })
            //     .eq('id', id)
            //     .select()
            //   console.log('🚀 ~ data:', data)
            //   if (error) console.log('🚀 ~ error updating users orders:', error)
            // }

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
            orderLinkId: orders[m.orderId] || '',
            price: m.price,
            side: m.side,
            stopLoss: m.stopLoss,
            takeProfit: m.takeProfit,
            reduceOnly: m.reduceOnly,
          }

          // orders.includes(m.orderId)
          // orders.push(m.orderId)
          // orders.splice(orders.indexOf(m.orderId))
          if (m.orderStatus === 'New' && orders[m.orderId]) return client.amendOrder(params)

          if (m.orderStatus === 'New') orders[m.orderId] = m.orderId
          else delete orders[m.orderId]

          const { error } = await supabase
            .from('Client')
            .update({
              ...(equity && { equity }),
              orders,
            })
            .eq('id', id)
          if (error) console.log('🚀 ~ error updating users orders 111:', error)

          return client.submitOrder({
            ...params,
            qty: clientQty,
            orderLinkId: orders[m.orderId] || '',
          })
        }

      case 'Cancelled':
        return async () => {
          if (!orders[m.orderId]) return true

          const tmp = orders[m.orderId]
          delete orders[m.orderId]
          const { error } = await supabase.from('Client').update({ orders }).eq('id', id)
          if (error) console.log('🚀 ~ error updating users orders 222:', error)

          return client.cancelOrder({
            category: 'linear',
            symbol: m.symbol,
            orderLinkId: tmp,
          })
        }

      case 'Untriggered': // setting stop/take from open position
      case 'Deactivated': // removing stop/take
        let stop = NaN
        let take = NaN
        if (m.stopOrderType === 'StopLoss') stop = m.orderStatus === 'Deactivated' ? '0' : m.triggerPrice
        if (m.stopOrderType === 'TakeProfit') take = m.orderStatus === 'Deactivated' ? '0' : m.triggerPrice

        return () =>
          client.setTradingStop({
            category: 'linear',
            symbol: m.symbol,
            stopLoss: stop, // '0' = clear | NaN = to ignore
            takeProfit: take, // '0' = clear | NaN = to ignore
            positionIdx: 0, // one-way mode
          })

      default:
        return () => true
    }
  })

export default orderHandler
