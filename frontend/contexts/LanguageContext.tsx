'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'bm';

export interface Translations {
  // Nav
  dashboard: string;
  aiCompanion: string;
  alerts: string;
  trends: string;
  hospitals: string;
  medications: string;
  caregiver: string;
  weeklyReport: string;
  // Dashboard
  dashboardTitle: string;
  dashboardSubtitle: string;
  totalPatients: string;
  highRisk: string;
  mediumRisk: string;
  assessmentsToday: string;
  patientMonitoring: string;
  autoSimulate: string;
  autoSimRunning: string;
  refreshing: string;
  // Vitals
  heartRate: string;
  bloodPressure: string;
  oxygen: string;
  sleep: string;
  movement: string;
  temperature: string;
  // Risk
  low: string;
  medium: string;
  high: string;
  riskScore: string;
  // Actions
  normal: string;
  warning: string;
  critical: string;
  sosButton: string;
  sosConfirm: string;
  // Companion
  companionTitle: string;
  companionSubtitle: string;
  typeMessage: string;
  send: string;
  listenVoice: string;
  stopListening: string;
  // Medications
  medicationTracker: string;
  todayMedications: string;
  adherenceRate: string;
  markTaken: string;
  markMissed: string;
  // General
  loading: string;
  noData: string;
  generate: string;
  refresh: string;
  aiReasoning: string;
  agentActions: string;
  baselineAnomaly: string;
}

const en: Translations = {
  dashboard: 'Dashboard',
  aiCompanion: 'AI Companion',
  alerts: 'Alerts',
  trends: 'Trend Analysis',
  hospitals: 'Hospitals',
  medications: 'Medications',
  caregiver: 'Caregiver View',
  weeklyReport: 'Weekly Report',
  dashboardTitle: 'CareSphere AI Dashboard',
  dashboardSubtitle: 'Real-time elderly health monitoring · Powered by Gemini AI & Firebase Genkit',
  totalPatients: 'Total Patients',
  highRisk: 'High Risk',
  mediumRisk: 'Medium Risk',
  assessmentsToday: 'Assessments Today',
  patientMonitoring: 'Patient Monitoring',
  autoSimulate: 'Auto-Simulate',
  autoSimRunning: 'Auto-Sim Active',
  refreshing: 'Refreshing...',
  heartRate: 'Heart Rate',
  bloodPressure: 'BP',
  oxygen: 'O₂ Sat',
  sleep: 'Sleep',
  movement: 'Movement',
  temperature: 'Temp',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  riskScore: 'Risk Score',
  normal: 'Normal',
  warning: 'Warning',
  critical: 'Critical',
  sosButton: '🚨 SOS Emergency',
  sosConfirm: 'Trigger SOS emergency simulation for this patient?',
  companionTitle: 'AI Health Companion',
  companionSubtitle: 'Warm, personalised support for your loved ones',
  typeMessage: 'Type a message...',
  send: 'Send',
  listenVoice: '🔊 Listen',
  stopListening: '🔇 Stop',
  medicationTracker: 'Medication Tracker',
  todayMedications: "Today's Medications",
  adherenceRate: 'Adherence Rate',
  markTaken: 'Taken',
  markMissed: 'Missed',
  loading: 'Loading...',
  noData: 'No data available',
  generate: 'Generate',
  refresh: 'Refresh',
  aiReasoning: 'Gemini AI Reasoning',
  agentActions: 'Agent Actions',
  baselineAnomaly: 'Baseline Anomaly Detected',
};

const bm: Translations = {
  dashboard: 'Papan Pemuka',
  aiCompanion: 'Teman AI',
  alerts: 'Amaran',
  trends: 'Analisis Trend',
  hospitals: 'Hospital',
  medications: 'Ubatan',
  caregiver: 'Papan Penjaga',
  weeklyReport: 'Laporan Mingguan',
  dashboardTitle: 'Papan Pemuka CareSphere AI',
  dashboardSubtitle: 'Pemantauan kesihatan warga emas masa nyata · Dikuasakan oleh Gemini AI & Firebase Genkit',
  totalPatients: 'Jumlah Pesakit',
  highRisk: 'Risiko Tinggi',
  mediumRisk: 'Risiko Sederhana',
  assessmentsToday: 'Penilaian Hari Ini',
  patientMonitoring: 'Pemantauan Pesakit',
  autoSimulate: 'Auto-Simulasi',
  autoSimRunning: 'Auto-Sim Aktif',
  refreshing: 'Memuat semula...',
  heartRate: 'Kadar Nadi',
  bloodPressure: 'T. Darah',
  oxygen: 'O₂',
  sleep: 'Tidur',
  movement: 'Pergerakan',
  temperature: 'Suhu',
  low: 'Rendah',
  medium: 'Sederhana',
  high: 'Tinggi',
  riskScore: 'Skor Risiko',
  normal: 'Normal',
  warning: 'Amaran',
  critical: 'Kritikal',
  sosButton: '🚨 SOS Kecemasan',
  sosConfirm: 'Aktifkan simulasi kecemasan SOS untuk pesakit ini?',
  companionTitle: 'Teman Kesihatan AI',
  companionSubtitle: 'Sokongan mesra dan peribadi untuk orang tersayang anda',
  typeMessage: 'Taip mesej...',
  send: 'Hantar',
  listenVoice: '🔊 Dengar',
  stopListening: '🔇 Berhenti',
  medicationTracker: 'Penjejak Ubatan',
  todayMedications: 'Ubatan Hari Ini',
  adherenceRate: 'Kadar Pematuhan',
  markTaken: 'Sudah Ambil',
  markMissed: 'Tertinggal',
  loading: 'Memuatkan...',
  noData: 'Tiada data',
  generate: 'Jana',
  refresh: 'Muat Semula',
  aiReasoning: 'Analisis Gemini AI',
  agentActions: 'Tindakan Agen',
  baselineAnomaly: 'Anomali Asas Dikesan',
};

interface LanguageContextType {
  lang: Language;
  t: Translations;
  setLang: (l: Language) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  t: en,
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('en');

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('caresphere_lang') as Language | null;
      if (stored === 'en' || stored === 'bm') setLangState(stored);
    } catch (_) {}
  }, []);

  const setLang = (l: Language) => {
    setLangState(l);
    try { localStorage.setItem('caresphere_lang', l); } catch (_) {}
  };

  const t = lang === 'en' ? en : bm;
  return (
    <LanguageContext.Provider value={{ lang, t, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
