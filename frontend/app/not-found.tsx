'use client';

import Link from 'next/link';
import { Heart, Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-teal-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Heart className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-6xl font-bold text-slate-200 mb-2">404</h1>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Page Not Found</h2>
        <p className="text-slate-500 text-sm mb-8">
          The patient record or page you're looking for doesn't exist or may have been removed.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-colors"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </Link>
          <Link
            href="/alerts"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-sm transition-colors"
          >
            <Search className="w-4 h-4" />
            View Alerts
          </Link>
        </div>
      </div>
    </div>
  );
}
