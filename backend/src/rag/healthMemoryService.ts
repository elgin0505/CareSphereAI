/**
 * RAG-based Health Memory Service
 * Stores patient health history and provides contextual retrieval
 * Architecture: In-memory store (Firestore-compatible interface for Cloud deployment)
 */

import { HealthReading, RiskAssessment, RiskLevel, ConversationMessage, Patient } from '../types/health.types';
import { generateMalaysianPatients } from './seedGenerator';
import { v4 as uuidv4 } from 'uuid';

interface HealthDocument {
  id: string;
  patientId: string;
  type: 'reading' | 'assessment' | 'conversation';
  content: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

export interface MedicationSchedule {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  times: string[]; // e.g. ['08:00', '14:00', '20:00']
  createdAt: string;
}

export interface MedicationLog {
  id: string;
  patientId: string;
  medicationId: string;
  medicationName: string;
  scheduledTime: string;
  date: string; // YYYY-MM-DD
  taken: boolean;
  takenAt?: string;
  notes?: string;
}

export interface PatientBaseline {
  patientId: string;
  avgHeartRate: number;
  avgSystolic: number;
  avgDiastolic: number;
  avgOxygenSaturation: number;
  avgTemperature: number;
  avgSleepHours: number;
  avgMovementScore: number;
  computedAt: string;
}

class HealthMemoryService {
  private documents: Map<string, HealthDocument[]> = new Map();
  private patients: Map<string, Patient> = new Map();
  private readings: Map<string, HealthReading[]> = new Map();
  private assessments: Map<string, RiskAssessment[]> = new Map();
  private conversations: Map<string, ConversationMessage[]> = new Map();
  private medications: Map<string, MedicationSchedule[]> = new Map();
  private medicationLogs: Map<string, MedicationLog[]> = new Map();
  private baselines: Map<string, PatientBaseline> = new Map();

  storePatient(patient: Patient): void {
    this.patients.set(patient.id, patient);
    if (!this.documents.has(patient.id)) {
      this.documents.set(patient.id, []);
    }
  }

  getPatient(patientId: string): Patient | undefined {
    return this.patients.get(patientId);
  }

  getPatientByAccountNumber(accountNumber: string): Patient | undefined {
    return Array.from(this.patients.values()).find(p => p.accountNumber === accountNumber || p.id === accountNumber);
  }

  getAllPatients(): Patient[] {
    return Array.from(this.patients.values());
  }

  storeReading(reading: HealthReading): void {
    const readings = this.readings.get(reading.patientId) || [];
    readings.unshift(reading);
    if (readings.length > 100) readings.pop();
    this.readings.set(reading.patientId, readings);

    const doc: HealthDocument = {
      id: reading.id,
      patientId: reading.patientId,
      type: 'reading',
      content: this.readingToText(reading),
      metadata: { ...reading },
      timestamp: reading.timestamp,
    };
    const docs = this.documents.get(reading.patientId) || [];
    docs.unshift(doc);
    this.documents.set(reading.patientId, docs);

    // Recompute baseline every 5 new readings
    if (readings.length % 5 === 0) this.computeBaseline(reading.patientId);
  }

  storeAssessment(assessment: RiskAssessment): void {
    const assessments = this.assessments.get(assessment.patientId) || [];
    assessments.unshift(assessment);
    if (assessments.length > 50) assessments.pop();
    this.assessments.set(assessment.patientId, assessments);
  }

  getLatestReadings(patientId: string, limit = 10): HealthReading[] {
    return (this.readings.get(patientId) || []).slice(0, limit);
  }

  getLatestAssessments(patientId: string, limit = 5): RiskAssessment[] {
    return (this.assessments.get(patientId) || []).slice(0, limit);
  }

