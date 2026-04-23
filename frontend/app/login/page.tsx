'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Eye, EyeOff, Lock, Mail, Zap, Activity, Brain, Stethoscope, Users, UserCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const ok = await login(identifier, password);
    if (ok) {
      router.push('/');
    } else {
      setError('Invalid account number or password. Please try again.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Left Panel — Branding ─────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-500 via-teal-500 to-teal-600 flex-col items-center justify-center p-12 text-white relative overflow-hidden">
        {/* Decorative rings */}
        <div className="absolute inset-0 opacity-10">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute rounded-full border border-white"
              style={{ width: `${(i + 1) * 120}px`, height: `${(i + 1) * 120}px`, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
          ))}
        </div>

        <div className="relative z-10 text-center w-full max-w-sm">
          {/* Logo */}
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Heart className="w-10 h-10 text-white animate-pulse" />
          </div>
          <h1 className="text-4xl font-bold mb-1">CareSphere AI</h1>
          <p className="text-white/80 text-base mb-8">Malaysia Elderly Health Monitoring</p>

          {/* Feature pills */}
          <div className="space-y-3 text-left bg-white/10 rounded-2xl p-5 backdrop-blur mb-8">
            {[
              { icon: Zap,      label: 'Gemini 2.5 Flash AI',     desc: 'Real-time risk assessment' },
              { icon: Activity, label: 'Vital Signs Monitoring',   desc: '1,000 patients tracked 24/7' },
              { icon: Brain,    label: 'Agentic AI',               desc: 'Autonomous caregiver alerts' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{label}</p>
                  <p className="text-white/70 text-xs">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Who uses this */}
          <div className="bg-white/10 rounded-2xl p-4 backdrop-blur text-left">
            <p className="text-white/60 text-xs font-bold uppercase tracking-wider mb-3">Who uses CareSphere AI?</p>
            <div className="space-y-2">
              {[
                { icon: Stethoscope, role: 'Healthcare Providers', desc: 'Doctors & nurses monitor patients remotely' },
                { icon: Users,       role: 'Family Caregivers',    desc: 'Get instant alerts when loved ones need help' },
                { icon: UserCheck,   role: 'Care Coordinators',    desc: 'Manage elderly welfare across facilities' },
              ].map(({ icon: Icon, role, desc }) => (
                <div key={role} className="flex items-start gap-2">
                  <Icon className="w-3.5 h-3.5 text-white/70 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-white/90">{role}</p>
                    <p className="text-[11px] text-white/60">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-white/50 text-xs mt-6">Project 2030 · MyAI Future Hackathon · Track 3: Vital Signs</p>
        </div>
      </div>

      {/* ── Right Panel — Form ────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-900">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-teal-500 flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-slate-100">CareSphere AI</p>
              <p className="text-xs text-teal-600">Malaysia Elderly Health</p>
            </div>
          </div>

          {/* Card */}
          <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-8 ${shake ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">Welcome back</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-7">Sign in to your CareSphere dashboard</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl px-4 py-3 text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
                  <span>⚠</span> {error}
                </div>
              )}

              {/* Account Number */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Account Number / Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    placeholder="e.g. CS-001 or admin@caresphere.my"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-700 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-700 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-brand-500 to-teal-500 text-white rounded-xl font-bold text-sm hover:from-brand-600 hover:to-teal-600 disabled:opacity-60 transition-all shadow-md mt-1 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </>
                ) : (
                  'Sign In to Dashboard'
                )}
              </button>
            </form>

            {/* Who this is for */}
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-700">
              <p className="text-center text-xs text-slate-400 dark:text-slate-500 mb-3 font-medium uppercase tracking-wider">Access for</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: Stethoscope, label: 'Doctors &\nNurses',    color: 'text-brand-500' },
                  { icon: Users,       label: 'Family\nCaregivers',   color: 'text-teal-500' },
                  { icon: UserCheck,   label: 'Care\nCoordinators',   color: 'text-purple-500' },
                ].map(({ icon: Icon, label, color }) => (
                  <div key={label} className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700">
                    <Icon className={`w-5 h-5 ${color}`} />
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center leading-tight whitespace-pre-line">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-5">
            Project 2030 · GDG UTM Hackathon · Track 3: Vital Signs
          </p>
        </div>
      </div>
    </div>
  );
}
