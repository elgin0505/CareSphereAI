'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Heart, Activity, Wind, Moon, Zap, Thermometer,
  User, MapPin, Phone, Pill, ChevronLeft, Send,
  AlertTriangle, CheckCircle2, MessageCircle, RefreshCw,
  Stethoscope, FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import RiskBadge from '@/components/ui/RiskBadge';
import { api, Patient, HealthReading, RiskAssessment, CompanionResponse } from '@/lib/api';

/* ─── helpers ───────────────────────────────────────────────── */
function isAbnormalHR(hr: number) { return hr > 100 || hr < 55; }
function isAbnormalBP(systolic: number) { return systolic > 160; }
function isAbnormalO2(o2: number) { return o2 < 95; }
function isAbnormalSleep(h: number) { return h < 5; }
function isAbnormalTemp(t: number) { return t > 37.8; }

function VitalCard({
  icon: Icon, label, value, unit, alert,
}: {
  icon: React.ElementType; label: string; value: string; unit: string; alert?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 flex flex-col gap-1.5 border ${
        alert
          ? 'bg-red-50 border-red-200'
          : 'bg-slate-50 border-slate-200'
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${alert ? 'text-red-500' : 'text-brand-500'}`} />
        <span className={`text-xs font-medium ${alert ? 'text-red-600' : 'text-slate-500'}`}>{label}</span>
        {alert && <AlertTriangle className="w-3.5 h-3.5 text-red-400 ml-auto" />}
      </div>
      <p className={`text-2xl font-bold leading-none ${alert ? 'text-red-700' : 'text-slate-900'}`}>
        {value}
        <span className={`text-xs font-normal ml-1 ${alert ? 'text-red-500' : 'text-slate-400'}`}>{unit}</span>
      </p>
    </div>
  );
}

function Pill2({ children, color = 'teal' }: { children: React.ReactNode; color?: 'teal' | 'slate' | 'purple' }) {
  const colorMap = {
    teal:   'bg-brand-50 text-brand-700 border-brand-200',
    slate:  'bg-slate-100 text-slate-600 border-slate-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorMap[color]}`}>
      {children}
    </span>
  );
}

type SimulateResult = {
  scenario: string;
  assessment: RiskAssessment;
  anomalies: string[];
};

type SimScenario = 'normal' | 'warning' | 'critical';

