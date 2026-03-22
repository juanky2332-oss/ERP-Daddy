// v3 - force recompile 1774213225837
import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname
  if (path.startsWith('/api/')) {
    return NextResponse.next()
  }
  return await updateSession(req)
}

export const config = {
  matcher: ['/((?!_next|favicon).*)'],
}
