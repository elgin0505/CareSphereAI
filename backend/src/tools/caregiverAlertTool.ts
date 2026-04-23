/**
 * Caregiver Alert Tool — Real SMS + Email dispatch
 *
 * Integrates Twilio (SMS) and SendGrid (Email) for production-grade caregiver
 * notifications. Falls back to console-log mode if credentials are missing
 * (keeps demo working even without API keys).
 *
 * Env vars required for live dispatch:
 *   TWILIO_ACCOUNT_SID      — Twilio account SID
 *   TWILIO_AUTH_TOKEN       — Twilio auth token
 *   TWILIO_FROM_NUMBER      — Twilio-registered sender (E.164, e.g. +14155551234)
 *   SENDGRID_API_KEY        — SendGrid API key
 *   SENDGRID_FROM_EMAIL     — Verified sender email
 *   ALERT_DEMO_PHONE        — (optional) override caregiver phone for demo
 *   ALERT_DEMO_EMAIL        — (optional) override caregiver email for demo
 */

import { z } from 'zod';
import { healthMemory } from '../rag/healthMemoryService';
import { v4 as uuidv4 } from 'uuid';
import twilio from 'twilio';
import sgMail from '@sendgrid/mail';

// ── Lazy-initialised clients ─────────────────────────────────────────────────
let twilioClient: ReturnType<typeof twilio> | null = null;
let sendgridReady = false;

function getTwilioClient() {
  if (twilioClient) return twilioClient;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  twilioClient = twilio(sid, token);
  return twilioClient;
}

function ensureSendgrid() {
  if (sendgridReady) return true;
  const key = process.env.SENDGRID_API_KEY;
  if (!key) return false;
  sgMail.setApiKey(key);
  sendgridReady = true;
  return true;
}

export const caregiverAlertInputSchema = z.object({
  patientId: z.string().describe('The ID of the patient at risk'),
  riskLevel: z.enum(['low', 'medium', 'high']).describe('The assessed risk level'),
  riskReasons: z.array(z.string()).describe('List of reasons for the risk assessment'),
  urgencyMessage: z.string().describe('Urgent message to send to the caregiver'),
});

export const caregiverAlertOutputSchema = z.object({
  success: z.boolean(),
  alertId: z.string(),
  caregiverName: z.string(),
  caregiverContact: z.string(),
  messageSent: z.string(),
  channel: z.string(),
  timestamp: z.string(),
  smsStatus: z.enum(['sent', 'failed', 'skipped']).optional(),
  emailStatus: z.enum(['sent', 'failed', 'skipped']).optional(),
  smsError: z.string().optional(),
  emailError: z.string().optional(),
});

export type CaregiverAlertInput = z.infer<typeof caregiverAlertInputSchema>;
export type CaregiverAlertOutput = z.infer<typeof caregiverAlertOutputSchema>;

