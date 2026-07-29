// supabase/functions/send-order-notification/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  try {
    const payload = await req.json()
    // Supabase webhook payload structure for inserts
    const newOrder = payload.record 

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Store <onboarding@resend.dev>',
        to: ['sannanabbasi34@gmail.com'], // Replace with your admin email
        subject: `New Order Received! #${newOrder.id}`,
        html: `
          <h1>New Order Placed</h1>
          <p><strong>Customer Email:</strong> ${newOrder.email}</p>
          <p><strong>Total Amount:</strong> $${newOrder.total_amount}</p>
          <p>Check your admin dashboard to view full fulfillment details.</p>
        `,
      }),
    })

    const data = await res.json()
    return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})