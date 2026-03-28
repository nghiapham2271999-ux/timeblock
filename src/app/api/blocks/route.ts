import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const day = req.nextUrl.searchParams.get('day')
  if (!day) return NextResponse.json({ error: 'Missing day' }, { status: 400 })

  const { data, error } = await supabase
    .from('timeblock_days')
    .select('data')
    .eq('user_email', session.user.email)
    .eq('day_key', day)
    .single()

  if (error || !data) return NextResponse.json({ blocks: [] })
  return NextResponse.json(data.data)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json()
  const { day, blocks } = body
  if (!day || !blocks) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const { error } = await supabase
    .from('timeblock_days')
    .upsert(
      { user_email: session.user.email, day_key: day, data: { blocks } },
      { onConflict: 'user_email,day_key' }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
