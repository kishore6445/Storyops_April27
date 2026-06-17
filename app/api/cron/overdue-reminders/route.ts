import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  // Validate Vercel Cron secret
  const authHeader = req.headers.get('Authorization')
  const cronSecret = "secret_cron"
  
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Call the Supabase Edge Function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const functionUrl = `${supabaseUrl}/functions/v1/send-overdue-task-reminders`
    
    // Fire and forget — don't wait for response
    fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cronSecret}`,
      },
      body: JSON.stringify({}),
    }).catch(err => console.error('Edge Function call failed:', err))

    // Return 200 immediately
    return NextResponse.json({ status: 'cron triggered' }, { status: 200 })
  } catch (error: any) {
    console.error('Cron error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}