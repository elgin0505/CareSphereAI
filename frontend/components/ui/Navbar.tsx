'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Bell, ChevronDown, User, Heart, X, Activity, MapPin, LogOut, Moon, Sun } from 'lucide-react';
import { api, Patient, RiskAssessment } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function Navbar() {
  const router = useRouter();
  const { lang, setLang } = useLanguage();
  const { logout } = useAuth();
  const { addToast } = useToast();
  const { toggleTheme, isDark } = useTheme();

  const [query, setQuery]               = useState('');
  const [results, setResults]           = useState<Patient[]>([]);
  const [allPatients, setAllPatients]   = useState<Patient[]>([]);
  const [searchOpen, setSearchOpen]     = useState(false);
  const [userOpen, setUserOpen]         = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const [bellOpen, setBellOpen]         = useState(false);
  const [recentAlerts, setRecentAlerts] = useState<RiskAssessment[]>([]);
  const [bellLoading, setBellLoading]   = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const userRef   = useRef<HTMLDivElement>(null);
  const bellRef   = useRef<HTMLDivElement>(null);

  // Load patients once for search
  useEffect(() => {
    api.getPatients()
      .then((pts) => { setAllPatients(pts); setProfileLoaded(true); })
      .catch(() => setProfileLoaded(true));
  }, []);

  // Fetch alerts when bell opens
  useEffect(() => {
    if (!bellOpen) return;
    setBellLoading(true);
    api.getAllAssessments()
      .then((assessments) => {
        const filtered = assessments
          .filter((a) => a.riskLevel === 'high' || a.riskLevel === 'medium')
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 5);
        setRecentAlerts(filtered);
      })
      .catch(() => setRecentAlerts([]))
      .finally(() => setBellLoading(false));
  }, [bellOpen]);

  // Filter patients client-side
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const q = query.toLowerCase();
    const found = allPatients
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.location.city.toLowerCase().includes(q) ||
          p.conditions.some((c) => c.toLowerCase().includes(q))
      )
      .slice(0, 8);
    setResults(found);
  }, [query, allPatients]);

  // Close dropdowns on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setQuery('');
        setResults([]);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false);
      }
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleSelectPatient = useCallback((patient: Patient) => {
    setSearchOpen(false);
    setQuery('');
    setResults([]);
    router.push(`/patients/${patient.id}`);
  }, [router]);

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 z-50 flex items-center px-4 gap-4 shadow-sm">

      {/* ── Brand ──────────────────────────────────────────────────── */}
      <Link href="/" className="flex items-center gap-2.5 shrink-0 min-w-[220px]">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-teal-500 flex items-center justify-center shadow-md">
          <Heart className="w-4.5 h-4.5 text-white animate-heartbeat" />
        </div>
        <div className="leading-tight">
          <p className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-none">CareSphere AI</p>
          <p className="text-teal-600 text-xs font-medium mt-0.5">Malaysia Elderly Health</p>
        </div>
      </Link>

      {/* ── Search Bar ─────────────────────────────────────────────── */}
      <div ref={searchRef} className="flex-1 max-w-xl relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search patients by name, city, or condition…"
            value={query}
            onFocus={() => setSearchOpen(true)}
            onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
            className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:bg-white dark:focus:bg-slate-600 transition-all"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {searchOpen && (results.length > 0 || query.length > 0) && (
          <div className="absolute top-full mt-1.5 left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-card-lg overflow-hidden z-50">
            {results.length === 0 && query.length > 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                No patients found for &quot;<span className="font-medium text-slate-600 dark:text-slate-300">{query}</span>&quot;
              </div>
            ) : (
              <>
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {results.length} patient{results.length !== 1 ? 's' : ''} found
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Click to view trends</p>
                </div>
                <ul className="max-h-72 overflow-y-auto">
                  {results.map((pt) => (
                    <li key={pt.id}>
                      <button
                        onClick={() => handleSelectPatient(pt)}
                        className="w-full px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 text-left transition-colors"
                      >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-teal-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {pt.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{pt.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />
                            {pt.location.city} · Age {pt.age}
                          </p>
                        </div>
                        <div className="shrink-0">
                          <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[120px]">
                            {pt.conditions[0]}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700">
                  <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
                    {allPatients.length.toLocaleString()} total patients in system
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Right Controls ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 ml-auto shrink-0">

        {/* Language Toggle */}
        <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 text-xs font-semibold">
          <button
            onClick={() => setLang('en')}
            className={`px-3 py-1.5 transition-colors ${lang === 'en' ? 'bg-brand-500 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            🇬🇧 EN
          </button>
          <button
            onClick={() => setLang('bm')}
            className={`px-3 py-1.5 transition-colors ${lang === 'bm' ? 'bg-brand-500 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            🇲🇾 BM
          </button>
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark
            ? <Sun className="w-4 h-4 text-amber-400" />
            : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* Notification Bell */}
        <div ref={bellRef} className="relative">
          <button
            onClick={() => setBellOpen((v) => !v)}
            className="relative w-9 h-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
          >
            <Bell className="w-4.5 h-4.5 text-slate-600 dark:text-slate-300" />
            {recentAlerts.some((a) => a.riskLevel === 'high') && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white dark:border-slate-800 animate-pulse" />
            )}
            {!bellOpen && recentAlerts.length === 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-2 border-white dark:border-slate-800" />
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden z-50 animate-slide-up">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Recent Alerts</p>
                {bellLoading && <span className="text-xs text-slate-400 dark:text-slate-500">Loading…</span>}
              </div>
              {recentAlerts.length === 0 && !bellLoading ? (
                <div className="px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">No recent alerts</div>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-700 max-h-72 overflow-y-auto">
                  {recentAlerts.map((alert) => (
                    <li key={alert.id} className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer" onClick={() => { setBellOpen(false); router.push(`/patients/${alert.patientId}`); }}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{allPatients.find((p) => p.id === alert.patientId)?.name ?? alert.patientId}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          alert.riskLevel === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}>{alert.riskLevel.toUpperCase()}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{alert.reasons[0]}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{new Date(alert.timestamp).toLocaleTimeString()}</p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700">
                <a href="/alerts" className="text-xs text-brand-600 hover:text-brand-700 font-medium">View all alerts →</a>
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => setUserOpen((v) => !v)}
            className="flex items-center gap-2 h-9 px-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-500 to-teal-500 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 hidden sm:block">Admin</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform ${userOpen ? 'rotate-180' : ''}`} />
          </button>

          {userOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-card-lg overflow-hidden z-50 animate-slide-up">
              <div className="p-3 border-b border-slate-100 dark:border-slate-700">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">CareSphere Admin</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">admin@caresphere.my</p>
              </div>
              <div className="p-1.5">
                <Link href="/onboard" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <Activity className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  Add New Patient
                </Link>
              </div>
              <div className="p-1.5 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {profileLoaded ? `${allPatients.length.toLocaleString()} patients` : 'Loading…'}
                  </span>
                  <span className="ml-auto text-xs text-teal-600 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-blink" />
                    Online
                  </span>
                </div>
              </div>
              <div className="p-1.5 border-t border-slate-100 dark:border-slate-700">
                <button
                  onClick={() => { logout(); addToast('Signed out successfully', 'info'); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Malaysia flag badge */}
        <span className="text-lg" title="Malaysia 🇲🇾">🇲🇾</span>
      </div>
    </header>
  );
}
