// Authenticated API helper — sends Supabase JWT with every request
import { supabase } from './supabase'

export async function authFetch(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Not authenticated')
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
    ...options.headers,
  }

  const res = await fetch(url, { ...options, headers })
  return res
}
