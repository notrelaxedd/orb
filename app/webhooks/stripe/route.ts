import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { clerkClient } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('Stripe-Signature') as string;
  
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (error: any) {
    return new Response(`Webhook Error: ${error.message}`, { status: 400 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    const userId = session.client_reference_id;
    
    await supabase.from('users').update({ stripe_customer_id: session.customer, plan: 'pro' }).eq('id', userId);
    await clerkClient.users.updateUserMetadata(userId, { publicMetadata: { stripe_customer_id: session.customer, plan: 'pro' } });
  } else if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as any;
    await supabase.from('users').update({ plan: 'free' }).eq('stripe_customer_id', subscription.customer);
  }

  return new Response(null, { status: 200 });
}
