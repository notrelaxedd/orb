import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// FIX: Removed "export const runtime = 'edge';" to prevent Node.js module build failures

export async function POST(req: Request) {
  const { userId } = await req.json();
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const resend = new Resend(process.env.RESEND_API_KEY!);

  const { data: unassigned } = await supabase.from('emails').select('*').eq('user_id', userId);
  const { data: assignments } = await supabase.from('email_group_assignments').select('email_id').eq('user_id', userId);
  
  // FIX: Explicitly typed 'a' and 'e' as 'any'
  const assignedIds = new Set(assignments?.map((a: any) => a.email_id));
  const toGroup = unassigned?.filter((e: any) => !assignedIds.has(e.id)) ||[];

  if (toGroup.length === 0) return Response.json({ success: true, message: 'No new emails' });

  const { data: overrides } = await supabase.from('user_overrides').select('sender_email, groups(name)').eq('user_id', userId);
  
  // FIX: Explicitly typed 'o' as 'any'
  const overrideRules = overrides?.map((o: any) => `${o.sender_email} -> ${o.groups?.name}`).join(', ') || 'None';

  // FIX: Explicitly typed 'e' as 'any'
  const prompt = `
    You are an AI email organizer. Group these emails into 4-12 categories. 
    Rules:
    - Dynamic group names (max 3 words).
    - Merge similar senders.
    - Use "Other" ONLY as a last resort.
    - Consider these user overrides for routing: ${overrideRules}
    
    Return ONLY a valid JSON array of objects with exactly two keys: "email_id" and "group_name".
    
    Emails: ${JSON.stringify(toGroup.map((e: any) => ({ email_id: e.id, sender: e.sender_name, email: e.sender_email, subject: e.subject })))}
  `;

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonStr = text.match(/\[.*\]/s)?.[0] || '
