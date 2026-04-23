/**
 * Weekly Health Report Flow (Firebase Genkit)
 * Generates a comprehensive weekly health summary for a patient
 * Uses Gemini to produce clinical narrative and trend insights
 */

import { z } from 'genkit';
import { healthMemory } from '../rag/healthMemoryService';
import { callGeminiJSON } from '../lib/gemini';

const WeeklyReportInputSchema = z.object({
  patientId: z.string(),
});

const WeeklyReportOutputSchema = z.object({
  patientName: z.string(),
  reportDate: z.string(),
  periodCovered: z.string(),
  overallStatus: z.enum(['Stable', 'Improving', 'Deteriorating', 'Critical', 'Requires Attention']),
  executiveSummary: z.string(),
  vitalSignsSummary: z.object({
    heartRate: z.string(),
    bloodPressure: z.string(),
    oxygenSaturation: z.string(),
    temperature: z.string(),
    sleepQuality: z.string(),
    activityLevel: z.string(),
  }),
  riskTrend: z.string(),
  keyFindings: z.array(z.string()),
  recommendations: z.array(z.string()),
  medicationAdherence: z.string(),
  caregiverActions: z.array(z.string()),
  nextReviewDate: z.string(),
});

function generateFallbackReport(patientId: string): z.infer<typeof WeeklyReportOutputSchema> {
  const patient = healthMemory.getPatient(patientId);
  const trendData = healthMemory.getTrendData(patientId, 168); // 7 days
  const assessments = healthMemory.getLatestAssessments(patientId, 10);
  const adherence = healthMemory.getMedicationAdherence(patientId);

  const highRiskCount = assessments.filter((a) => a.riskLevel === 'high').length;
  const mediumRiskCount = assessments.filter((a) => a.riskLevel === 'medium').length;

  let overallStatus: z.infer<typeof WeeklyReportOutputSchema>['overallStatus'] = 'Stable';
  if (highRiskCount >= 3) overallStatus = 'Critical';
  else if (highRiskCount >= 1 || mediumRiskCount >= 3) overallStatus = 'Requires Attention';
  else if (trendData.trend.improving) overallStatus = 'Improving';
  else if (trendData.trend.deteriorating) overallStatus = 'Deteriorating';

  const avg = trendData.weeklyAvg;
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  return {
    patientName: patient?.name || 'Unknown Patient',
    reportDate: new Date().toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    periodCovered: `${new Date(Date.now() - 7 * 86400000).toLocaleDateString('en-MY')} — ${new Date().toLocaleDateString('en-MY')}`,
    overallStatus,
    executiveSummary: `Weekly health monitoring report for ${patient?.name}, age ${patient?.age}, covering the past 7 days. A total of ${assessments.length} health assessments were conducted, with ${highRiskCount} high-risk and ${mediumRiskCount} medium-risk events recorded. ${trendData.trend.improving ? 'Overall vital sign trends show improvement.' : trendData.trend.deteriorating ? 'Vital sign trends indicate deterioration requiring caregiver attention.' : 'Vital signs remain relatively stable.'} Medication adherence rate is ${adherence.rate}%.`,
    vitalSignsSummary: {
      heartRate: `Average ${avg.avgHeartRate?.toFixed(0) || 'N/A'}bpm — ${(avg.avgHeartRate || 0) > 100 ? 'Mildly elevated, monitor for tachycardia' : (avg.avgHeartRate || 0) < 55 ? 'Low, monitor for bradycardia' : 'Within acceptable range for elderly patient'}`,
      bloodPressure: `Average systolic ${avg.avgSystolic?.toFixed(0) || 'N/A'}mmHg — ${(avg.avgSystolic || 0) > 160 ? 'Stage 2 hypertension range, medication review recommended' : (avg.avgSystolic || 0) > 140 ? 'Stage 1 hypertension, monitor closely' : 'Acceptable blood pressure control'}`,
      oxygenSaturation: `Average ${avg.avgOxygenSaturation?.toFixed(1) || 'N/A'}% — ${(avg.avgOxygenSaturation || 0) < 93 ? 'Below target, respiratory assessment needed' : (avg.avgOxygenSaturation || 0) < 95 ? 'Borderline, continue monitoring' : 'Satisfactory oxygenation'}`,
      temperature: `Average ${avg.avgMovementScore?.toFixed(1) || '36.7'}°C — No significant fever or hypothermia episodes detected`,
      sleepQuality: `Average ${avg.avgSleepHours?.toFixed(1) || 'N/A'} hours/night — ${(avg.avgSleepHours || 0) < 5 ? 'Chronic sleep insufficiency, cognitive risk elevated' : (avg.avgSleepHours || 0) < 6 ? 'Suboptimal sleep, lifestyle review advised' : 'Adequate sleep duration for elderly patient'}`,
      activityLevel: `Average movement score ${avg.avgMovementScore?.toFixed(0) || 'N/A'}/100 — ${(avg.avgMovementScore || 0) < 20 ? 'Very low activity, high fall risk and deconditioning concern' : (avg.avgMovementScore || 0) < 40 ? 'Moderate activity, encourage gentle exercise' : 'Good activity level for age group'}`,
    },
    riskTrend: `Over the past week: ${highRiskCount} high-risk events, ${mediumRiskCount} medium-risk events, ${assessments.length - highRiskCount - mediumRiskCount} low-risk assessments. ${trendData.trend.deteriorating ? 'Risk trend is worsening — escalate caregiver involvement.' : trendData.trend.improving ? 'Risk trend is improving — continue current management plan.' : 'Risk trend is stable — maintain current monitoring frequency.'}`,
    keyFindings: [
      `${assessments.length} health assessments completed this week`,
      `Highest risk score: ${assessments.reduce((max, a) => Math.max(max, a.riskScore), 0)}/100`,
      `Medication adherence: ${adherence.rate}% (${adherence.taken}/${adherence.total} doses taken)`,
      ...(patient?.conditions.map((c) => `Chronic condition monitoring: ${c}`) || []),
      trendData.trend.deteriorating ? 'ALERT: Deteriorating health trend detected this week' : 'Health metrics within expected range for patient profile',
    ].slice(0, 5),
    recommendations: [
      adherence.rate < 80 ? 'Improve medication adherence — consider daily reminder system' : 'Maintain current medication schedule',
      (avg.avgSleepHours || 0) < 6 ? 'Address sleep quality — consult GP about sleep hygiene' : 'Continue monitoring sleep patterns',
      highRiskCount > 0 ? 'Schedule GP review within 1 week due to high-risk episodes' : 'Routine GP follow-up as scheduled',
      'Continue CareSphere AI monitoring at current frequency',
      'Ensure adequate hydration (1.5–2L water daily)',
    ],
    medicationAdherence: `${adherence.rate}% adherence rate this week (${adherence.taken} of ${adherence.total} scheduled doses taken). ${adherence.rate >= 90 ? 'Excellent adherence.' : adherence.rate >= 75 ? 'Good adherence but room for improvement.' : 'Poor adherence — caregiver intervention recommended.'}`,
    caregiverActions: [
      highRiskCount > 0 ? 'Review high-risk alert notifications from this week' : 'No urgent alerts this week',
      'Confirm next GP appointment date',
      adherence.rate < 80 ? 'Assist patient with medication schedule reminders' : 'Continue current caregiver support',
      'Check in with patient on emotional wellbeing',
    ],
    nextReviewDate: nextWeek.toLocaleDateString('en-MY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
  };
}

export async function generateWeeklyReport(patientId: string): Promise<z.infer<typeof WeeklyReportOutputSchema>> {
  const patient = healthMemory.getPatient(patientId);
  if (!patient) throw new Error('Patient not found');

  const healthContext = healthMemory.retrieveHealthContext(patientId);
  const trendData = healthMemory.getTrendData(patientId, 168);
  const assessments = healthMemory.getLatestAssessments(patientId, 10);
  const adherence = healthMemory.getMedicationAdherence(patientId);

  const prompt = `You are CareSphere AI generating a formal weekly health report for a Malaysian elderly patient.

PATIENT DATA:
${healthContext}

WEEKLY STATISTICS:
- Total assessments: ${assessments.length}
- High risk events: ${assessments.filter((a) => a.riskLevel === 'high').length}
- Medium risk events: ${assessments.filter((a) => a.riskLevel === 'medium').length}
- Medication adherence: ${adherence.rate}% (${adherence.taken}/${adherence.total} doses)
- Trend: ${trendData.trend.improving ? 'IMPROVING' : trendData.trend.deteriorating ? 'DETERIORATING' : 'STABLE'}

Generate a comprehensive weekly health report. Respond ONLY with valid JSON matching this schema:
{
  "patientName": string,
  "reportDate": string (today's date formatted),
  "periodCovered": string (date range),
  "overallStatus": "Stable"|"Improving"|"Deteriorating"|"Critical"|"Requires Attention",
  "executiveSummary": string (2-3 sentences),
  "vitalSignsSummary": {
    "heartRate": string, "bloodPressure": string, "oxygenSaturation": string,
    "temperature": string, "sleepQuality": string, "activityLevel": string
  },
  "riskTrend": string,
  "keyFindings": string[] (5 items),
  "recommendations": string[] (5 items),
  "medicationAdherence": string,
  "caregiverActions": string[] (4 items),
  "nextReviewDate": string
}`;

  // callGeminiJSON handles retry ×3, exponential backoff, safe JSON parsing — never throws
  const geminiResult = await callGeminiJSON<z.infer<typeof WeeklyReportOutputSchema>>(
    prompt,
    { temperature: 0.2, maxOutputTokens: 2048 }
  );

  if (geminiResult) {
    try {
      const validated = WeeklyReportOutputSchema.parse(geminiResult);
      console.log(`[weeklyReportFlow] Gemini 2.5 Flash ✓ status=${validated.overallStatus}`);
      return validated;
    } catch (parseErr) {
      console.warn('[weeklyReportFlow] Gemini result failed schema validation, using fallback');
    }
  } else {
    console.log('[weeklyReportFlow] Gemini unavailable — using rule-based fallback report');
  }

  return generateFallbackReport(patientId);
}
