'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Activity, RefreshCw, ChevronDown } from 'lucide-react';
import { api, TrendData, Patient } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export default function TrendsPage() {
  const { t } = useLanguage();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [hours, setHours] = useState(24);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getPatients().then((ps) => {
      setPatients(ps);
      if (ps.length > 0) setSelectedPatientId(ps[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedPatientId) return;
    setLoading(true);
    api.getTrend(selectedPatientId, hours)
      .then(setTrendData)
      .finally(() => setLoading(false));
  }, [selectedPatientId, hours]);

  const chartData = trendData?.readings.map((r) => ({
    time: new Date(r.timestamp).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }),
    HR: r.heartRate,
    Systolic: r.bloodPressure.systolic,
    Diastolic: r.bloodPressure.diastolic,
    O2: r.oxygenSaturation,
    Sleep: r.sleepHours,
    Movement: r.movementScore,
  })) || [];

  const trend = trendData?.trend;
  const TrendIcon = trend?.improving ? TrendingDown : trend?.deteriorating ? TrendingUp : Minus;
  const trendColor = trend?.improving ? 'text-green-700' : trend?.deteriorating ? 'text-red-600' : 'text-slate-500';
  const trendLabel = trend?.improving ? 'Improving' : trend?.deteriorating ? 'Deteriorating' : 'Stable';

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.trends}</h1>
          <p className="text-slate-500 mt-1 text-sm">Personalised health trend analysis with baseline anomaly detection</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Patient Selector */}
          <div className="relative">
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="appearance-none border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm text-slate-900 bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          {/* Time Range */}
          <div className="relative">
            <select
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="appearance-none border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm text-slate-900 bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            >
              <option value={12}>Last 12h</option>
              <option value={24}>Last 24h</option>
              <option value={72}>Last 3 days</option>
              <option value={168}>Last 7 days</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button onClick={() => setSelectedPatientId(selectedPatientId)}
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : trendData ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-card p-4">
              <p className="text-xs text-slate-500 mb-1">Overall Trend</p>
              <div className={`flex items-center gap-2 ${trendColor}`}>
                <TrendIcon className="w-5 h-5" />
                <span className="text-xl font-bold">{trendLabel}</span>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-card p-4">
              <p className="text-xs text-slate-500 mb-1">Avg Heart Rate</p>
              <p className="text-xl font-bold text-slate-900">{trendData.weeklyAvg.avgHeartRate?.toFixed(0)} <span className="text-sm text-slate-400">bpm</span></p>
              {trendData.baseline && (
                <p className="text-xs text-slate-400 mt-1">Baseline: {trendData.baseline.avgHeartRate.toFixed(0)}bpm</p>
              )}
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-card p-4">
              <p className="text-xs text-slate-500 mb-1">Avg BP Systolic</p>
              <p className="text-xl font-bold text-slate-900">{trendData.weeklyAvg.avgSystolic?.toFixed(0)} <span className="text-sm text-slate-400">mmHg</span></p>
              {trendData.baseline && (
                <p className="text-xs text-slate-400 mt-1">Baseline: {trendData.baseline.avgSystolic.toFixed(0)}mmHg</p>
              )}
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-card p-4">
              <p className="text-xs text-slate-500 mb-1">Avg O₂ Saturation</p>
              <p className="text-xl font-bold text-slate-900">{trendData.weeklyAvg.avgOxygenSaturation?.toFixed(1)} <span className="text-sm text-slate-400">%</span></p>
              {trendData.baseline && (
                <p className="text-xs text-slate-400 mt-1">Baseline: {trendData.baseline.avgOxygenSaturation.toFixed(1)}%</p>
              )}
            </div>
          </div>

          {/* Baseline Comparison */}
          {trendData.baseline && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
              <h3 className="text-sm font-semibold text-teal-600 mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Personalised Baseline — {trendData.patient.name}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: 'Heart Rate', current: trendData.weeklyAvg.avgHeartRate, base: trendData.baseline.avgHeartRate, unit: 'bpm' },
                  { label: 'Systolic BP', current: trendData.weeklyAvg.avgSystolic, base: trendData.baseline.avgSystolic, unit: 'mmHg' },
                  { label: 'O₂ Sat', current: trendData.weeklyAvg.avgOxygenSaturation, base: trendData.baseline.avgOxygenSaturation, unit: '%' },
                  { label: 'Sleep', current: trendData.weeklyAvg.avgSleepHours, base: trendData.baseline.avgSleepHours, unit: 'hrs' },
                  { label: 'Movement', current: trendData.weeklyAvg.avgMovementScore, base: trendData.baseline.avgMovementScore, unit: '/100' },
                ].map(({ label, current, base, unit }) => {
                  if (!current || !base) return null;
                  const diff = ((current - base) / base) * 100;
                  const isAnomaly = Math.abs(diff) > 15;
                  return (
                    <div key={label} className={`p-3 rounded-lg border text-center ${isAnomaly ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
                      <p className="text-xs text-slate-500 mb-1">{label}</p>
                      <p className="text-sm font-bold text-slate-900">{current.toFixed(1)}{unit}</p>
                      <p className="text-xs text-slate-400">Base: {base.toFixed(1)}</p>
                      <p className={`text-xs font-semibold mt-1 ${isAnomaly ? 'text-amber-700' : 'text-slate-400'}`}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Heart Rate & BP Chart */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Heart Rate & Blood Pressure Over Time</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="time" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', color: '#0F172A' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="HR" stroke="#0d9488" strokeWidth={2} dot={false} name="Heart Rate (bpm)" />
                  <Line type="monotone" dataKey="Systolic" stroke="#ef4444" strokeWidth={2} dot={false} name="Systolic BP (mmHg)" />
                  <Line type="monotone" dataKey="Diastolic" stroke="#f59e0b" strokeWidth={2} dot={false} name="Diastolic BP (mmHg)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* O2 & Sleep & Movement Chart */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Oxygen · Sleep · Movement Over Time</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="time" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', color: '#0F172A' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="O2" stroke="#3b82f6" strokeWidth={2} dot={false} name="O₂ Sat (%)" />
                  <Line type="monotone" dataKey="Sleep" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Sleep (hrs)" />
                  <Line type="monotone" dataKey="Movement" stroke="#06b6d4" strokeWidth={2} dot={false} name="Movement (/100)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Recent Assessments */}
          {trendData.recentAssessments.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Recent Risk Assessments</h3>
              <div className="space-y-2">
                {trendData.recentAssessments.slice(0, 5).map((a) => (
                  <div key={a.id} className={`p-3 rounded-lg border flex items-start gap-3 ${
                    a.riskLevel === 'high' ? 'border-red-200 bg-red-50' :
                    a.riskLevel === 'medium' ? 'border-amber-200 bg-amber-50' :
                    'border-slate-200 bg-slate-50'
                  }`}>
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      a.riskLevel === 'high' ? 'bg-red-500' : a.riskLevel === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold uppercase ${
                          a.riskLevel === 'high' ? 'text-red-700' : a.riskLevel === 'medium' ? 'text-amber-700' : 'text-green-700'
                        }`}>{a.riskLevel} risk</span>
                        <span className="text-xs text-slate-400">Score: {a.riskScore}/100</span>
                        <span className="text-xs text-slate-400 ml-auto">{new Date(a.timestamp).toLocaleTimeString('en-MY')}</span>
                      </div>
                      <p className="text-xs text-slate-600 truncate">{a.geminiReasoning}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 text-slate-400">{t.noData}</div>
      )}
    </div>
  );
}
