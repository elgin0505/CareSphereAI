/**
 * Health Risk Assessment Flow (Firebase Genkit)
 * Uses Gemini Pro for complex multi-step reasoning to assess patient risk
 * Input: health vitals → Output: risk level + clinical reasoning
 */

import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { HealthReading, RiskAssessment, RiskLevel } from '../types/health.types';
import { healthMemory } from '../rag/healthMemoryService';
import { callGeminiJSON } from '../lib/gemini';
import { v4 as uuidv4 } from 'uuid';

const ai = genkit({ plugins: [googleAI()] });

const RiskAssessmentInputSchema = z.object({
  patientId: z.string(),
  reading: z.object({
    heartRate: z.number(),
    sleepHours: z.number(),
    movementScore: z.number(),
    bloodPressure: z.object({ systolic: z.number(), diastolic: z.number() }),
    oxygenSaturation: z.number(),
    temperature: z.number(),
    glucoseLevel: z.number().optional(),
  }),
});

const RiskAssessmentOutputSchema = z.object({
  riskLevel: z.enum(['low', 'medium', 'high']),
  riskScore: z.number().min(0).max(100),
  reasons: z.array(z.string()),
  recommendations: z.array(z.string()),
  geminiReasoning: z.string(),
  requiresImmediateAction: z.boolean(),
});

export const riskAssessmentFlow = ai.defineFlow(
  {
    name: 'healthRiskAssessment',
    inputSchema: RiskAssessmentInputSchema,
    outputSchema: RiskAssessmentOutputSchema,
  },
  async (input) => {
    const patient = healthMemory.getPatient(input.patientId);
    const healthContext = healthMemory.retrieveHealthContext(input.patientId);
    const recentReadings = healthMemory.getLatestReadings(input.patientId, 3);

    const trendContext =
      recentReadings.length > 1
        ? `\nTREND ANALYSIS: Over last ${recentReadings.length} readings — HR trend: ${
            recentReadings[0].heartRate > recentReadings[recentReadings.length - 1].heartRate ? 'increasing' : 'decreasing'
          }, BP trend: ${
            recentReadings[0].bloodPressure.systolic > recentReadings[recentReadings.length - 1].bloodPressure.systolic
              ? 'worsening'
              : 'improving'
          }`
        : '';

    const prompt = `You are CareSphere AI, an expert geriatric health monitoring system for Malaysian elderly patients, aligned with Malaysian Ministry of Health (MOH) clinical practice guidelines.

MALAYSIAN CLINICAL REFERENCE STANDARDS (MOH Malaysia CPG):
- Hypertension target for elderly: <140/90 mmHg (MOH CPG Hypertension 2018)
- Diabetes glucose target (elderly): 6.5–8.0 mmol/L HbA1c (MOH CPG T2DM 2020)
- SpO₂ alert threshold: <95% requires monitoring, <90% is emergency (MOH CPG COPD)
- Fall risk: Major cause of elderly hospitalisation in Malaysia — movement score <30 triggers alert
- Malaysia elderly population: 54% have hypertension, 20% diabetes, 12% heart disease (NHMS 2019)
- Emergency: Call 999 or nearest KKM hospital A&E

PATIENT HEALTH CONTEXT (from RAG memory system):
${healthContext}
${trendContext}

CURRENT HEALTH READING TO ASSESS:
- Heart Rate: ${input.reading.heartRate} bpm
- Sleep Duration: ${input.reading.sleepHours} hours
- Movement Score: ${input.reading.movementScore}/100 (0=no movement, 100=very active)
- Blood Pressure: ${input.reading.bloodPressure.systolic}/${input.reading.bloodPressure.diastolic} mmHg
- Oxygen Saturation: ${input.reading.oxygenSaturation}%
- Body Temperature: ${input.reading.temperature}°C
${input.reading.glucoseLevel ? `- Blood Glucose: ${input.reading.glucoseLevel} mmol/L (Malaysian diabetes target for elderly: 6.5–8.0 mmol/L)` : ''}

TASK: Perform a comprehensive geriatric health risk assessment aligned with MOH Malaysia guidelines. Consider:
1. Abnormal vital signs vs MOH Malaysia CPG thresholds
2. Patient's chronic conditions and medication interactions
3. Fall risk assessment (major cause of elderly hospitalisation in Malaysia)
4. Cardiac risk (BP + HR + existing conditions)
5. Respiratory risk (O2 saturation per MOH COPD guidelines)
6. Metabolic risk (glucose per MOH Diabetes CPG)
7. Sleep deprivation effects on elderly cognition
8. Trend patterns from recent readings

Respond ONLY with a valid JSON object in this exact format:
{
  "riskLevel": "low|medium|high",
  "riskScore": <0-100>,
  "reasons": ["reason1", "reason2", ...],
  "recommendations": ["recommendation1", "recommendation2", ...],
  "geminiReasoning": "<2-3 sentence clinical reasoning>",
  "requiresImmediateAction": <true|false>
}

Risk scoring guide:
- low (0-39): All vitals near normal, stable trends
- medium (40-69): 1-2 abnormal vitals or worsening trend
- high (70-100): Multiple critical abnormalities, imminent health risk`;

    // Default to rule-based fallback; overwritten if Gemini succeeds
    let result: z.infer<typeof RiskAssessmentOutputSchema> = ruleBasedFallback(input.reading);

    // callGeminiJSON handles retry ×3, exponential backoff, safe JSON parsing — never throws
    const geminiResult = await callGeminiJSON<z.infer<typeof RiskAssessmentOutputSchema>>(
      prompt,
      { temperature: 0.1, maxOutputTokens: 1024 }
    );

    if (geminiResult) {
      try {
        result = RiskAssessmentOutputSchema.parse(geminiResult);
        console.log(`[riskAssessmentFlow] Gemini 2.5 Flash ✓ risk=${result.riskLevel} score=${result.riskScore}`);
      } catch (parseErr) {
        console.warn('[riskAssessmentFlow] Gemini result failed schema validation, using rule-based fallback');
      }
    } else {
      console.log('[riskAssessmentFlow] Gemini unavailable — using clinical rule-based fallback');
    }

    // Always store the reading and assessment regardless of AI or fallback path
    const fullReading: HealthReading = {
      id: uuidv4(),
      patientId: input.patientId,
      timestamp: new Date().toISOString(),
      ...input.reading,
      oxygenSaturation: input.reading.oxygenSaturation,
    };
    healthMemory.storeReading(fullReading);

    const assessment: RiskAssessment = {
      id: uuidv4(),
      patientId: input.patientId,
      timestamp: new Date().toISOString(),
      riskLevel: result.riskLevel as RiskLevel,
      riskScore: result.riskScore,
      reasons: result.reasons,
      recommendations: result.recommendations,
      geminiReasoning: result.geminiReasoning,
      actions: [],
      healthReading: fullReading,
    };
    healthMemory.storeAssessment(assessment);

    return result;
  }
);

