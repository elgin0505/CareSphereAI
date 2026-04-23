/**
 * Emergency Action Flow — Autonomous Agentic AI
 * Directly executes tools when high/medium risk is detected.
 * No unreliable agent loop — tools fire deterministically, Gemini narrates the decision.
 */

import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { healthMemory } from '../rag/healthMemoryService';
import { sendCaregiverAlert } from '../tools/caregiverAlertTool';
import { findNearbyHospitals } from '../tools/hospitalFinderTool';
import { generateMedicalSummary } from '../tools/medicalSummaryTool';
import { callGemini } from '../lib/gemini';
import { RiskLevel } from '../types/health.types';

const ai = genkit({ plugins: [googleAI()] });

const EmergencyActionInputSchema = z.object({
  patientId: z.string(),
  riskLevel: z.enum(['low', 'medium', 'high']),
  riskScore: z.number(),
  reasons: z.array(z.string()),
  recommendations: z.array(z.string()),
});

const EmergencyActionOutputSchema = z.object({
  actionsExecuted: z.array(z.string()),
  caregiverAlerted: z.boolean(),
  medicalSummaryGenerated: z.boolean(),
  hospitalsFound: z.boolean(),
  agentDecisionLog: z.string(),
  toolResults: z.record(z.unknown()),
});

export const emergencyActionFlow = ai.defineFlow(
  {
    name: 'autonomousEmergencyAction',
    inputSchema: EmergencyActionInputSchema,
    outputSchema: EmergencyActionOutputSchema,
  },
  async (input) => {
    const patient = healthMemory.getPatient(input.patientId);
    if (!patient) {
      console.warn(`[emergencyActionFlow] Patient not found: ${input.patientId}`);
      return {
        actionsExecuted: [],
        caregiverAlerted: false,
        medicalSummaryGenerated: false,
        hospitalsFound: false,
        agentDecisionLog: `No patient found with ID: ${input.patientId}`,
        toolResults: {},
      };
    }

    const toolResults: Record<string, unknown> = {};
    const actionsExecuted: string[] = [];

    console.log(`[emergencyActionFlow] ▶ Autonomous agent activated — ${input.riskLevel.toUpperCase()} risk for ${patient.name}`);

    // ── TOOL 1: Alert caregiver (medium + high) ──────────────────────────────
    if (input.riskLevel === 'medium' || input.riskLevel === 'high') {
      try {
        const urgencyPrefix = input.riskLevel === 'high' ? '🚨 URGENT' : '⚠️ ATTENTION';
        const alertResult = await sendCaregiverAlert({
          patientId: input.patientId,
          riskLevel: input.riskLevel,
          riskReasons: input.reasons.slice(0, 4),
          urgencyMessage: `${urgencyPrefix}: CareSphere AI has detected ${input.riskLevel.toUpperCase()} health risk (score: ${input.riskScore}/100) for ${patient.name}. ${input.riskLevel === 'high' ? 'Immediate medical attention may be required.' : 'Please check in with patient soon.'}`,
        });
        toolResults['caregiverAlert'] = alertResult;
        actionsExecuted.push('Caregiver Alert Sent');
        console.log(`[emergencyActionFlow] ✓ Caregiver alert → ${patient.caregiver.name} (${patient.caregiver.phone})`);
      } catch (err) {
        console.error('[emergencyActionFlow] Caregiver alert failed:', String(err).substring(0, 100));
        toolResults['caregiverAlert'] = { success: false, error: String(err) };
      }
    }

    // ── TOOL 2: Medical summary (always) ─────────────────────────────────────
    try {
      const summaryResult = await generateMedicalSummary({
        patientId: input.patientId,
        summaryType: input.riskLevel === 'high' ? 'emergency' : 'daily',
        triggerReason: input.reasons.slice(0, 3).join('; '),
      });
      toolResults['medicalSummary'] = summaryResult;
      actionsExecuted.push('Medical Summary Generated');
      console.log(`[emergencyActionFlow] ✓ Medical summary generated for ${patient.name}`);
    } catch (err) {
      console.error('[emergencyActionFlow] Medical summary failed:', String(err).substring(0, 100));
      toolResults['medicalSummary'] = { success: false, error: String(err) };
    }

    // ── TOOL 3: Find nearby hospitals (high risk only) ───────────────────────
    if (input.riskLevel === 'high') {
      try {
        const hospitalResult = await findNearbyHospitals({
          patientId: input.patientId,
          urgency: 'high',
        });
        toolResults['hospitalFinder'] = hospitalResult;
        actionsExecuted.push('Nearby Hospitals Located');
        const rec = (hospitalResult as any).recommendedHospital || 'Hospital Kuala Lumpur';
        console.log(`[emergencyActionFlow] ✓ Recommended hospital: ${rec}`);
      } catch (err) {
        console.error('[emergencyActionFlow] Hospital finder failed:', String(err).substring(0, 100));
        toolResults['hospitalFinder'] = { success: false, error: String(err) };
      }
    }

    // ── Gemini: Generate clinical decision narrative ──────────────────────────
    const hospitalInfo = toolResults['hospitalFinder']
      ? `Nearest emergency facility: ${(toolResults['hospitalFinder'] as any).recommendedHospital || 'Hospital Kuala Lumpur'}.`
      : '';

    const decisionPrompt = `You are CareSphere AI, an autonomous healthcare agent for elderly monitoring in Malaysia.

You have just executed autonomous emergency actions for patient ${patient.name}, age ${patient.age}, with conditions: ${patient.conditions.join(', ')}.

RISK ALERT:
- Risk Level: ${input.riskLevel.toUpperCase()} (Score: ${input.riskScore}/100)
- Key Reasons: ${input.reasons.slice(0, 3).join('; ')}

ACTIONS COMPLETED: ${actionsExecuted.join(', ')}
${hospitalInfo}

Write a 2-3 sentence clinical summary of what was detected and what actions were taken. Be concise and professional, as if reporting to a doctor.`;

    let agentDecisionLog = `CareSphere AI autonomously executed ${actionsExecuted.length} action(s) for ${patient.name}: ${actionsExecuted.join(', ')}. Risk score: ${input.riskScore}/100 (${input.riskLevel.toUpperCase()}).`;

    try {
      const geminiLog = await callGemini(decisionPrompt, { temperature: 0.1, maxOutputTokens: 200 });
      if (geminiLog && geminiLog.length > 30) {
        agentDecisionLog = geminiLog;
        console.log(`[emergencyActionFlow] ✓ Gemini decision log generated`);
      }
    } catch (_) {
      // Keep fallback log — never crash
    }

    console.log(`[emergencyActionFlow] ■ Complete — ${actionsExecuted.length} actions executed`);

    return {
      actionsExecuted,
      caregiverAlerted: actionsExecuted.includes('Caregiver Alert Sent'),
      medicalSummaryGenerated: actionsExecuted.includes('Medical Summary Generated'),
      hospitalsFound: actionsExecuted.includes('Nearby Hospitals Located'),
      agentDecisionLog,
      toolResults,
    };
  }
);

export async function runEmergencyActions(
  patientId: string,
  riskLevel: RiskLevel,
  riskScore: number,
  reasons: string[],
  recommendations: string[]
) {
  return emergencyActionFlow({ patientId, riskLevel, riskScore, reasons, recommendations });
}
