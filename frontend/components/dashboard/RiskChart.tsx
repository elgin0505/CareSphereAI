'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import type { RiskAssessment } from '@/lib/api';
import { format } from 'date-fns';
import { TrendingUp } from 'lucide-react';

interface RiskChartProps {
  assessments: RiskAssessment[];
  stats: { highRiskCount: number; mediumRiskCount: number; lowRiskCount: number };
}

export default function RiskChart({ assessments, stats }: RiskChartProps) {
  const timelineData = assessments
    .slice(0, 24)
    .reverse()
    .map((a) => ({
      time:  format(new Date(a.timestamp), 'HH:mm'),
      score: a.riskScore,
      level: a.riskLevel,
    }));

  const pieData = [
    { name: 'High Risk',   value: stats.highRiskCount,   color: '#DC2626' },
    { name: 'Medium Risk', value: stats.mediumRiskCount, color: '#D97706' },
    { name: 'Low Risk',    value: stats.lowRiskCount,    color: '#16A34A' },
  ].filter((d) => d.value > 0);

  const total = stats.highRiskCount + stats.mediumRiskCount + stats.lowRiskCount;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

      {/* ── Timeline Area Chart ────────────────────────────────── */}
      <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-brand-500" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Risk Score Timeline</h3>
              <p className="text-slate-400 text-xs">Last {timelineData.length} assessments</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-blink" />
            <span className="text-xs text-slate-400">Live</span>
          </div>
        </div>

        {timelineData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={timelineData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2563EB" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="time" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#64748B', fontWeight: 600 }}
                itemStyle={{ color: '#2563EB' }}
              />
              <Area type="monotone" dataKey="score" stroke="#2563EB" fill="url(#riskGrad)"
                strokeWidth={2} dot={{ fill: '#2563EB', r: 2.5, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex flex-col items-center justify-center gap-2 text-slate-400 bg-slate-50 rounded-lg">
            <TrendingUp className="w-8 h-8 text-slate-200" />
            <p className="text-sm">No data yet. Run a simulation.</p>
          </div>
        )}
      </div>

      {/* ── Pie Distribution ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
        <div className="mb-4">
          <h3 className="font-semibold text-slate-900 text-sm">Risk Distribution</h3>
          <p className="text-slate-400 text-xs mt-0.5">{total} assessments total</p>
        </div>

        {pieData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={72}
                  paddingAngle={3} dataKey="value" strokeWidth={0}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12 }}
                  itemStyle={{ color: '#475569' }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="space-y-2 mt-2">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-xs text-slate-600">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-900">{d.value}</span>
                    <span className="text-xs text-slate-400">
                      {total > 0 ? Math.round((d.value / total) * 100) : 0}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm bg-slate-50 rounded-lg">
            No assessment data
          </div>
        )}
      </div>
    </div>
  );
}
