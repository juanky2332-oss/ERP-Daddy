import { type NextRequest, NextResponse } from 'next/server'
  import { updateSession } from '@/lib/supabase/proxy'

  export async function middleware(request: NextRequest) {
    // Las rutas /api/ no requieren autenticación
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.next()
    }
    return await updateSession(request)
  }

  export const config = {
    matcher: [
      '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gi
  f|webp|ico)$).*)',
    ],
  }
