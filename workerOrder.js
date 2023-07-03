import { RestClientV5 } from 'bybit-api'
import supabase from './supabase.js'

// Get all coins qty step
const info = await fetch(
  'https://api.bybit.com/v5/market/instruments-info?category=linear&basecoin=USDT'
).then(res => res.json())
if (info.retMsg !== 'OK') throw new Error('Error getting qty steps', { cause: info })

const steps = info.result.list.reduce(
  (tot, item) => ({ ...tot, [item.symbol]: item.lotSizeFilter.qtyStep }),
  {}
)

const workerOrder = async ({ key, secret, testnet, id, orders }, msg, masterEquity, masterPosition) => {
  const client = new RestClientV5({
    key,
    secret,
    testnet,
  })

  for (const m of msg) {
    if (m.orderStatus === 'New' || m.orderStatus === 'Filled') {
      if (m.orderStatus === 'Filled' && orders[m.orderId]) {
        delete orders[m.orderId]

        const { error } = await supabase.from('Client').update({ orders }).eq('id', id)
        if (error) throw new Error('Error saving submit order', { cause: error })

        return 'Ingnoring: a limit order has been filled'
      }
      // ###########################

      let clientQty = '0'
      let equity = null

      // ###########################
      if (!m.reduceOnly) {
        // starting positions or open limit orders
        const balance = await client.getWalletBalance({
          accountType: m.category === 'linear' ? 'CONTRACT' : 'SPOT',
          coin: 'USDT',
        })
        if (balance.retMsg !== 'OK') throw new Error('Error getting balance', { cause: balance })

        equity = balance.result.list[0].coin[0]?.walletBalance || 0
        clientQty = (equity * m.qty) / masterEquity
        //
        //
      } else {
        // making partial profit or closing position
        const positionInfo = await client.getPositionInfo({
          category: m.category,
          symbol: m.symbol,
        })
        if (positionInfo.retMsg !== 'OK')
          throw new Error('Error getting position size', { cause: positionInfo })

        const x = positionInfo.result.list[0].size
        clientQty = m.qty === masterPosition ? x : (x * m.qty) / masterPosition
      }
      // ###########################

      const params = {
        category: m.category,
        symbol: m.symbol,
        orderType: m.orderType,
        orderLinkId: orders[m.orderId] ? m.orderId : '',
        price: m.price,
        qty: (Math.round(clientQty / steps[m.symbol]) * steps[m.symbol]).toFixed(5),
        side: m.side,
        stopLoss: m.stopLoss,
        takeProfit: m.takeProfit,
        reduceOnly: m.reduceOnly,
      }

      if (m.orderStatus === 'New' && orders[m.orderId]) return client.amendOrder(params)

      if (m.orderStatus === 'New') orders[m.orderId] = true

      const reply = await client.submitOrder({
        ...params,
        orderLinkId: orders[m.orderId] ? m.orderId : '',
      })
      if (reply.retMsg !== 'OK') throw new Error('Error submiting order', { cause: reply })

      // saving just after the order has placed correctly
      const { error } = await supabase
        .from('Client')
        .update({ ...(equity && { equity }), orders })
        .eq('id', id)
      if (error) throw new Error('Error saving submit order', { cause: error })

      return reply
    }

    // ####################################################
    // ####################################################

    if (m.orderStatus === 'Cancelled') {
      if (!orders[m.orderId]) return 'Ignoring: unknow order'

      const reply = await client.cancelOrder({
        category: m.category,
        symbol: m.symbol,
        orderLinkId: m.orderId,
      })
      if (reply.retMsg !== 'OK') throw new Error('Error canceling order', { cause: reply })

      delete orders[m.orderId]
      const { error } = await supabase.from('Client').update({ orders }).eq('id', id)
      if (error) throw new Error('Error saving canceled order', { cause: error })

      return reply
    }

    // ####################################################
    // ####################################################

    if (
      m.orderStatus === 'Untriggered' || // setting stop/take from open position
      m.orderStatus === 'Deactivated' // removing stop/take
    ) {
      let stop = NaN
      let take = NaN
      // let trailing = NaN
      if (m.stopOrderType === 'StopLoss') stop = m.orderStatus === 'Deactivated' ? '0' : m.triggerPrice
      if (m.stopOrderType === 'TakeProfit') take = m.orderStatus === 'Deactivated' ? '0' : m.triggerPrice
      // if (m.stopOrderType === 'TrailingStop')
      // trailing = m.orderStatus === 'Deactivated' ? '0' : (m.lastPriceOnCreated - m.triggerPrice).toFixed(5)

      const params = {
        category: m.category,
        symbol: m.symbol,
        stopLoss: stop, // '0' = clear | NaN = to ignore
        takeProfit: take, // '0' = clear | NaN = to ignore
        // trailingStop: trailing, // '0' = clear | NaN = to ignore
        positionIdx: 0, // one-way mode
      }

      return client.setTradingStop(params)
      // ### for trailling stop, need to save in order[m.orderId]
    }
  }
}
export default workerOrder
