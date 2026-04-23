'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, CheckCircle, Clock, Zap, FileText, MapPin, Phone, RefreshCw } from 'lucide-react';
import { api, RiskAssessment } from '@/lib/api';
import RiskBadge from '@/components/ui/RiskBadge';
import { format } from 'date-fns';

export default function AlertsPage() {
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const fetchAssessments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAllAssessments();
      setAssessments(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssessments();
    const iv = setInterval(fetchAssessments, 15000);
    return () => clearInterval(iv);
  }, [fetchAssessments]);

  const filtered = assessments.filter((a) => filter === 'all' || a.riskLevel === filter);
  const highCount = assessments.filter((a) => a.riskLevel === 'high').length;
  const mediumCount = assessments.filter((a) => a.riskLevel === 'medium').length;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Alert Center</h1>
          <p className="text-slate-500 text-sm mt-1">Autonomous AI agent actions & risk assessments</p>
        </div>
        <button onClick={fetchAssessments}
          className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Summary Banners */}
      {highCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <Zap className="w-5 h-5 text-red-600 animate-pulse" />
            </div>
            <div>
              <p className="font-bold text-red-700">{highCount} HIGH RISK Alert{highCount > 1 ? 's' : ''}</p>
              <p className="text-sm text-red-600/80">
                CareSphere AI has autonomously alerted caregivers and identified nearby hospitals.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'high', 'medium', 'low'] as const).map((f) => {
          const count = f === 'all' ? assessments.length :
            assessments.filter((a) => a.riskLevel === f).length;
          const activeColors = {
            all: 'bg-slate-700 text-white border-slate-700',
            high: 'bg-red-50 text-red-700 border-red-200',
            medium: 'bg-amber-50 text-amber-700 border-amber-200',
            low: 'bg-green-50 text-green-700 border-green-200',
          };
          return (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all capitalize ${
                filter === f ? activeColors[f] : 'text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}>
              {f} ({count})
            </button>
          );
        })}
      </div>

      {/* Alerts List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading alerts...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
          <p className="text-slate-500">No {filter !== 'all' ? filter + ' risk' : ''} alerts</p>
          <p className="text-slate-400 text-sm mt-1">Run a simulation from the dashboard to generate alerts</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((assessment) => (
            <AlertCard key={assessment.id} assessment={assessment} />
          ))}
        </div>
      )}
    </div>
  );
}

function AlertCard({ assessment }: { assessment: RiskAssessment }) {
  const [expanded, setExpanded] = useState(false);
  const isHigh = assessment.riskLevel === 'high';
  const isMedium = assessment.riskLevel === 'medium';

  return (
    <div className={`bg-white rounded-xl border shadow-card p-4 transition-all ${
      isHigh ? 'border-red-200' : isMedium ? 'border-amber-200' : 'border-slate-200'
    }`}>
      <div className="flex items-start justify-between gap-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start gap-3 flex-1">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            isHigh ? 'bg-red-50' : isMedium ? 'bg-amber-50' : 'bg-green-50'
          }`}>
            {isHigh ? <AlertTriangle className="w-4 h-4 text-red-600" /> :
             isMedium ? <Clock className="w-4 h-4 text-amber-600" /> :
             <CheckCircle className="w-4 h-4 text-green-600" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <p className="font-semibold text-slate-900 text-sm">Patient ID: {assessment.patientId.replace('patient-', 'P-')}</p>
              <RiskBadge level={assessment.riskLevel} score={assessment.riskScore} size="sm" />
              {isHigh && (
                <span className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Agent Actions Triggered
                </span>
              )}
            </div>
            <p className="text-slate-400 text-xs mt-1">
              {format(new Date(assessment.timestamp), 'dd MMM yyyy, HH:mm:ss')}
            </p>
            <p className="text-slate-600 text-sm mt-2 line-clamp-2">{assessment.geminiReasoning}</p>
          </div>
        </div>
        <span className="text-slate-400 text-sm shrink-0">{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4 border-t border-slate-100 pt-4 animate-slide-up">
          {/* Risk Reasons */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Risk Factors</p>
            <ul className="space-y-1">
              {assessment.reasons.map((r, i) => (
                <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span> {r}
                </li>
              ))}
            </ul>
          </div>

          {/* Recommendations */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">AI Recommendations</p>
            <ul className="space-y-1">
              {assessment.recommendations.map((r, i) => (
                <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" /> {r}
                </li>
              ))}
            </ul>
          </div>

          {/* Vitals at time of alert */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Vitals at Alert Time</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Heart Rate', value: `${assessment.healthReading.heartRate} bpm` },
                { label: 'Blood Pressure', value: `${assessment.healthReading.bloodPressure.systolic}/${assessment.healthReading.bloodPressure.diastolic}` },
                { label: 'O₂ Saturation', value: `${assessment.healthReading.oxygenSaturation.toFixed(1)}%` },
                { label: 'Sleep', value: `${assessment.healthReading.sleepHours.toFixed(1)} hrs` },
                { label: 'Movement', value: `${assessment.healthReading.movementScore.toFixed(0)}/100` },
                { label: 'Temperature', value: `${assessment.healthReading.temperature.toFixed(1)}°C` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-50 rounded-lg p-2 text-center border border-slate-100">
                  <p className="text-slate-900 text-sm font-semibold">{value}</p>
                  <p className="text-slate-500 text-xs">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Agent Actions (simulated for high/medium risk) */}
          {(assessment.riskLevel === 'high' || assessment.riskLevel === 'medium') && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Autonomous Agent Actions</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                  <Phone className="w-4 h-4" />
                  Caregiver alert sent via SMS & Email
                </div>
                <div className="flex items-center gap-2 text-sm text-brand-600 bg-brand-50 rounded-lg px-3 py-2">
                  <FileText className="w-4 h-4" />
                  Medical summary generated and stored
                </div>
                {assessment.riskLevel === 'high' && (
                  <div className="flex items-center gap-2 text-sm text-purple-700 bg-purple-50 rounded-lg px-3 py-2">
                    <MapPin className="w-4 h-4" />
                    Nearby hospitals identified and queued
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