function ruleBasedFallback(reading: z.infer<typeof RiskAssessmentInputSchema>['reading']): z.infer<typeof RiskAssessmentOutputSchema> {
  let score = 0;
  const reasons: string[] = [];
  const recommendations: string[] = [];
  const clinicalFindings: string[] = [];

  // Cardiac assessment
  if (reading.heartRate > 120) {
    score += 25; reasons.push(`Severe tachycardia: ${reading.heartRate}bpm (critical threshold >120)`);
    clinicalFindings.push(`tachycardia at ${reading.heartRate}bpm`);
  } else if (reading.heartRate > 100) {
    score += 15; reasons.push(`Tachycardia detected: ${reading.heartRate}bpm (normal elderly: 60-100bpm)`);
    clinicalFindings.push(`mild tachycardia at ${reading.heartRate}bpm`);
  } else if (reading.heartRate < 50) {
    score += 25; reasons.push(`Bradycardia: ${reading.heartRate}bpm — risk of syncope and falls`);
    clinicalFindings.push(`bradycardia at ${reading.heartRate}bpm`);
  }

  // Blood pressure (hypertensive crisis thresholds for elderly)
  if (reading.bloodPressure.systolic > 180) {
    score += 25; reasons.push(`Hypertensive crisis: ${reading.bloodPressure.systolic}/${reading.bloodPressure.diastolic}mmHg — immediate intervention required`);
    clinicalFindings.push(`hypertensive crisis`);
  } else if (reading.bloodPressure.systolic > 160) {
    score += 18; reasons.push(`Stage 2 hypertension: ${reading.bloodPressure.systolic}/${reading.bloodPressure.diastolic}mmHg — significantly elevated`);
    clinicalFindings.push(`stage 2 hypertension`);
  } else if (reading.bloodPressure.systolic > 140) {
    score += 8; reasons.push(`Stage 1 hypertension: ${reading.bloodPressure.systolic}/${reading.bloodPressure.diastolic}mmHg`);
  }

  // Respiratory / O2 saturation
  if (reading.oxygenSaturation < 90) {
    score += 35; reasons.push(`Critical hypoxaemia: O₂ saturation ${reading.oxygenSaturation.toFixed(1)}% — respiratory emergency`);
    clinicalFindings.push(`critical hypoxaemia (SpO₂ ${reading.oxygenSaturation.toFixed(1)}%)`);
  } else if (reading.oxygenSaturation < 93) {
    score += 22; reasons.push(`Significant hypoxaemia: O₂ saturation ${reading.oxygenSaturation.toFixed(1)}% (target ≥95% for elderly)`);
    clinicalFindings.push(`hypoxaemia (SpO₂ ${reading.oxygenSaturation.toFixed(1)}%)`);
  } else if (reading.oxygenSaturation < 95) {
    score += 12; reasons.push(`Low O₂ saturation: ${reading.oxygenSaturation.toFixed(1)}% — monitor closely`);
  }

  // Sleep deprivation (cognitive risk in elderly)
  if (reading.sleepHours < 3) {
    score += 18; reasons.push(`Severe sleep deprivation: ${reading.sleepHours.toFixed(1)}h — elevated delirium risk in elderly`);
    clinicalFindings.push(`severe sleep deprivation`);
  } else if (reading.sleepHours < 5) {
    score += 10; reasons.push(`Insufficient sleep: ${reading.sleepHours.toFixed(1)}h (recommended 7-8h) — cognitive impairment risk`);
  }

  // Movement / fall risk
  if (reading.movementScore < 15) {
    score += 18; reasons.push(`Critically low mobility: ${reading.movementScore.toFixed(0)}/100 — high fall risk, possible immobility`);
    clinicalFindings.push(`near-immobility (movement score ${reading.movementScore.toFixed(0)}/100)`);
  } else if (reading.movementScore < 30) {
    score += 10; reasons.push(`Very low activity: ${reading.movementScore.toFixed(0)}/100 — fall risk, deconditioning concern`);
  }

  // Temperature
  if (reading.temperature > 38.5) {
    score += 15; reasons.push(`Fever: ${reading.temperature.toFixed(1)}°C — possible infection or inflammatory response`);
    clinicalFindings.push(`fever (${reading.temperature.toFixed(1)}°C)`);
  } else if (reading.temperature < 35.5) {
    score += 20; reasons.push(`Hypothermia: ${reading.temperature.toFixed(1)}°C — critical in elderly`);
    clinicalFindings.push(`hypothermia (${reading.temperature.toFixed(1)}°C)`);
  }

  if (reasons.length === 0) reasons.push('All vital signs within acceptable range for elderly patient');

  // Clinical recommendations based on severity
  if (score >= 70) {
    recommendations.push('Activate emergency response — contact caregiver immediately');
    recommendations.push('Call 999 or transport to nearest Emergency Department');
    recommendations.push('Do not leave patient unattended');
    recommendations.push('Prepare list of current medications for emergency team');
  } else if (score >= 40) {
    recommendations.push('Urgent caregiver notification required within 30 minutes');
    recommendations.push('Schedule same-day GP or telehealth consultation');
    recommendations.push('Increase vital signs monitoring frequency to every 30 minutes');
    recommendations.push('Ensure patient is hydrated and comfortable');
  } else {
    recommendations.push('Continue standard monitoring schedule');
    recommendations.push('Encourage gentle physical activity appropriate to mobility level');
    recommendations.push('Ensure medication adherence and regular meals');
  }

  const riskLevel: RiskLevel = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
  const cappedScore = Math.min(100, score);

  // Generate clinical reasoning narrative
  let geminiReasoning: string;
  if (clinicalFindings.length >= 3) {
    geminiReasoning = `Multi-system deterioration detected: ${clinicalFindings.slice(0, 3).join(', ')}. The combination of cardiovascular compromise, impaired oxygenation, and reduced mobility represents a high-risk clinical profile in an elderly patient, warranting immediate intervention to prevent acute decompensation.`;
  } else if (clinicalFindings.length === 2) {
    geminiReasoning = `Concurrent findings of ${clinicalFindings.join(' and ')} indicate significant physiological stress. In elderly patients with likely comorbidities, these combined abnormalities substantially increase risk of acute cardiac or respiratory events. Close monitoring and caregiver alert are warranted.`;
  } else if (clinicalFindings.length === 1) {
    geminiReasoning = `Isolated finding of ${clinicalFindings[0]} requires monitoring in this elderly patient. While not immediately life-threatening, this deviation from baseline warrants caregiver notification and possible medical review, particularly given the vulnerability of the elderly population to rapid deterioration.`;
  } else {
    geminiReasoning = `All monitored vital parameters — heart rate (${reading.heartRate}bpm), blood pressure (${reading.bloodPressure.systolic}/${reading.bloodPressure.diastolic}mmHg), SpO₂ (${reading.oxygenSaturation.toFixed(1)}%), sleep (${reading.sleepHours.toFixed(1)}h), and mobility (${reading.movementScore.toFixed(0)}/100) — are within acceptable ranges for an elderly patient. Continue routine monitoring and encourage healthy lifestyle behaviours.`;
  }

  return {
    riskLevel,
    riskScore: cappedScore,
    reasons,
    recommendations,
    geminiReasoning,
    requiresImmediateAction: score >= 70,
  };
}

export async function runRiskAssessment(patientId: string, reading: Omit<HealthReading, 'id' | 'patientId' | 'timestamp'>) {
  return riskAssessmentFlow({ patientId, reading });
}
