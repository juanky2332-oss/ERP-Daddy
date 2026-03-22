// DIAGNOSTIC TEST - bypass all auth
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(req: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|favicon).*)'],
}
