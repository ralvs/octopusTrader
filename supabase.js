import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://iegsmgmghkfyoejbxsxq.supabase.co'
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllZ3NtZ21naGtmeW9lamJ4c3hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODY2NzY5ODAsImV4cCI6MjAwMjI1Mjk4MH0.smEaLlbSMnDB4OADt0I8Jz3kaKaIvLbzRocXUcnxrFY'
// const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
})

// NEEDED BECAUSE OF POLICES
// const { error } = await supabase.auth.signInWithPassword({
//   email: 'octopus@trader.com',
//   password: 'asdfasdfasdf',
// })
// console.log('🚀 ~ logging error:', error)

export default supabase

/// ###### gambiarra pra limpar campo da tabela
// const { data, error } = await supabase.from('Client').update({ orders: {} }).eq('testnet', 'true')
// console.log('🚀 ~ data:', data)
// console.log('🚀 ~ error:', error)

//
//
//
//
//
// "AUTOMATED" SIGNUP USER

// const { data, error } = await supabase.auth.signUp({
//   email: 'qwer@gmail.com',
//   password: 'qwerqwer',
// })

// if (!error && data.user?.id) {
//   const { data: client, err } = await supabase
//     .from('Client')
//     .insert([{ name: 'asdfasdf', equity: 25, user_id: data.user.id, testnet: true }])
//     .select()

//   if (err) console.log('🚀 ~ err:', err)
//   else console.log('🚀 ~ client:', client)
// } else {
//   console.log('🚀 ~ data:', data)
//   console.log('🚀 ~ error:', error)
// }
