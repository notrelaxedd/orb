import { stripe } from '@/lib/stripe';
import { auth } from '@clerk/nextjs/server';

export async function POST() {
  const { userId } = auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items:[{ price: process.env.STRIPE_PRO_PRICE_ID, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    client_reference_id: userId,
  });

  return Response.json({ url: session.url });
}
