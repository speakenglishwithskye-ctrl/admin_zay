import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Allow set-password page always
  if (pathname === '/set-password') return supabaseResponse

  if (!user && (pathname.startsWith('/admin') || pathname.startsWith('/agent'))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && pathname === '/login') {
    const role = user.user_metadata?.role
    return NextResponse.redirect(new URL(role === 'admin' ? '/admin/dashboard' : '/agent/dashboard', request.url))
  }

  if (user) {
    const role = user.user_metadata?.role
    if (pathname.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL('/agent/dashboard', request.url))
    }
    if (pathname.startsWith('/agent') && role !== 'agent' && role !== 'admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
  }

  if (pathname === '/') {
    if (user) {
      const role = user.user_metadata?.role
      return NextResponse.redirect(new URL(role === 'admin' ? '/admin/dashboard' : '/agent/dashboard', request.url))
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/', '/login', '/set-password', '/admin/:path*', '/agent/:path*', '/receipt/:path*'],
}