  getAllAssessments(): RiskAssessment[] {
    const all: RiskAssessment[] = [];
    this.assessments.forEach((assessments) => all.push(...assessments));
    return all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  storeConversationMessage(message: ConversationMessage): void {
    const msgs = this.conversations.get(message.patientId) || [];
    msgs.push(message);
    if (msgs.length > 50) msgs.shift();
    this.conversations.set(message.patientId, msgs);
  }

  getConversationHistory(patientId: string, limit = 10): ConversationMessage[] {
    const msgs = this.conversations.get(patientId) || [];
    return msgs.slice(-limit);
  }

  // --- MEDICATIONS ---

  getMedications(patientId: string): MedicationSchedule[] {
    return this.medications.get(patientId) || [];
  }

  storeMedication(med: MedicationSchedule): void {
    const meds = this.medications.get(med.patientId) || [];
    const existing = meds.findIndex((m) => m.id === med.id);
    if (existing >= 0) meds[existing] = med;
    else meds.push(med);
    this.medications.set(med.patientId, meds);
  }

  getMedicationLogs(patientId: string, date?: string): MedicationLog[] {
    const logs = this.medicationLogs.get(patientId) || [];
    if (date) return logs.filter((l) => l.date === date);
    return logs;
  }

  storeMedicationLog(log: MedicationLog): void {
    const logs = this.medicationLogs.get(log.patientId) || [];
    const existing = logs.findIndex((l) => l.id === log.id);
    if (existing >= 0) logs[existing] = log;
    else logs.push(log);
    this.medicationLogs.set(log.patientId, logs);
  }

  getMedicationAdherence(patientId: string): { total: number; taken: number; rate: number } {
    const logs = this.medicationLogs.get(patientId) || [];
    const total = logs.length;
    const taken = logs.filter((l) => l.taken).length;
    return { total, taken, rate: total > 0 ? Math.round((taken / total) * 100) : 0 };
  }

  // --- BASELINE ANOMALY DETECTION ---

  computeBaseline(patientId: string): PatientBaseline | null {
    const readings = this.readings.get(patientId) || [];
    if (readings.length < 5) return null;

    const sample = readings.slice(0, Math.min(20, readings.length));
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

    const baseline: PatientBaseline = {
      patientId,
      avgHeartRate: avg(sample.map((r) => r.heartRate)),
      avgSystolic: avg(sample.map((r) => r.bloodPressure.systolic)),
      avgDiastolic: avg(sample.map((r) => r.bloodPressure.diastolic)),
      avgOxygenSaturation: avg(sample.map((r) => r.oxygenSaturation)),
      avgTemperature: avg(sample.map((r) => r.temperature)),
      avgSleepHours: avg(sample.map((r) => r.sleepHours)),
      avgMovementScore: avg(sample.map((r) => r.movementScore)),
      computedAt: new Date().toISOString(),
    };

    this.baselines.set(patientId, baseline);
    return baseline;
  }

  getBaseline(patientId: string): PatientBaseline | null {
    return this.baselines.get(patientId) || null;
  }

  detectAnomalies(patientId: string, reading: HealthReading): string[] {
    const baseline = this.baselines.get(patientId);
    if (!baseline) return [];

    const anomalies: string[] = [];
    const pct = (current: number, base: number) => Math.abs((current - base) / base) * 100;

    if (pct(reading.heartRate, baseline.avgHeartRate) > 20) {
      const dir = reading.heartRate > baseline.avgHeartRate ? 'above' : 'below';
      anomalies.push(`HR ${reading.heartRate}bpm is ${Math.round(pct(reading.heartRate, baseline.avgHeartRate))}% ${dir} this patient's baseline (${Math.round(baseline.avgHeartRate)}bpm)`);
    }
    if (pct(reading.bloodPressure.systolic, baseline.avgSystolic) > 15) {
      const dir = reading.bloodPressure.systolic > baseline.avgSystolic ? 'above' : 'below';
      anomalies.push(`Systolic BP ${reading.bloodPressure.systolic}mmHg is ${Math.round(pct(reading.bloodPressure.systolic, baseline.avgSystolic))}% ${dir} baseline (${Math.round(baseline.avgSystolic)}mmHg)`);
    }
    if (reading.oxygenSaturation < baseline.avgOxygenSaturation - 3) {
      anomalies.push(`O₂ saturation ${reading.oxygenSaturation.toFixed(1)}% is ${(baseline.avgOxygenSaturation - reading.oxygenSaturation).toFixed(1)}% below this patient's baseline (${baseline.avgOxygenSaturation.toFixed(1)}%)`);
    }
    if (pct(reading.sleepHours, baseline.avgSleepHours) > 40) {
      const dir = reading.sleepHours > baseline.avgSleepHours ? 'above' : 'below';
      anomalies.push(`Sleep ${reading.sleepHours.toFixed(1)}h is significantly ${dir} baseline (${baseline.avgSleepHours.toFixed(1)}h)`);
    }
    if (pct(reading.movementScore, baseline.avgMovementScore) > 50) {
      const dir = reading.movementScore > baseline.avgMovementScore ? 'above' : 'below';
      anomalies.push(`Movement score ${reading.movementScore.toFixed(0)}/100 is ${dir} typical level (${baseline.avgMovementScore.toFixed(0)}/100)`);
    }

    return anomalies;
  }

  // --- TREND ANALYSIS ---

  getTrendData(patientId: string, hours = 24): {
    readings: HealthReading[];
    trend: { improving: boolean; deteriorating: boolean; stable: boolean };
    weeklyAvg: Partial<PatientBaseline>;
  } {
    const all = this.readings.get(patientId) || [];
    const cutoff = Date.now() - hours * 3600000;
    const readings = all.filter((r) => new Date(r.timestamp).getTime() > cutoff).reverse();

    let trend = { improving: false, deteriorating: false, stable: true };
    if (readings.length >= 3) {
      const first3 = readings.slice(0, 3);
      const last3 = readings.slice(-3);
      const avgScore = (arr: HealthReading[]) => {
        const bpScore = arr.reduce((s, r) => s + r.bloodPressure.systolic, 0) / arr.length;
        const hrScore = arr.reduce((s, r) => s + r.heartRate, 0) / arr.length;
        const o2Score = arr.reduce((s, r) => s + r.oxygenSaturation, 0) / arr.length;
        return bpScore / 2 + hrScore / 2 - o2Score;
      };
      const delta = avgScore(last3) - avgScore(first3);
      if (delta > 10) trend = { improving: false, deteriorating: true, stable: false };
      else if (delta < -5) trend = { improving: true, deteriorating: false, stable: false };
    }

    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const weeklyAvg = {
      avgHeartRate: avg(readings.map((r) => r.heartRate)),
      avgSystolic: avg(readings.map((r) => r.bloodPressure.systolic)),
      avgOxygenSaturation: avg(readings.map((r) => r.oxygenSaturation)),
      avgSleepHours: avg(readings.map((r) => r.sleepHours)),
      avgMovementScore: avg(readings.map((r) => r.movementScore)),
    };

    return { readings, trend, weeklyAvg };
  }

  /**
   * RAG retrieval: Get relevant health context for a patient
   * Returns formatted context string for Gemini prompt grounding
   */
  retrieveHealthContext(patientId: string): string {
    const patient = this.patients.get(patientId);
    if (!patient) return 'No patient data found.';

    const recentReadings = this.getLatestReadings(patientId, 5);
    const recentAssessments = this.getLatestAssessments(patientId, 3);
    const baseline = this.baselines.get(patientId);

    const sections: string[] = [];

    sections.push(`PATIENT PROFILE:
Name: ${patient.name}, Age: ${patient.age}, Gender: ${patient.gender}
Chronic Conditions: ${patient.conditions.join(', ') || 'None'}
Current Medications: ${patient.medications.join(', ') || 'None'}
Caregiver: ${patient.caregiver.name} (${patient.caregiver.relationship}) - ${patient.caregiver.phone}`);

    if (baseline) {
      sections.push(`PATIENT PERSONAL BASELINE (computed from ${Math.min(20, this.readings.get(patientId)?.length || 0)} readings):
Avg HR: ${baseline.avgHeartRate.toFixed(1)}bpm | Avg BP: ${baseline.avgSystolic.toFixed(0)}/${baseline.avgDiastolic.toFixed(0)}mmHg
Avg O₂: ${baseline.avgOxygenSaturation.toFixed(1)}% | Avg Sleep: ${baseline.avgSleepHours.toFixed(1)}h | Avg Movement: ${baseline.avgMovementScore.toFixed(0)}/100`);
    }

    if (recentReadings.length > 0) {
      const readingTexts = recentReadings.map((r) => this.readingToText(r));
      sections.push(`RECENT HEALTH READINGS (last ${recentReadings.length}):\n${readingTexts.join('\n---\n')}`);
    }

    if (recentAssessments.length > 0) {
      const assessmentTexts = recentAssessments.map(
        (a) =>
          `[${a.timestamp}] Risk: ${a.riskLevel.toUpperCase()} (score: ${a.riskScore}/100)\nReasons: ${a.reasons.join('; ')}`
      );
      sections.push(`RECENT RISK ASSESSMENTS:\n${assessmentTexts.join('\n---\n')}`);
    }

    return sections.join('\n\n');
  }

  private readingToText(r: HealthReading): string {
    return `[${r.timestamp}] Heart Rate: ${r.heartRate}bpm, Sleep: ${r.sleepHours}h, Movement: ${r.movementScore}/100, BP: ${r.bloodPressure.systolic}/${r.bloodPressure.diastolic}mmHg, O2: ${r.oxygenSaturation}%, Temp: ${r.temperature}°C`;
  }
}

export const healthMemory = new HealthMemoryService();

/**
 * Lightweight rule-based risk scorer — used at seed time to create initial
 * assessments for every patient without calling Gemini.
 * Mirrors the clinical thresholds in riskAssessmentFlow.ts.
 */
function seedRiskAssessment(reading: HealthReading): RiskAssessment {
  let score = 0;
  const reasons: string[] = [];

  if (reading.oxygenSaturation < 90) { score += 35; reasons.push(`Critical hypoxaemia: SpO₂ ${reading.oxygenSaturation.toFixed(1)}%`); }
  else if (reading.oxygenSaturation < 93) { score += 22; reasons.push(`Low O₂ saturation: ${reading.oxygenSaturation.toFixed(1)}%`); }
  else if (reading.oxygenSaturation < 95) { score += 12; reasons.push(`Borderline O₂: ${reading.oxygenSaturation.toFixed(1)}% — monitor`); }

  if (reading.bloodPressure.systolic > 180) { score += 25; reasons.push(`Hypertensive crisis: ${reading.bloodPressure.systolic}/${reading.bloodPressure.diastolic}mmHg`); }
  else if (reading.bloodPressure.systolic > 160) { score += 18; reasons.push(`Stage 2 hypertension: ${reading.bloodPressure.systolic}mmHg`); }
  else if (reading.bloodPressure.systolic > 140) { score += 8;  reasons.push(`Elevated BP: ${reading.bloodPressure.systolic}/${reading.bloodPressure.diastolic}mmHg`); }

  if (reading.heartRate > 120) { score += 25; reasons.push(`Severe tachycardia: ${reading.heartRate}bpm`); }
  else if (reading.heartRate > 100) { score += 15; reasons.push(`Tachycardia: ${reading.heartRate}bpm`); }
  else if (reading.heartRate < 50) { score += 25; reasons.push(`Bradycardia: ${reading.heartRate}bpm — fall risk`); }

  if (reading.movementScore < 15) { score += 18; reasons.push(`Near-immobility: ${reading.movementScore.toFixed(0)}/100 — high fall risk`); }
  else if (reading.movementScore < 30) { score += 10; reasons.push(`Low mobility: ${reading.movementScore.toFixed(0)}/100`); }

  if (reading.sleepHours < 3) { score += 18; reasons.push(`Severe sleep deprivation: ${reading.sleepHours.toFixed(1)}h`); }
  else if (reading.sleepHours < 5) { score += 10; reasons.push(`Poor sleep: ${reading.sleepHours.toFixed(1)}h`); }

  if (reading.temperature > 38.5) { score += 15; reasons.push(`Fever: ${reading.temperature.toFixed(1)}°C`); }
  else if (reading.temperature < 35.5) { score += 20; reasons.push(`Hypothermia: ${reading.temperature.toFixed(1)}°C`); }

  if (reading.glucoseLevel !== undefined) {
    if (reading.glucoseLevel > 14) { score += 15; reasons.push(`Hyperglycaemia: ${reading.glucoseLevel.toFixed(1)} mmol/L`); }
    else if (reading.glucoseLevel < 4) { score += 20; reasons.push(`Hypoglycaemia: ${reading.glucoseLevel.toFixed(1)} mmol/L — urgent`); }
  }

  if (reasons.length === 0) reasons.push('All vital signs within acceptable range for elderly patient');

  const riskScore = Math.min(100, score);
  const riskLevel: RiskLevel = riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low';

  const recommendations =
    riskScore >= 70
      ? ['Activate emergency response — contact caregiver immediately', 'Call 999 or nearest Emergency Department']
      : riskScore >= 40
      ? ['Caregiver notification required', 'Schedule GP consultation within 1–2 days']
      : ['Continue standard monitoring schedule', 'Encourage gentle physical activity'];

  return {
    id: uuidv4(),
    patientId: reading.patientId,
    timestamp: reading.timestamp,
    riskLevel,
    riskScore,
    reasons,
    recommendations,
    geminiReasoning: `Seed assessment (rule-based): ${reasons[0]}. Risk score ${riskScore}/100 — ${riskLevel} risk.`,
    actions: [],
    healthReading: reading,
  };
}

export function seedDemoData(): void {
  const patients: Patient[] = [
    {
      id: 'patient-001',
      accountNumber: 'CS-001',
      password: 'password123',
      name: 'Ahmad bin Razali',
      age: 73,
      gender: 'male',
      conditions: ['Type 2 Diabetes', 'Hypertension', 'Mild Arthritis'],
      medications: ['Metformin 500mg', 'Amlodipine 5mg', 'Aspirin 100mg'],
      caregiver: {
        name: 'Siti binti Ahmad',
        phone: '+60123456789',
        email: 'siti.ahmad@email.com',
        relationship: 'Daughter',
      },
      location: {
        address: 'No. 12, Jalan Mawar',
        city: 'Johor Bahru',
        state: 'Johor',
        lat: 1.4927,
        lng: 103.7414,
      },
      createdAt: new Date().toISOString(),
    },
    {
      id: 'patient-002',
      accountNumber: 'CS-002',
      password: 'password123',
      name: 'Meenakshi a/p Krishnan',
      age: 68,
      gender: 'female',
      conditions: ['Heart Disease', 'Osteoporosis'],
      medications: ['Atorvastatin 40mg', 'Calcium + Vitamin D', 'Warfarin 5mg'],
      caregiver: {
        name: 'Rajan s/o Krishnan',
        phone: '+60198765432',
        email: 'rajan.krishnan@email.com',
        relationship: 'Son',
      },
      location: {
        address: 'No. 45, Taman Melati',
        city: 'Kuala Lumpur',
        state: 'Wilayah Persekutuan',
        lat: 3.1390,
        lng: 101.6869,
      },
      createdAt: new Date().toISOString(),
    },
    {
      id: 'patient-003',
      name: 'Lim Ah Kow',
      age: 80,
      gender: 'male',
      conditions: ['COPD', 'Atrial Fibrillation', 'Cognitive Decline'],
      medications: ['Salbutamol inhaler', 'Digoxin 0.25mg', 'Rivastigmine 6mg'],
      caregiver: {
        name: 'Lim Wei Ming',
        phone: '+60167891234',
        email: 'weiming.lim@email.com',
        relationship: 'Son',
      },
      location: {
        address: 'No. 8, Jalan Perdana',
        city: 'George Town',
        state: 'Pulau Pinang',
        lat: 5.4141,
        lng: 100.3288,
      },
      createdAt: new Date().toISOString(),
    },
    {
      id: 'patient-004',
      name: 'Dayang binti Musa',
      age: 65,
      gender: 'female',
      conditions: ['Type 2 Diabetes', 'Chronic Kidney Disease Stage 3', 'Mild Depression'],
      medications: ['Insulin Glargine 20 units', 'Amlodipine 5mg', 'Sertraline 50mg', 'Calcium Carbonate 500mg'],
      caregiver: {
        name: 'Azman bin Musa',
        phone: '+60198887766',
        email: 'azman.musa@email.com',
        relationship: 'Husband',
      },
      location: {
        address: 'Taman Sri Sarawak, Jalan Bako',
        city: 'Kuching',
        state: 'Sarawak',
        lat: 1.5497,
        lng: 110.3592,
      },
      createdAt: new Date().toISOString(),
    },
  ];

  patients.forEach((p) => healthMemory.storePatient(p));

  // Patient profiles for realistic seeding:
  // 0 = Ahmad (diabetic, hypertensive) — warning baseline
  // 1 = Meenakshi (heart disease) — moderate baseline
  // 2 = Lim Ah Kow (COPD, AF) — high risk baseline
  // 3 = Dayang (diabetic, CKD, depression) — stable but monitored
  const patientProfiles = [
    { baseHR: 82, baseSystolic: 158, baseDiastolic: 96, baseSleep: 5.0, baseMovement: 35, baseO2: 96, baseGlucose: 10.2 },
    { baseHR: 78, baseSystolic: 132, baseDiastolic: 84, baseSleep: 6.5, baseMovement: 45, baseO2: 96, baseGlucose: undefined },
    { baseHR: 98, baseSystolic: 128, baseDiastolic: 80, baseSleep: 5.5, baseMovement: 22, baseO2: 92, baseGlucose: undefined },
    { baseHR: 74, baseSystolic: 138, baseDiastolic: 88, baseSleep: 7.0, baseMovement: 50, baseO2: 97, baseGlucose: 9.1 },
  ];

  const now = Date.now();
  patients.forEach((patient, pIdx) => {
    const profile = patientProfiles[pIdx] || patientProfiles[0];
    for (let i = 9; i >= 0; i--) {
      const ts = new Date(now - i * 3600000).toISOString();
      const reading: HealthReading = {
        id: `reading-${patient.id}-${i}`,
        patientId: patient.id,
        timestamp: ts,
        heartRate: Math.round(profile.baseHR + (Math.random() * 16 - 8)),
        sleepHours: Math.round((profile.baseSleep + (Math.random() * 1.5 - 0.75)) * 10) / 10,
        movementScore: Math.round(profile.baseMovement + (Math.random() * 20 - 10)),
        bloodPressure: {
          systolic: Math.round(profile.baseSystolic + (Math.random() * 16 - 8)),
          diastolic: Math.round(profile.baseDiastolic + (Math.random() * 8 - 4)),
        },
        oxygenSaturation: Math.round((profile.baseO2 + (Math.random() * 2 - 1)) * 10) / 10,
        temperature: Math.round((36.5 + Math.random() * 0.7) * 10) / 10,
        glucoseLevel: profile.baseGlucose
          ? Math.round((profile.baseGlucose + (Math.random() * 3 - 1.5)) * 10) / 10
          : undefined,
      };
      healthMemory.storeReading(reading);
    }

    // Compute baseline after seeding
    healthMemory.computeBaseline(patient.id);

    // Seed one rule-based assessment so this patient appears on dashboard immediately
    const heroLatest = healthMemory.getLatestReadings(patient.id, 1)[0];
    if (heroLatest) healthMemory.storeAssessment(seedRiskAssessment(heroLatest));

    // Seed demo medication schedules
    const medNames = patient.medications.slice(0, 2);
    medNames.forEach((medName, mIdx) => {
      const medId = `med-${patient.id}-${mIdx}`;
      healthMemory.storeMedication({
        id: medId,
        patientId: patient.id,
        name: medName,
        dosage: '1 tablet',
        times: mIdx === 0 ? ['08:00', '20:00'] : ['12:00'],
        createdAt: new Date().toISOString(),
      });

      // Seed some logs for last 3 days
      for (let d = 2; d >= 0; d--) {
        const date = new Date(now - d * 86400000);
        const dateStr = date.toISOString().split('T')[0];
        const times = mIdx === 0 ? ['08:00', '20:00'] : ['12:00'];
        times.forEach((t, tIdx) => {
          const taken = Math.random() > 0.25; // 75% adherence
          healthMemory.storeMedicationLog({
            id: `log-${patient.id}-${mIdx}-${d}-${tIdx}`,
            patientId: patient.id,
            medicationId: medId,
            medicationName: medName,
            scheduledTime: t,
            date: dateStr,
            taken,
            takenAt: taken ? `${dateStr}T${t}:00.000Z` : undefined,
          });
        });
      }
    });
  });

  // ── Bulk-seed 996 generated patients (total = 1000) ───────────────────────
  const generated = generateMalaysianPatients(996, 5);
  generated.forEach(({ patient: gp, vitalProfile }, gIdx) => {
    healthMemory.storePatient(gp);

    // Seed 5 staggered readings per generated patient
    for (let i = 4; i >= 0; i--) {
      const ts = new Date(now - (i * 2 + gIdx % 3) * 3600000).toISOString();
      // Small per-reading jitter — deterministic-ish via index
      const jitter = (base: number, range: number) =>
        Math.round((base + ((gIdx * 7 + i * 3) % (range * 2 + 1)) - range) * 10) / 10;

      const reading: HealthReading = {
        id: `reading-${gp.id}-seed-${i}`,
        patientId: gp.id,
        timestamp: ts,
        heartRate: Math.round(jitter(vitalProfile.baseHR, 8)),
        sleepHours: Math.max(1, Math.min(12, jitter(vitalProfile.baseSleep, 1))),
        movementScore: Math.max(0, Math.min(100, Math.round(jitter(vitalProfile.baseMovement, 10)))),
        bloodPressure: {
          systolic: Math.round(jitter(vitalProfile.baseSystolic, 8)),
          diastolic: Math.round(jitter(vitalProfile.baseDiastolic, 5)),
        },
        oxygenSaturation: Math.max(85, Math.min(100, jitter(vitalProfile.baseO2, 1))),
        temperature: Math.max(35, Math.min(40, jitter(vitalProfile.baseTemp, 0.3))),
        glucoseLevel: vitalProfile.baseGlucose
          ? Math.max(3, Math.min(22, jitter(vitalProfile.baseGlucose, 1.5)))
          : undefined,
      };
      healthMemory.storeReading(reading);
    }

    healthMemory.computeBaseline(gp.id);

    // Seed one rule-based assessment so this patient appears on dashboard immediately
    const genLatest = healthMemory.getLatestReadings(gp.id, 1)[0];
    if (genLatest) healthMemory.storeAssessment(seedRiskAssessment(genLatest));

    // Seed one medication schedule for the first med (if any)
    if (gp.medications.length > 0) {
      healthMemory.storeMedication({
        id: `med-${gp.id}-0`,
        patientId: gp.id,
        name: gp.medications[0],
        dosage: '1 tablet',
        times: ['08:00', '20:00'],
        createdAt: new Date().toISOString(),
      });
    }
  });

  console.log(`[CareSphere AI] Seeded ${4 + generated.length} patients (4 hero + ${generated.length} generated)`);
}
