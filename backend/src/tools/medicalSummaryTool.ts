/**
 * Medical Summary Tool
 * Genkit tool that generates structured medical summaries for caregivers/doctors
 */

import { z } from 'zod';
import { healthMemory } from '../rag/healthMemoryService';

export const medicalSummaryInputSchema = z.object({
  patientId: z.string().describe('The patient ID to generate summary for'),
  summaryType: z.enum(['emergency', 'daily', 'weekly']).describe('Type of medical summary to generate'),
  triggerReason: z.string().describe('The specific reason or event that triggered this summary'),
});

export const medicalSummaryOutputSchema = z.object({
  success: z.boolean(),
  summary: z.object({
    patientInfo: z.string(),
    currentVitals: z.string(),
    recentTrend: z.string(),
    criticalAlerts: z.array(z.string()),
    recommendations: z.array(z.string()),
    generatedAt: z.string(),
    summaryType: z.string(),
  }),
});

export type MedicalSummaryInput = z.infer<typeof medicalSummaryInputSchema>;
export type MedicalSummaryOutput = z.infer<typeof medicalSummaryOutputSchema>;

export async function generateMedicalSummary(input: MedicalSummaryInput): Promise<MedicalSummaryOutput> {
  const patient = healthMemory.getPatient(input.patientId);
  if (!patient) {
    return {
      success: false,
      summary: {
        patientInfo: 'Patient not found',
        currentVitals: 'N/A',
        recentTrend: 'N/A',
        criticalAlerts: [],
        recommendations: [],
        generatedAt: new Date().toISOString(),
        summaryType: input.summaryType,
      },
    };
  }

  const readings = healthMemory.getLatestReadings(input.patientId, 5);
  const assessments = healthMemory.getLatestAssessments(input.patientId, 3);
  const latest = readings[0];

  const criticalAlerts: string[] = [];
  const recommendations: string[] = [];

  if (latest) {
    if (latest.heartRate > 100) criticalAlerts.push(`Elevated heart rate: ${latest.heartRate}bpm (normal: 60-100)`);
    if (latest.heartRate < 50) criticalAlerts.push(`Low heart rate: ${latest.heartRate}bpm (dangerously low)`);
    if (latest.bloodPressure.systolic > 160) criticalAlerts.push(`High systolic BP: ${latest.bloodPressure.systolic}mmHg`);
    if (latest.oxygenSaturation < 93) criticalAlerts.push(`Low O2 saturation: ${latest.oxygenSaturation.toFixed(1)}% (critical <93%)`);
    if (latest.sleepHours < 5) criticalAlerts.push(`Insufficient sleep: ${latest.sleepHours.toFixed(1)}h (recommended: 7-9h)`);
    if (latest.movementScore < 25) criticalAlerts.push(`Very low movement: ${latest.movementScore.toFixed(0)}/100 — possible fall risk`);
  }

  if (assessments.some((a) => a.riskLevel === 'high')) {
    recommendations.push('Immediate caregiver check-in required');
    recommendations.push('Consider scheduling GP appointment within 24 hours');
  }
  recommendations.push('Ensure patient has taken all prescribed medications');
  recommendations.push('Monitor vitals every 4 hours today');
  if (patient.conditions.includes('Hypertension')) {
    recommendations.push('Restrict sodium intake and encourage fluid intake');
  }
  if (patient.conditions.includes('Type 2 Diabetes')) {
    recommendations.push('Check blood glucose levels before meals');
  }

  const recentRisks = assessments.map((a) => a.riskLevel);
  const trendText =
    recentRisks.length === 0
      ? 'Insufficient data'
      : recentRisks[0] === 'high'
      ? 'DETERIORATING — risk level increasing'
      : recentRisks[0] === 'medium'
      ? 'CONCERNING — moderate risk sustained'
      : 'STABLE — risk well managed';

  return {
    success: true,
    summary: {
      patientInfo: `${patient.name} | Age ${patient.age} | ${patient.gender} | Conditions: ${patient.conditions.join(', ')}`,
      currentVitals: latest
        ? `HR: ${latest.heartRate}bpm | BP: ${latest.bloodPressure.systolic}/${latest.bloodPressure.diastolic}mmHg | O2: ${latest.oxygenSaturation.toFixed(1)}% | Temp: ${latest.temperature.toFixed(1)}°C | Sleep: ${latest.sleepHours.toFixed(1)}h | Movement: ${latest.movementScore.toFixed(0)}/100`
        : 'No recent readings',
      recentTrend: trendText,
      criticalAlerts,
      recommendations,
      generatedAt: new Date().toISOString(),
      summaryType: input.summaryType,
    },
  };
}
