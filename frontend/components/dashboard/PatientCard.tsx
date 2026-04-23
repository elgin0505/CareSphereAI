'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Activity, Heart, Moon, Zap, Thermometer, Wind, AlertOctagon, Pill, MapPin, User } from 'lucide-react';
import RiskBadge from '@/components/ui/RiskBadge';
import { useLanguage } from '@/contexts/LanguageContext';
import type { HealthReading, RiskAssessment, Patient } from '@/lib/api';

interface PatientCardProps {
  patient: Patient;
  latestReading: HealthReading | null;
  latestAssessment: RiskAssessment | null;
  adherenceRate?: number;
  onSimulate: (patientId: string, scenario: 'normal' | 'warning' | 'critical') => void;
  isLoading?: boolean;
}

export default function PatientCard({
  patient, latestReading, latestAssessment, adherenceRate, onSimulate, isLoading,
}: PatientCardProps) {
  const { t } = useLanguage();
  const [sosActive, setSosActive] = useState(false);
  const risk = latestAssessment?.riskLevel || 'low';

  const borderAccent = { high: 'border-l-red-500', medium: 'border-l-amber-400', low: 'border-l-green-500' }[risk];

  const handleSOS = () => {
    if (confirm(t.sosConfirm)) {
      setSosActive(true);
      onSimulate(patient.id, 'critical');
      setTimeout(() => setSosActive(false), 5000);
    }
  };

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-card border-l-4 ${borderAccent} transition-all duration-200 hover:shadow-card-md ${sosActive ? 'ring-2 ring-red-400' : ''}`}>

      {/* ── Card Header — click to open patient drilldown ───────── */}
      <Link href={`/patients/${patient.id}`} className="px-4 pt-4 pb-3 flex items-start justify-between border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors rounded-t-xl">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-teal-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
            {patient.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base leading-tight truncate">{patient.name}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-1"><User className="w-3 h-3" />{patient.age} yrs · {patient.gender}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{patient.location.city}</span>
            </p>
            {patient.conditions.length > 0 && (
              <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-0.5 truncate">
                {patient.conditions.slice(0, 2).join(' · ')}
                {patient.conditions.length > 2 && ` +${patient.conditions.length - 2}`}
              </p>
            )}
          </div>
        </div>
        {latestAssessment && (
          <RiskBadge level={latestAssessment.riskLevel} score={latestAssessment.riskScore} size="sm" />
        )}
      </Link>

      <div className="px-4 py-3 space-y-3">
        {/* ── Medication Adherence ─────────────────────────────── */}
        {adherenceRate !== undefined && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Pill className="w-3 h-3" /> {t.adherenceRate}
              </span>
              <span className={`text-xs font-semibold ${adherenceRate >= 80 ? 'text-green-600' : adherenceRate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                {adherenceRate}%
              </span>
            </div>
            <div className="h-1.5 bg-slate-100 dark:bg-slate-600 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${adherenceRate >= 80 ? 'bg-green-500' : adherenceRate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${adherenceRate}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Vitals Grid ──────────────────────────────────────── */}
        {latestReading ? (
          <div className="grid grid-cols-3 gap-1.5">
            <VitalItem icon={Heart}       label={t.heartRate}    value={`${latestReading.heartRate}`}                               unit="bpm"  alert={latestReading.heartRate > 100 || latestReading.heartRate < 50} />
            <VitalItem icon={Activity}    label={t.bloodPressure} value={`${latestReading.bloodPressure.systolic}/${latestReading.bloodPressure.diastolic}`} unit="mmHg" alert={latestReading.bloodPressure.systolic > 160} />
            <VitalItem icon={Wind}        label={t.oxygen}       value={`${latestReading.oxygenSaturation.toFixed(1)}`}             unit="%"    alert={latestReading.oxygenSaturation < 95} />
            <VitalItem icon={Moon}        label={t.sleep}        value={`${latestReading.sleepHours.toFixed(1)}`}                   unit="hrs"  alert={latestReading.sleepHours < 5} />
            <VitalItem icon={Zap}         label={t.movement}     value={`${latestReading.movementScore.toFixed(0)}`}                unit="/100" alert={latestReading.movementScore < 30} />
            <VitalItem icon={Thermometer} label={t.temperature}  value={`${latestReading.temperature.toFixed(1)}`}                  unit="°C"   alert={latestReading.temperature > 37.8} />
          </div>
        ) : (
          <div className="text-center py-4 text-slate-400 dark:text-slate-500 text-sm bg-slate-50 dark:bg-slate-700/50 rounded-lg">{t.noData}</div>
        )}

        {/* ── Gemini Reasoning ─────────────────────────────────── */}
        {latestAssessment?.geminiReasoning && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2.5 border border-blue-100 dark:border-blue-800/30">
            <p className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold uppercase tracking-wider mb-1">{t.aiReasoning}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">{latestAssessment.geminiReasoning}</p>
          </div>
        )}

        {/* ── View Profile Link ────────────────────────────────── */}
        <div className="text-right">
          <Link
            href={`/patients/${patient.id}`}
            className="text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors hover:underline"
          >
            View Profile →
          </Link>
        </div>

        {/* ── Simulate Buttons ─────────────────────────────────── */}
        <div className="flex gap-1.5">
          <button onClick={() => onSimulate(patient.id, 'normal')} disabled={isLoading}
            className="flex-1 py-1.5 text-xs rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/40 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors disabled:opacity-40 font-medium">
            {t.normal}
          </button>
          <button onClick={() => onSimulate(patient.id, 'warning')} disabled={isLoading}
            className="flex-1 py-1.5 text-xs rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors disabled:opacity-40 font-medium">
            {t.warning}
          </button>
          <button onClick={() => onSimulate(patient.id, 'critical')} disabled={isLoading}
            className="flex-1 py-1.5 text-xs rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/40 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-40 font-medium">
            {t.critical}
          </button>
        </div>

        {/* ── SOS Button ───────────────────────────────────────── */}
        <button
          onClick={handleSOS}
          disabled={isLoading}
          className={`w-full py-2 text-xs font-bold rounded-lg border flex items-center justify-center gap-2 transition-all ${
            sosActive
              ? 'bg-red-600 border-red-400 text-white animate-pulse'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'
          } disabled:opacity-40`}
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          {sosActive ? '⚡ SOS TRIGGERED — Agent Actions Executing…' : t.sosButton}
        </button>
      </div>
    </div>
  );
}

function VitalItem({ icon: Icon, label, value, unit, alert }: {
  icon: React.ElementType; label: string; value: string; unit: string; alert?: boolean;
}) {
  return (
    <div className={`p-2 rounded-lg text-center ${alert ? 'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30' : 'bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600'}`}>
      <Icon className={`w-3.5 h-3.5 mx-auto mb-0.5 ${alert ? 'text-red-500' : 'text-slate-400 dark:text-slate-500'}`} />
      <p className={`text-sm font-bold leading-tight ${alert ? 'text-red-600' : 'text-slate-800 dark:text-slate-100'}`}>
        {value}<span className="text-[10px] font-normal ml-0.5 opacity-70">{unit}</span>
      </p>
      <p className="text-slate-400 dark:text-slate-500 text-[10px] mt-0.5 leading-none">{label}</p>
    </div>
  );
}
