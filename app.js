import { WebsocketClient } from 'bybit-api'
// eslint-disable-next-line import/no-unresolved
import PQueue from 'p-queue'
import { propagate } from './propagate.js'
import supabase from './supabase.js'

const queue = new PQueue({ concurrency: 200 })

// ###################################################
// ###################################################
// just for debugging
// queue.on('add', () => {
//   // console.log(`Add - Size: ${queue.size}  Pending: ${queue.pending}`)
//   if (queue.size === 1 && queue.pending === 0) {
//     console.time('DONE')
//     console.log('LETSGO')
//   }
// })

// queue.on('idle', () => {
//   if (queue.pending === 0) console.timeEnd('DONE')
// })
// ###################################################
// ###################################################

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

// (v5) and/or subscribe to individual topics on demand
master.subscribeV5('wallet')
master.subscribeV5('position', 'linear')
master.subscribeV5('order', 'linear')
// master.subscribeV5('publicTrade.BTC', 'option');

// Listen to events coming from websockets. This is the primary data source
master.on('update', async msg => {
  if (msg.topic === 'wallet' && msg.data[0].coin[0].coin === 'USDT') {
    if (equity === msg.data[0].coin[0].equity) return
    equity = msg.data[0].coin[0].equity

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

  console.log('\n\n\n', msg)
  propagate(queue, msg, equity, positions[msg.data[0].symbol]?.size || '0')
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

/*

❯ tar --exclude="./node_modules" -czvf octopus.tgz octopusTrader


https://cloud.google.com/run/docs/quickstarts/build-and-deploy/deploy-nodejs-service

To make this the default region, run`gcloud config set run/region us-central1`.

This command is equivalent to running `gcloud builds submit --pack image=[IMAGE] /Volumes/stuff/replicator` and`gcloud run deploy replicator --image [IMAGE]`

## container URL
us-central1-docker.pkg.dev/hidden-proxy-283620/cloud-run-source-deploy/replicator@sha256:c4601cc97ff6107ac544a93ac29205d1f2d2914f2ad7ba78b21ae6e31bfd03f4
*/
