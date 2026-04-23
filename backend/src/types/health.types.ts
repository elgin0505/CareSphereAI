export interface Patient {
  id: string;
  accountNumber?: string;
  password?: string;
  name: string;
  age: number;
  gender: 'male' | 'female';
  conditions: string[];
  medications: string[];
  caregiver: {
    name: string;
    phone: string;
    email: string;
    relationship: string;
  };
  location: {
    address: string;
    city: string;
    state: string;
    lat: number;
    lng: number;
  };
  createdAt: string;
}

export interface HealthReading {
  id: string;
  patientId: string;
  timestamp: string;
  heartRate: number;
  sleepHours: number;
  movementScore: number;
  bloodPressure: {
    systolic: number;
    diastolic: number;
  };
  oxygenSaturation: number;
  temperature: number;
  glucoseLevel?: number;
}

export type RiskLevel = 'low' | 'medium' | 'high';

export interface RiskAssessment {
  id: string;
  patientId: string;
  timestamp: string;
  riskLevel: RiskLevel;
  riskScore: number;
  reasons: string[];
  recommendations: string[];
  geminiReasoning: string;
  actions: AgentAction[];
  healthReading: HealthReading;
}

export interface AgentAction {
  type: 'caregiver_alert' | 'medical_summary' | 'hospital_finder';
  status: 'completed' | 'pending' | 'failed';
  executedAt: string;
  result: Record<string, unknown>;
}

export interface ConversationMessage {
  id: string;
  patientId: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
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

export interface AlertRecord {
  id: string;
  patientId: string;
  patientName: string;
  riskLevel: RiskLevel;
  timestamp: string;
  status: 'pending' | 'acknowledged' | 'resolved';
  message: string;
  actions: AgentAction[];
}
