'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { createClerkSupabaseClient } from '@/lib/supabase';
import { Card } from '@/components/ui';

export default function InboxView({ groupId, groupName, onClose }: { groupId: string, groupName: string, onClose: () => void }) {
  const { getToken } = useAuth();
  const [emails, setEmails] = useState<any[]>([]);

  useEffect(() => {
    const fetchEmails = async () => {
      const token = await getToken({ template: 'supabase' });
      if (!token) return;
      const supabase = createClerkSupabaseClient(token);
      const { data } = await supabase.from('email_group_assignments')
        .select('emails(*)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });
      
      // FIX: Explicitly typed 'd' as 'any'
      if (data) setEmails(data.map((d: any) => d.emails));
    };
    fetchEmails();
  }, [groupId, getToken]);

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex justify-between items-center pb-4 border-b">
        <h2 className="text-xl font-bold">{groupName}</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-800">Close</button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {emails.map(email => (
          <Card key={email.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-1">
              <div className="font-semibold text-sm">{email.sender_name || email.sender_email}</div>
              <div className="text-xs text-gray-400">{new Date(email.received_at).toLocaleDateString()}</div>
            </div>
            <div className="text-sm font-medium mb-1">{email.subject}</div>
            <div className="text-xs text-gray-500 line-clamp-2">{email.snippet}</div>
          </Card>
        ))}
        {emails.length === 0 && <p className="text-gray-500 text-sm">No emails in this group.</p>}
      </div>
    </div>
  );
}