export async function sendCaregiverAlert(input: CaregiverAlertInput): Promise<CaregiverAlertOutput> {
  const patient = healthMemory.getPatient(input.patientId);
  if (!patient) {
    return {
      success: false,
      alertId: '',
      caregiverName: 'Unknown',
      caregiverContact: '',
      messageSent: 'Patient not found',
      channel: 'none',
      timestamp: new Date().toISOString(),
    };
  }

  const alertId = uuidv4();
  const timestamp = new Date().toISOString();

  // ── Compose messages ───────────────────────────────────────────────────────
  const riskEmoji = input.riskLevel === 'high' ? '🚨' : '⚠️';
  const shortSms = `${riskEmoji} CareSphere AI Alert [${input.riskLevel.toUpperCase()}]
Patient: ${patient.name} (${patient.age}y)
${input.riskReasons.slice(0, 2).join('; ')}
${input.urgencyMessage.split('.')[0]}.
${input.riskLevel === 'high' ? 'Call 999 immediately.' : 'Please check on them soon.'}
— CareSphere AI`;

  const fullMessage = `[CareSphere AI Alert] ${riskEmoji} ${input.riskLevel.toUpperCase()} RISK DETECTED

Patient: ${patient.name} (Age ${patient.age})
Conditions: ${patient.conditions.join(', ') || 'None'}
Location: ${patient.location.city}, ${patient.location.state}

Risk Factors:
${input.riskReasons.map((r) => `  • ${r}`).join('\n')}

${input.urgencyMessage}

Please check on ${patient.name.split(' ')[0]} ${input.riskLevel === 'high' ? 'IMMEDIATELY' : 'as soon as possible'}.

Emergency: 999
Hospital Kuala Lumpur: 03-2615-5555

— CareSphere AI Monitoring System
Timestamp: ${new Date(timestamp).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}`;

  const htmlEmail = `<!DOCTYPE html>
<html><body style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #F0F4F8;">
  <div style="background: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
    <div style="background: ${input.riskLevel === 'high' ? '#DC2626' : '#F59E0B'}; color: white; padding: 20px 24px;">
      <div style="font-size: 14px; opacity: 0.9; letter-spacing: 0.5px;">CARESPHERE AI — ${input.riskLevel === 'high' ? 'CRITICAL' : 'WARNING'} ALERT</div>
      <div style="font-size: 22px; font-weight: 700; margin-top: 4px;">${riskEmoji} ${input.riskLevel.toUpperCase()} RISK DETECTED</div>
    </div>
    <div style="padding: 24px;">
      <h2 style="margin: 0 0 4px 0; font-size: 20px; color: #0F172A;">${patient.name}</h2>
      <p style="margin: 0 0 16px 0; color: #64748B; font-size: 14px;">Age ${patient.age} · ${patient.location.city}, ${patient.location.state}</p>

      <div style="background: ${input.riskLevel === 'high' ? '#FEF2F2' : '#FFFBEB'}; border-left: 4px solid ${input.riskLevel === 'high' ? '#DC2626' : '#F59E0B'}; padding: 12px 16px; border-radius: 4px; margin: 12px 0;">
        <div style="font-weight: 600; color: #0F172A; font-size: 14px;">Clinical Findings</div>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #334155; font-size: 14px;">
          ${input.riskReasons.map((r) => `<li>${r}</li>`).join('')}
        </ul>
      </div>

      <div style="background: #F8FAFC; border-radius: 8px; padding: 12px 16px; margin: 12px 0;">
        <div style="font-weight: 600; color: #0F172A; font-size: 13px; margin-bottom: 4px;">Chronic Conditions</div>
        <div style="color: #475569; font-size: 13px;">${patient.conditions.join(', ') || 'None reported'}</div>
      </div>

      <div style="background: #F8FAFC; border-radius: 8px; padding: 12px 16px; margin: 12px 0;">
        <div style="font-weight: 600; color: #0F172A; font-size: 13px; margin-bottom: 4px;">Urgency Message</div>
        <div style="color: #475569; font-size: 14px; line-height: 1.5;">${input.urgencyMessage}</div>
      </div>

      <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #E2E8F0;">
        <div style="color: #0F172A; font-weight: 600; margin-bottom: 8px;">Next Steps</div>
        <div style="color: #475569; font-size: 14px; line-height: 1.6;">
          ${input.riskLevel === 'high'
            ? `<strong>Immediate action required.</strong> Please contact ${patient.name.split(' ')[0]} now or call emergency services.`
            : `Please check on ${patient.name.split(' ')[0]} soon and confirm their wellbeing.`}
        </div>
      </div>

      <div style="margin-top: 20px; display: flex; gap: 8px;">
        <a href="tel:999" style="background: #DC2626; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Call 999</a>
        <a href="tel:${patient.caregiver.phone}" style="background: #2563EB; color: white; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-left: 8px;">Call Patient</a>
      </div>
    </div>
    <div style="background: #F8FAFC; padding: 12px 24px; color: #94A3B8; font-size: 12px; border-top: 1px solid #E2E8F0;">
      Sent by CareSphere AI · ${new Date(timestamp).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}<br/>
      This is an automated alert. Alert ID: ${alertId.substring(0, 8)}
    </div>
  </div>
</body></html>`;

  // ── Dispatch targets (support env overrides for demo) ──────────────────────
  const toPhone = process.env.ALERT_DEMO_PHONE || patient.caregiver.phone;
  const toEmail = process.env.ALERT_DEMO_EMAIL || patient.caregiver.email;

  console.log(`[CAREGIVER ALERT] 📢 Dispatching to ${patient.caregiver.name} (${toPhone} | ${toEmail})`);

  // ── SMS via Twilio ─────────────────────────────────────────────────────────
  let smsStatus: 'sent' | 'failed' | 'skipped' = 'skipped';
  let smsError: string | undefined;
  const client = getTwilioClient();
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (client && fromNumber && toPhone) {
    try {
      const sms = await client.messages.create({
        body: shortSms,
        from: fromNumber,
        to: toPhone,
      });
      smsStatus = 'sent';
      console.log(`[CAREGIVER ALERT] ✓ SMS sent → ${toPhone} (sid: ${sms.sid})`);
    } catch (err) {
      smsStatus = 'failed';
      smsError = err instanceof Error ? err.message : String(err);
      console.error(`[CAREGIVER ALERT] ✗ SMS failed → ${toPhone}: ${smsError}`);
    }
  } else {
    console.log(`[CAREGIVER ALERT] ⊘ SMS skipped (Twilio not configured — set TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_FROM_NUMBER)`);
  }

  // ── Email via SendGrid ─────────────────────────────────────────────────────
  let emailStatus: 'sent' | 'failed' | 'skipped' = 'skipped';
  let emailError: string | undefined;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;

  if (ensureSendgrid() && fromEmail && toEmail) {
    try {
      await sgMail.send({
        to: toEmail,
        from: { email: fromEmail, name: 'CareSphere AI' },
        subject: `${riskEmoji} ${input.riskLevel === 'high' ? 'URGENT' : 'Attention'}: Health Alert for ${patient.name}`,
        text: fullMessage,
        html: htmlEmail,
      });
      emailStatus = 'sent';
      console.log(`[CAREGIVER ALERT] ✓ Email sent → ${toEmail}`);
    } catch (err) {
      emailStatus = 'failed';
      emailError = err instanceof Error ? err.message : String(err);
      console.error(`[CAREGIVER ALERT] ✗ Email failed → ${toEmail}: ${emailError}`);
    }
  } else {
    console.log(`[CAREGIVER ALERT] ⊘ Email skipped (SendGrid not configured — set SENDGRID_API_KEY/SENDGRID_FROM_EMAIL)`);
  }

  // ── Summarise dispatch result ─────────────────────────────────────────────
  const anySuccess = smsStatus === 'sent' || emailStatus === 'sent';
  const allSkipped = smsStatus === 'skipped' && emailStatus === 'skipped';

  const channelParts: string[] = [];
  if (smsStatus === 'sent') channelParts.push('SMS');
  if (emailStatus === 'sent') channelParts.push('Email');
  if (allSkipped) channelParts.push('Simulated (no credentials)');
  const channel = channelParts.length > 0 ? channelParts.join(' + ') : 'Failed';

  return {
    success: anySuccess || allSkipped, // simulated mode still counts as success for demo
    alertId,
    caregiverName: patient.caregiver.name,
    caregiverContact: toPhone,
    messageSent: fullMessage,
    channel,
    timestamp,
    smsStatus,
    emailStatus,
    smsError,
    emailError,
  };
}
