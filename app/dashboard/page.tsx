'use client';
import { useAuth, UserButton } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { createClerkSupabaseClient } from '@/lib/supabase';
import BubbleMap from '@/components/BubbleMap';
import InboxView from '@/components/InboxView';
import { Button } from '@/components/ui';

export default function Dashboard() {
  const { getToken } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }

    let channel: any;
    const loadData = async () => {
      const token = await getToken({ template: 'supabase' });
      if (!token) return;
      const supabase = createClerkSupabaseClient(token);

      const fetchGroups = async () => {
        const { data } = await supabase.from('groups').select('*, email_group_assignments(count)');
        // FIX: Explicitly typed 'g' as 'any'
        const formatted = data?.map((g: any) => ({
          ...g,
          r: Math.max(30, Math.min(150, (g.email_group_assignments[0]?.count || 0) * 8))
        })) ||[];
        setGroups(formatted);
      };

      await fetchGroups();

      channel = supabase.channel('realtime-orb')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'email_group_assignments' }, fetchGroups)
        .subscribe();
    };

    loadData();
    return () => { if (channel) channel.unsubscribe(); };
  }, [getToken]);

  const syncEmails = async () => {
    setLoading(true);
    try {
      await fetch('/api/emails/sync', { method: 'POST' });
    } finally {
      setLoading(false);
    }
  };

  const upgradePro = async () => {
    const res = await fetch('/api/stripe/checkout', { method: 'POST' });
    const { url } = await res.json();
    window.location.href = url;
  };

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="flex items-center justify-between p-4 bg-white shadow-sm z-10">
        <h1 className="text-2xl font-bold tracking-tight">Orb</h1>
        <div className="flex gap-4 items-center">
          <Button onClick={syncEmails} disabled={loading}>
            {loading ? 'Syncing & Grouping...' : 'Sync Emails'}
          </Button>
          <Button onClick={upgradePro} variant="outline" className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-none hover:opacity-90">
            Upgrade to Pro
          </Button>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>
      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative bg-slate-100">
          <BubbleMap groups={groups} onSelectGroup={setSelectedGroup} />
        </div>
        {selectedGroup && (
          <div className="w-[400px] border-l bg-white p-6 shadow-xl z-20">
            <InboxView groupId={selectedGroup.id} groupName={selectedGroup.name} onClose={() => setSelectedGroup(null)} />
          </div>
        )}
      </main>
    </div>
  );
}