/* ─── main page ─────────────────────────────────────────────── */
export default function PatientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [readings, setReadings] = useState<HealthReading[]>([]);
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chat
  const [chatInput, setChatInput] = useState('');
  const [chatResponse, setChatResponse] = useState<CompanionResponse | null>(null);
  const [chatLoading, setChatLoading] = useState(false);

  // Simulate
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<SimulateResult | null>(null);

  const chatInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.getPatient(id),
      api.getReadings(id, 20),
      api.getAssessments(id, 10),
    ])
      .then(([p, r, a]) => {
        setPatient(p);
        setReadings(r);
        setAssessments(a);
      })
      .catch((err) => {
        setError(err?.message || 'Failed to load patient data');
      })
      .finally(() => setLoading(false));
  }, [id]);

  /* ── Loading skeleton ──────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
        <p className="text-slate-500 text-sm font-medium">Loading patient profile…</p>
      </div>
    );
  }

  /* ── Error / Not found ─────────────────────────────────────── */
  if (error || !patient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-red-700 mb-1">Patient Not Found</h2>
          <p className="text-sm text-red-500 mb-4">{error || 'This patient record does not exist.'}</p>
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const latestReading = readings[0] ?? null;
  const latestAssessment = assessments[0] ?? null;
  const historyRows = readings.slice(0, 10);

  /* ── Chat handler ──────────────────────────────────────────── */
  async function handleChat() {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    setChatLoading(true);
    setChatResponse(null);
    try {
      const res = await api.chat(id, msg);
      setChatResponse(res);
      setChatInput('');
    } catch {
      setChatResponse({
        response: 'Sorry, the companion service is unavailable right now.',
        sentiment: 'neutral',
        followUpSuggestions: [],
        medicationReminders: [],
        flaggedForCaregiver: false,
      });
    } finally {
      setChatLoading(false);
    }
  }

  /* ── Simulate handler ──────────────────────────────────────── */
  async function handleSimulate(scenario: SimScenario) {
    setSimLoading(true);
    setSimResult(null);
    try {
      const res = await api.simulate(id, scenario);
      setSimResult(res as SimulateResult);
    } catch {
      // silent
    } finally {
      setSimLoading(false);
    }
  }

  /* ── Sentiment badge ───────────────────────────────────────── */
  function SentimentBadge({ sentiment }: { sentiment: string }) {
    const map: Record<string, string> = {
      positive: 'bg-green-50 text-green-700 border-green-200',
      negative: 'bg-red-50 text-red-700 border-red-200',
      neutral:  'bg-slate-100 text-slate-600 border-slate-200',
      concerned: 'bg-amber-50 text-amber-700 border-amber-200',
    };
    const cls = map[sentiment.toLowerCase()] || map.neutral;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wide ${cls}`}>
        {sentiment}
      </span>
    );
  }

  const simBg: Record<string, string> = {
    normal:   'bg-green-50 border-green-200 text-green-800',
    warning:  'bg-amber-50 border-amber-200 text-amber-800',
    critical: 'bg-red-50 border-red-200 text-red-800',
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">

      {/* ── PAGE HEADER ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600 transition-colors font-medium"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-center gap-3 flex-1 min-w-0 justify-center">
          <h1 className="text-2xl font-bold text-slate-900 truncate">{patient.name}</h1>
          {latestAssessment && (
            <RiskBadge level={latestAssessment.riskLevel} score={latestAssessment.riskScore} size="lg" />
          )}
        </div>

        <div className="w-16" /> {/* spacer to keep title centred */}
      </div>

      {/* ── TOP ROW: Profile + Vitals / Risk ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">

        {/* ── PROFILE CARD ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 space-y-5">
          {/* Avatar + name */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-teal-400 flex items-center justify-center text-white text-2xl font-bold shrink-0 shadow-sm">
              {patient.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{patient.name}</h2>
              <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                <User className="w-3.5 h-3.5" />
                {patient.age} yrs · {patient.gender}
              </p>
              <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-brand-400" />
                {patient.location.city}, {patient.location.state}
              </p>
            </div>
          </div>

          {/* Conditions */}
          {patient.conditions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5" /> Conditions
              </p>
              <div className="flex flex-wrap gap-1.5">
                {patient.conditions.map((c) => (
                  <Pill2 key={c} color="teal">{c}</Pill2>
                ))}
              </div>
            </div>
          )}

          {/* Medications */}
          {patient.medications.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5" /> Medications
              </p>
              <div className="flex flex-wrap gap-1.5">
                {patient.medications.map((m) => (
                  <Pill2 key={m} color="purple">{m}</Pill2>
                ))}
              </div>
            </div>
          )}

          {/* Caregiver */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Caregiver
            </p>
            <p className="text-sm font-semibold text-slate-800">{patient.caregiver.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{patient.caregiver.relationship}</p>
            <a
              href={`tel:${patient.caregiver.phone}`}
              className="mt-2 inline-flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
            >
              <Phone className="w-3.5 h-3.5" /> {patient.caregiver.phone}
            </a>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Vitals + Risk ──────────────────────────── */}
        <div className="space-y-5">

          {/* Latest Vitals (6-grid) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-500" /> Latest Vitals
              {latestReading && (
                <span className="ml-auto text-xs text-slate-400 font-normal">
                  {format(new Date(latestReading.timestamp), 'MMM d, yyyy HH:mm')}
                </span>
              )}
            </h3>
            {latestReading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <VitalCard
                  icon={Heart} label="Heart Rate"
                  value={`${latestReading.heartRate}`} unit="bpm"
                  alert={isAbnormalHR(latestReading.heartRate)}
                />
                <VitalCard
                  icon={Activity} label="Blood Pressure"
                  value={`${latestReading.bloodPressure.systolic}/${latestReading.bloodPressure.diastolic}`} unit="mmHg"
                  alert={isAbnormalBP(latestReading.bloodPressure.systolic)}
                />
                <VitalCard
                  icon={Wind} label="SpO₂"
                  value={`${latestReading.oxygenSaturation.toFixed(1)}`} unit="%"
                  alert={isAbnormalO2(latestReading.oxygenSaturation)}
                />
                <VitalCard
                  icon={Moon} label="Sleep"
                  value={`${latestReading.sleepHours.toFixed(1)}`} unit="hrs"
                  alert={isAbnormalSleep(latestReading.sleepHours)}
                />
                <VitalCard
                  icon={Zap} label="Movement"
                  value={`${latestReading.movementScore.toFixed(0)}`} unit="/100"
                  alert={false}
                />
                <VitalCard
                  icon={Thermometer} label="Temperature"
                  value={`${latestReading.temperature.toFixed(1)}`} unit="°C"
                  alert={isAbnormalTemp(latestReading.temperature)}
                />
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-xl">No readings available</div>
            )}
          </div>

          {/* Risk Assessment */}
          {latestAssessment && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-500" /> Latest Risk Assessment
                <span className="ml-auto text-xs text-slate-400 font-normal">
                  {format(new Date(latestAssessment.timestamp), 'MMM d, yyyy HH:mm')}
                </span>
              </h3>

              <div className="flex items-center gap-4 mb-4">
                <RiskBadge level={latestAssessment.riskLevel} score={latestAssessment.riskScore} size="lg" />
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Risk Score</span>
                    <span className="font-semibold text-slate-800">{latestAssessment.riskScore}/100</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        latestAssessment.riskLevel === 'high'
                          ? 'bg-red-500'
                          : latestAssessment.riskLevel === 'medium'
                          ? 'bg-amber-400'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${latestAssessment.riskScore}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {latestAssessment.reasons.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Reasons
                    </p>
                    <ul className="space-y-1">
                      {latestAssessment.reasons.map((r, i) => (
                        <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                          <span className="text-red-400 mt-0.5 shrink-0">•</span> {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {latestAssessment.recommendations.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Recommendations
                    </p>
                    <ul className="space-y-1">
                      {latestAssessment.recommendations.map((r, i) => (
                        <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                          <span className="text-green-500 mt-0.5 shrink-0">✓</span> {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {latestAssessment.geminiReasoning && (
                <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <p className="text-[10px] font-bold text-brand-600 uppercase tracking-wider mb-1.5">
                    Gemini AI Reasoning
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">{latestAssessment.geminiReasoning}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── VITALS HISTORY TABLE ────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Activity className="w-4 h-4 text-brand-500" />
          <h3 className="text-sm font-semibold text-slate-700">Vitals History</h3>
          <span className="ml-auto text-xs text-slate-400">Last {historyRows.length} readings</span>
        </div>
        {historyRows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Time', 'Heart Rate', 'Blood Pressure', 'SpO₂', 'Sleep', 'Movement', 'Temp'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historyRows.map((r, idx) => (
                  <tr
                    key={r.id}
                    className={`border-b border-slate-50 hover:bg-brand-50/30 transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                    }`}
                  >
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {format(new Date(r.timestamp), 'MMM d, HH:mm')}
                    </td>
                    <td className={`px-4 py-3 font-semibold ${isAbnormalHR(r.heartRate) ? 'text-red-600' : 'text-slate-800'}`}>
                      {r.heartRate} <span className="font-normal text-slate-400">bpm</span>
                    </td>
                    <td className={`px-4 py-3 font-semibold ${isAbnormalBP(r.bloodPressure.systolic) ? 'text-red-600' : 'text-slate-800'}`}>
                      {r.bloodPressure.systolic}/{r.bloodPressure.diastolic} <span className="font-normal text-slate-400">mmHg</span>
                    </td>
                    <td className={`px-4 py-3 font-semibold ${isAbnormalO2(r.oxygenSaturation) ? 'text-red-600' : 'text-slate-800'}`}>
                      {r.oxygenSaturation.toFixed(1)}<span className="font-normal text-slate-400">%</span>
                    </td>
                    <td className={`px-4 py-3 font-semibold ${isAbnormalSleep(r.sleepHours) ? 'text-red-600' : 'text-slate-800'}`}>
                      {r.sleepHours.toFixed(1)}<span className="font-normal text-slate-400">h</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {r.movementScore.toFixed(0)}<span className="font-normal text-slate-400">/100</span>
                    </td>
                    <td className={`px-4 py-3 font-semibold ${isAbnormalTemp(r.temperature) ? 'text-red-600' : 'text-slate-800'}`}>
                      {r.temperature.toFixed(1)}<span className="font-normal text-slate-400">°C</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 text-slate-400 text-sm">No readings available</div>
        )}
      </div>

      {/* ── QUICK CHAT ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-brand-500" /> Quick AI Companion Chat
          <span className="ml-auto text-xs text-slate-400 font-normal">Ask anything about {patient.name.split(' ')[0]}'s health</span>
        </h3>

        <div className="flex gap-2">
          <input
            ref={chatInputRef}
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleChat()}
            placeholder={`Message the AI companion for ${patient.name.split(' ')[0]}…`}
            className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
            disabled={chatLoading}
          />
          <button
            onClick={handleChat}
            disabled={chatLoading || !chatInput.trim()}
            className="px-4 py-2.5 bg-brand-500 text-white rounded-xl font-medium text-sm hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
          >
            {chatLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {chatLoading ? 'Sending…' : 'Send'}
          </button>
        </div>

        {chatLoading && (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <div className="w-4 h-4 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
            AI Companion is responding…
          </div>
        )}

        {chatResponse && !chatLoading && (
          <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-brand-500" />
              <span className="text-xs font-semibold text-brand-700">AI Companion</span>
              {/* SentimentBadge inline to avoid hoisting issues */}
              {(() => {
                const map: Record<string, string> = {
                  positive: 'bg-green-50 text-green-700 border-green-200',
                  negative: 'bg-red-50 text-red-700 border-red-200',
                  neutral:  'bg-slate-100 text-slate-600 border-slate-200',
                  concerned:'bg-amber-50 text-amber-700 border-amber-200',
                };
                const cls = map[chatResponse.sentiment?.toLowerCase()] ?? map.neutral;
                return (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wide ${cls}`}>
                    {chatResponse.sentiment}
                  </span>
                );
              })()}
              {chatResponse.flaggedForCaregiver && (
                <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                  <AlertTriangle className="w-3 h-3" /> Flagged for Caregiver
                </span>
              )}
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{chatResponse.response}</p>
            {chatResponse.medicationReminders.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Pill className="w-3 h-3" /> Medication Reminders
                </p>
                <ul className="space-y-0.5">
                  {chatResponse.medicationReminders.map((r, i) => (
                    <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                      <span className="text-amber-400 shrink-0">•</span> {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {chatResponse.followUpSuggestions.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-brand-600 uppercase tracking-wider mb-1">Suggested Follow-ups</p>
                <div className="flex flex-wrap gap-1.5">
                  {chatResponse.followUpSuggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => { setChatInput(s); chatInputRef.current?.focus(); }}
                      className="text-xs px-2.5 py-1 rounded-lg bg-white border border-brand-200 text-brand-700 hover:bg-brand-50 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── SIMULATE ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-brand-500" /> Scenario Simulator
        </h3>
        <p className="text-xs text-slate-400 mb-4">Trigger a health scenario to test AI agent response</p>

        <div className="flex gap-3 flex-wrap">
          {(['normal', 'warning', 'critical'] as SimScenario[]).map((scenario) => {
            const styles = {
              normal:   'bg-green-50 border-green-200 text-green-700 hover:bg-green-100',
              warning:  'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100',
              critical: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100',
            };
            const icons = {
              normal:   <CheckCircle2 className="w-4 h-4" />,
              warning:  <AlertTriangle className="w-4 h-4" />,
              critical: <AlertTriangle className="w-4 h-4" />,
            };
            return (
              <button
                key={scenario}
                onClick={() => handleSimulate(scenario)}
                disabled={simLoading}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${styles[scenario]}`}
              >
                {simLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : icons[scenario]}
                {scenario.charAt(0).toUpperCase() + scenario.slice(1)}
              </button>
            );
          })}
        </div>

        {simResult && (
          <div className={`mt-4 border rounded-xl p-4 ${simBg[simResult.scenario] ?? 'bg-slate-50 border-slate-200 text-slate-700'}`}>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-semibold capitalize">
                {simResult.scenario} scenario simulated
              </span>
              <RiskBadge level={simResult.assessment.riskLevel} score={simResult.assessment.riskScore} size="sm" />
            </div>
            {simResult.anomalies.length > 0 && (
              <ul className="text-xs space-y-0.5 mt-2">
                {simResult.anomalies.map((a, i) => (
                  <li key={i} className="flex items-start gap-1.5 opacity-80">
                    <span className="shrink-0 mt-0.5">•</span> {a}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
