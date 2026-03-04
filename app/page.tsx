import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui';

export default function Home() {
  const { userId } = auth();
  if (userId) redirect('/dashboard');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white">
      <h1 className="text-7xl font-extrabold mb-6 tracking-tight">Orb</h1>
      <p className="text-2xl mb-10 text-slate-400 max-w-2xl text-center">
        Connect your inbox. Let AI organize your emails into an interactive, beautiful bubble map.
      </p>
      <Link href="/sign-in">
        <Button className="text-lg px-8 py-6 bg-white text-black hover:bg-gray-200 rounded-full">
          Get Started for Free
        </Button>
      </Link>
    </div>
  );
}
