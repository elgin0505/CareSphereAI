'use client';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  if (isLoginPage) return <>{children}</>;
  return (
    <>
      <Navbar />
      <div className="flex min-h-screen pt-16">
        <Sidebar />
        <main className="flex-1 ml-64 min-h-[calc(100vh-4rem)] p-6 overflow-auto bg-slate-50 dark:bg-slate-900">
          {children}
        </main>
      </div>
    </>
  );
}
