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

/// ###### gambiarra pra limpar campo da tabela
// const { data, error } = await supabase.from('Client').update({ orders: {} }).eq('testnet', 'true')
// console.log('🚀 ~ data:', data)
// console.log('🚀 ~ error:', error)

export default supabase

// GELwINbHmzZZ6Msn
