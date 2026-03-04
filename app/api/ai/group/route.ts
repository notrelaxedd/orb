import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

export const runtime = 'edge';

export async function POST(req: Request) {
  const { userId } = await req.json();
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const resend = new Resend(process.env.RESEND_API_KEY!);

  // Fetch unassigned emails
  const { data: unassigned } = await supabase.from('emails').select('*').eq('user_id', userId);
  const { data: assignments } = await supabase.from('email_group_assignments').select('email_id').eq('user_id', userId);
  const assignedIds = new Set(assignments?.map(a => a.email_id));
  const toGroup = unassigned?.filter(e => !assignedIds.has(e.id)) ||[];

  if (toGroup.length === 0) return Response.json({ success: true, message: 'No new emails' });

  // Fetch user overrides to teach Gemini
  const { data: overrides } = await supabase.from('user_overrides').select('sender_email, groups(name)').eq('user_id', userId);
  const overrideRules = overrides?.map(o => `${o.sender_email} -> ${o.groups?.name}`).join(', ') || 'None';

  const prompt = `
    You are an AI email organizer. Group these emails into 4-12 categories. 
    Rules:
    - Dynamic group names (max 3 words).
    - Merge similar senders.
    - Use "Other" ONLY as a last resort.
    - Consider these user overrides for routing: ${overrideRules}
    
    Return ONLY a valid JSON array of objects with exactly two keys: "email_id" and "group_name".
    
    Emails: ${JSON.stringify(toGroup.map(e => ({ email_id: e.id, sender: e.sender_name, email: e.sender_email, subject: e.subject })))}
  `;

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonStr = text.match(/\[.*\]/s)?.[0] || '[]';
  const grouped = JSON.parse(jsonStr);

  for (const item of grouped) {
    let { data: group } = await supabase.from('groups').select('id').eq('user_id', userId).eq('name', item.group_name).single();
    
    if (!group) {
      const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
      const { data: newGroup } = await supabase.from('groups').insert({ user_id: userId, name: item.group_name, color: randomColor }).select('id').single();
      group = newGroup;
    }
    
    if (group) {
      await supabase.from('email_group_assignments').insert({ email_id: item.email_id, group_id: group.id, user_id: userId });
    }
  }

  // Send Resend Notification
  const { data: user } = await supabase.from('users').select('email').eq('id', userId).single();
  if (user?.email) {
    await resend.emails.send({
      from: 'Orb Notifications <onboarding@resend.dev>',
      to: user.email,
      subject: 'Orb: Your inbox has been organized!',
      html: `<p>Orb just organized ${toGroup.length} new emails into your interactive bubbles. Log in to view them!</p>`
    });
  }

  return Response.json({ success: true, groupedCount: toGroup.length });
}
