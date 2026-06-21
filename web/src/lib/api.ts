import { supabase } from '@/lib/supabase/client'

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '')

/**
 * 带身份的 fetch：自动把当前登录用户的 access token 放进 Authorization 头。
 * 未登录时不带该头（后端按匿名处理或返回 401，取决于路由）。
 */
export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {})
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json')
  }

  if (supabase) {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }

  const url = path.startsWith('http') ? path : `${API_URL}${path}`
  return fetch(url, { ...init, headers })
}
