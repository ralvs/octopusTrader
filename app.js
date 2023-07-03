import { WebsocketClient } from 'bybit-api'
import queuer from './queuer.js'
import supabase from './supabase.js'

const { data, error } = await supabase.from('Master').select()
if (error) throw new Error(error)

const { id, key, secret, testnet, positions } = data[0]
let { equity } = data[0]
// const positions = { BTCUSDT: { size: '0.5', tradeMode: 1, leverage: '10'} }

const master = new WebsocketClient({
  key,
  secret,
  testnet,
  market: 'v5',
})

master.subscribeV5(['wallet', 'position', 'order'])

master.on('update', async msg => {
  if (
    msg.topic === 'wallet' &&
    msg.data[0].accountType === 'CONTRACT' &&
    msg.data[0].coin[0].coin === 'USDT'
  ) {
    if (equity === msg.data[0].coin[0].walletBalance) return
    equity = msg.data[0].coin[0].walletBalance

    const { error } = await supabase.from('Master').update({ equity }).eq('id', id)
    if (error) console.log('🚀 ~ error updating master equity:', error)
    return
  }

  if (msg.topic === 'position') {
    const { symbol, tradeMode, leverage, size } = msg.data[0]

    if (positions[symbol]) positions[symbol].size = size

    if (
      positions[symbol] &&
      positions[symbol].tradeMode === tradeMode &&
      positions[symbol].leverage === leverage
    )
      return

    positions[symbol] = {
      tradeMode,
      leverage,
      size,
    }

    const { error } = await supabase.from('Master').update({ positions }).eq('id', id)
    if (error) console.log('🚀 ~ error updating master positions:', error)
  }

  // console.log('\n\n\n')
  console.dir(msg, { depth: null }) // Review: comment this
  queuer(msg, equity, positions[msg.data[0].symbol]?.size || '0')
})

// Optional: Listen to websocket connection open event (automatic after subscribing to one or more topics)
master.on('open', ({ wsKey }) => {
  console.log(`connection open for websocket with ID: ${wsKey}`)
})

// Optional: Listen to responses to websocket queries (e.g. the response after subscribing to a topic)
master.on('response', response => {
  console.log('response', response)
})

// Optional: Listen to connection close event. Unexpected connection closes are automatically reconnected.
master.on('close', () => {
  console.log('connection closed')
})

// Optional: Listen to raw error events. Recommended.
master.on('error', err => {
  console.error('error', err)
})
