import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const { email, role } = await req.json()
  if (!email || !role) return NextResponse.json({ error: 'Email and role required' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const siteUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `https://admin-zay.vercel.app`
    : 'http://localhost:3000'

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { role },
    redirectTo: `https://admin-zay.vercel.app/set-password`,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await supabase.from('users_profiles').upsert({
    id: data.user.id,
    full_name: email.split('@')[0],
    role,
    created_at: new Date().toISOString(),
  })

  return NextResponse.json({ success: true })
}