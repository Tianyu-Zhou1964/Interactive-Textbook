import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// ✅ 添加调试日志 (仅在服务端打印，避免浏览器控制台泄露)
if (typeof window === 'undefined') {
  if (!supabaseUrl) console.error('❌ [Supabase] Missing NEXT_PUBLIC_SUPABASE_URL in .env.local')
  if (!supabaseAnonKey) console.error('❌ [Supabase] Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
  if (supabaseUrl && supabaseAnonKey) {
    console.log(`✅ [Supabase] Initializing client with URL: ${supabaseUrl}`)
  }
}

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null