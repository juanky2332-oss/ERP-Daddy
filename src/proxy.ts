import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export default async function proxy(req: NextRequest) {
  const res = NextResponse.next()
  res.headers.set('X-Proxy-Running', 'true')
  
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return res
  }
  return await updateSession(req)
}

export const config = {
  matcher: ['/((?!_next|favicon).*)'],
}