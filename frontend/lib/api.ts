export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const TIMEOUT_MS = 15000; // 15 s per attempt
const MAX_RETRIES = 2;

async function request<T>(path: string, options?: RequestInit, retries = MAX_RETRIES): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...options,
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'API error');
    return data.data as T;
  } catch (err: unknown) {
    const isRetryable =
      err instanceof TypeError || // network failure
      (err instanceof DOMException && err.name === 'AbortError'); // timeout
    if (retries > 0 && isRetryable && options?.method !== 'DELETE') {
      await new Promise((r) => setTimeout(r, (MAX_RETRIES - retries + 1) * 800));
      return request<T>(path, options, retries - 1);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  conditions: string[];
  medications: string[];
  caregiver: { name: string; phone: string; email: string; relationship: string };
  location: { address: string; city: string; state: string; lat?: number; lng?: number };
}

export interface HealthReading {
  id: string;
  patientId: string;
  timestamp: string;
  heartRate: number;
  sleepHours: number;
  movementScore: number;
  bloodPressure: { systolic: number; diastolic: number };
  oxygenSaturation: number;
  temperature: number;
  glucoseLevel?: number;
}

export interface RiskAssessment {
  id: string;
  patientId: string;
  timestamp: string;
  riskLevel: 'low' | 'medium' | 'high';
  riskScore: number;
  reasons: string[];
  recommendations: string[];
  geminiReasoning: string;
  healthReading: HealthReading;
}

export interface DashboardStats {
  totalPatients: number;       // all patients in system (e.g. 1000)
  monitoredPatients: number;   // patients with at least 1 assessment
  totalPages: number;
  currentPage: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  totalAssessments: number;
  alertsToday: number;
  autoSimEnabled: boolean;
  patientsWithReadings: Array<{
    patient: Patient;
    latestReading: HealthReading | null;
    latestAssessment: RiskAssessment | null;
    adherenceRate: number;
  }>;
}

export interface CompanionResponse {
  response: string;
  sentiment: string;
  followUpSuggestions: string[];
  medicationReminders: string[];
  flaggedForCaregiver: boolean;
  flagReason?: string;
}

export interface MedicationSchedule {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  times: string[];
  createdAt: string;
}

export interface MedicationLog {
  id: string;
  patientId: string;
  medicationId: string;
  medicationName: string;
  scheduledTime: string;
  date: string;
  taken: boolean;
  takenAt?: string;
  notes?: string;
}

export interface MedicationData {
  medications: MedicationSchedule[];
  todayLogs: MedicationLog[];
  adherence: { total: number; taken: number; rate: number };
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

export interface TrendData {
  patient: Patient;
  readings: HealthReading[];
  trend: { improving: boolean; deteriorating: boolean; stable: boolean };
  weeklyAvg: Partial<PatientBaseline>;
  baseline: PatientBaseline | null;
  recentAssessments: RiskAssessment[];
}

export interface Hospital {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  distance: string;
  type: string;
  emergencyAvailable: boolean;
}

export interface HospitalData {
  hospitals: Hospital[];
  recommendedHospital: string;
  estimatedTravelTime: string;
  emergencyContact: string;
  patientCity: string;
  patientState: string;
}

export interface WeeklyReport {
  patientName: string;
  reportDate: string;
  periodCovered: string;
  overallStatus: string;
  executiveSummary: string;
  vitalSignsSummary: {
    heartRate: string;
    bloodPressure: string;
    oxygenSaturation: string;
    temperature: string;
    sleepQuality: string;
    activityLevel: string;
  };
  riskTrend: string;
  keyFindings: string[];
  recommendations: string[];
  medicationAdherence: string;
  caregiverActions: string[];
  nextReviewDate: string;
}

export interface DeviceStatus {
  deviceId: string;
  patientId: string;
  deviceType: string;
  model: string;
  patient: Patient | undefined;
  lastSeen: string | null;
  readingCount: number;
  status: 'online' | 'idle' | 'never_connected';
}

export interface DeviceReadingResult {
  deviceId: string;
  deviceType: string;
  model: string;
  patientName: string;
  readingReceived: HealthReading;
  assessment: RiskAssessment;
  anomalies: string[];
  agentActionsTriggered: boolean;
  agentActions: unknown;
  processedAt: string;
}

export const api = {
  // Patients
  getPatients: () => request<Patient[]>('/api/health/patients'),
  getPatient: (id: string) => request<Patient>(`/api/health/patients/${id}`),
  getReadings: (patientId: string, limit = 10) =>
    request<HealthReading[]>(`/api/health/patients/${patientId}/readings?limit=${limit}`),
  getAssessments: (patientId: string, limit = 5) =>
    request<RiskAssessment[]>(`/api/health/patients/${patientId}/assessments?limit=${limit}`),
  getAllAssessments: () => request<RiskAssessment[]>('/api/health/assessments'),
  getDashboardStats: (page = 1, limit = 50) =>
    request<DashboardStats>(`/api/health/dashboard/stats?page=${page}&limit=${limit}`),

  // Simulate
  simulate: (patientId: string, scenario: 'normal' | 'warning' | 'critical') =>
    request<{ scenario: string; assessment: RiskAssessment; agentActions: unknown; anomalies: string[] }>(
      `/api/health/simulate/${patientId}`,
      { method: 'POST', body: JSON.stringify({ scenario }) }
    ),

  // Auto-simulate
  startAutoSim: () => request<{ status: string }>('/api/health/auto-simulate/start', { method: 'POST' }),
  stopAutoSim: () => request<{ status: string }>('/api/health/auto-simulate/stop', { method: 'POST' }),
  getAutoSimStatus: () => request<{ enabled: boolean }>('/api/health/auto-simulate/status'),

  // Trends
  getTrend: (patientId: string, hours = 24) =>
    request<TrendData>(`/api/health/patients/${patientId}/trend?hours=${hours}`),
  getBaseline: (patientId: string) =>
    request<PatientBaseline>(`/api/health/patients/${patientId}/baseline`),

  // Hospitals
  getHospitals: (patientId: string) =>
    request<HospitalData>(`/api/health/patients/${patientId}/hospitals`),

  // Medications
  getMedications: (patientId: string) =>
    request<MedicationData>(`/api/health/patients/${patientId}/medications`),
  addMedication: (patientId: string, data: { name: string; dosage: string; times: string[] }) =>
    request<MedicationSchedule>(`/api/health/patients/${patientId}/medications`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  logMedication: (patientId: string, data: { medicationId: string; medicationName: string; scheduledTime: string; date: string; taken: boolean }) =>
    request<MedicationLog>(`/api/health/patients/${patientId}/medications/log`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Weekly Report
  getWeeklyReport: (patientId: string) =>
    request<WeeklyReport>(`/api/health/patients/${patientId}/report/weekly`),

  // Devices
  getDevices: () => request<DeviceStatus[]>('/api/devices'),
  sendDeviceReading: (deviceId: string, reading: Partial<{
    heartRate: number; oxygenSaturation: number; temperature: number;
    bloodPressure: { systolic: number; diastolic: number };
    sleepHours: number; movementScore: number; glucoseLevel: number;
  }>) =>
    request<DeviceReadingResult>(`/api/devices/${deviceId}/reading`, {
      method: 'POST', body: JSON.stringify(reading),
    }),

  // Patients — create
  createPatient: (data: {
    name: string; age: number; gender: string;
    conditions: string[]; medications: string[];
    caregiver: { name: string; phone: string; email: string; relationship: string };
    location: { address: string; city: string; state: string };
  }) =>
    request<Patient>('/api/health/patients', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Demo alert
  triggerDemoAlert: () =>
    request<{ patient: { name: string; id: string }; assessment: RiskAssessment; message: string }>(
      '/api/health/demo-alert',
      { method: 'POST' }
    ),

  // Companion
  chat: (patientId: string, message: string, sessionType?: string, language?: 'en' | 'bm') =>
    request<CompanionResponse>('/api/companion/chat', {
      method: 'POST',
      body: JSON.stringify({ patientId, message, sessionType, language }),
    }),
  getChatHistory: (patientId: string) =>
    request<Array<{ id: string; role: string; content: string; timestamp: string }>>(
      `/api/companion/history/${patientId}`
    ),
  dailyCheckin: (patientId: string, language?: 'en' | 'bm') =>
    request<CompanionResponse>(`/api/companion/daily-checkin/${patientId}`, {
      method: 'POST',
      body: JSON.stringify({ language: language || 'en' }),
    }),
};
