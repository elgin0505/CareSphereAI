/**
 * Device Data Ingestion Routes
 *
 * In production, these endpoints receive data from:
 *   - IoT wearables (smartwatch, pulse oximeter, BP cuff)
 *   - Patient mobile app (manual self-reporting)
 *   - Hospital bedside monitors (HL7 FHIR integration)
 *
 * Each device authenticates with a device_token, sends a reading,
 * and CareSphere AI immediately runs risk assessment + triggers
 * autonomous agent actions if needed.
 */

import { Router, Request, Response } from 'express';
import { healthMemory } from '../rag/healthMemoryService';
import { runRiskAssessment } from '../flows/riskAssessmentFlow';
import { runEmergencyActions } from '../flows/emergencyActionFlow';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Simulated device registry: device_id → patientId
const deviceRegistry: Record<string, { patientId: string; deviceType: string; model: string }> = {
  'WATCH-AHM-001': { patientId: 'patient-001', deviceType: 'smartwatch', model: 'Garmin Venu 3' },
  'BPCUFF-AHM-001': { patientId: 'patient-001', deviceType: 'bp_cuff', model: 'Omron HEM-7156' },
  'WATCH-MEE-001': { patientId: 'patient-002', deviceType: 'smartwatch', model: 'Samsung Galaxy Watch 6' },
  'OXI-MEE-001':   { patientId: 'patient-002', deviceType: 'pulse_oximeter', model: 'Contec CMS50D' },
  'WATCH-LIM-001': { patientId: 'patient-003', deviceType: 'smartwatch', model: 'Apple Watch Series 9' },
  'OXI-LIM-001':   { patientId: 'patient-003', deviceType: 'pulse_oximeter', model: 'Contec CMS50D' },
  'GLUCO-AHM-001': { patientId: 'patient-001', deviceType: 'glucose_meter', model: 'Accu-Chek Guide' },
  'MOBILE-AHM':    { patientId: 'patient-001', deviceType: 'mobile_app', model: 'CareSphere Patient App' },
  'MOBILE-MEE':    { patientId: 'patient-002', deviceType: 'mobile_app', model: 'CareSphere Patient App' },
  'MOBILE-LIM':    { patientId: 'patient-003', deviceType: 'mobile_app', model: 'CareSphere Patient App' },
};

// Track last ping per device
const deviceLastSeen: Record<string, string> = {};
const deviceReadingCount: Record<string, number> = {};

// GET /api/devices — list all registered devices and their status
router.get('/', (_req: Request, res: Response) => {
  const devices = Object.entries(deviceRegistry).map(([deviceId, info]) => ({
    deviceId,
    ...info,
    patient: healthMemory.getPatient(info.patientId),
    lastSeen: deviceLastSeen[deviceId] || null,
    readingCount: deviceReadingCount[deviceId] || 0,
    status: deviceLastSeen[deviceId]
      ? (Date.now() - new Date(deviceLastSeen[deviceId]).getTime() < 120000 ? 'online' : 'idle')
      : 'never_connected',
  }));
  res.json({ success: true, data: devices });
});

/**
 * POST /api/devices/:deviceId/reading
 *
 * This is the main ingestion endpoint.
 * A real IoT device/mobile app would POST here via HTTPS.
 *
 * Payload (subset — device sends what it can measure):
 * {
 *   heartRate?: number,
 *   oxygenSaturation?: number,
 *   bloodPressure?: { systolic, diastolic },
 *   temperature?: number,
 *   movementScore?: number,
 *   sleepHours?: number,
 *   glucoseLevel?: number,
 *   device_token?: string   // auth in production
 * }
 */
router.post('/:deviceId/reading', async (req: Request, res: Response) => {
  const { deviceId } = req.params;
  const device = deviceRegistry[deviceId];

  if (!device) {
    return res.status(404).json({
      success: false,
      error: `Device '${deviceId}' not registered. Register device first.`,
    });
  }

  const patient = healthMemory.getPatient(device.patientId);
  if (!patient) {
    return res.status(404).json({ success: false, error: 'Patient not found for this device.' });
  }

  // Merge incoming partial reading with sensible defaults
  // (e.g. a pulse oximeter only sends HR + O2, not BP or sleep)
  const incoming = req.body;
  const latestReadings = healthMemory.getLatestReadings(device.patientId, 1);
  const lastReading = latestReadings[0];

  // Fill missing fields from last reading or safe defaults
  const reading = {
    heartRate: incoming.heartRate ?? lastReading?.heartRate ?? 75,
    sleepHours: incoming.sleepHours ?? lastReading?.sleepHours ?? 7,
    movementScore: incoming.movementScore ?? lastReading?.movementScore ?? 50,
    bloodPressure: incoming.bloodPressure ?? lastReading?.bloodPressure ?? { systolic: 130, diastolic: 85 },
    oxygenSaturation: incoming.oxygenSaturation ?? lastReading?.oxygenSaturation ?? 97,
    temperature: incoming.temperature ?? lastReading?.temperature ?? 36.8,
    glucoseLevel: incoming.glucoseLevel ?? lastReading?.glucoseLevel,
  };

  // Track device activity
  deviceLastSeen[deviceId] = new Date().toISOString();
  deviceReadingCount[deviceId] = (deviceReadingCount[deviceId] || 0) + 1;

  try {
    // Run Gemini risk assessment
    const assessment = await runRiskAssessment(device.patientId, reading);

    // Detect personal baseline anomalies
    const fullReadings = healthMemory.getLatestReadings(device.patientId, 1);
    const anomalies = fullReadings.length > 0
      ? healthMemory.detectAnomalies(device.patientId, fullReadings[0])
      : [];

    // Trigger autonomous agent if medium/high risk
    let agentActions = null;
    if (assessment.riskLevel === 'medium' || assessment.riskLevel === 'high') {
      agentActions = await runEmergencyActions(
        device.patientId,
        assessment.riskLevel,
        assessment.riskScore,
        assessment.reasons,
        assessment.recommendations
      );
    }

    res.json({
      success: true,
      data: {
        deviceId,
        deviceType: device.deviceType,
        model: device.model,
        patientName: patient.name,
        readingReceived: reading,
        assessment,
        anomalies,
        agentActionsTriggered: agentActions !== null,
        agentActions,
        processedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// POST /api/devices/:deviceId/heartbeat — device ping (no reading, just "I'm alive")
router.post('/:deviceId/heartbeat', (req: Request, res: Response) => {
  const { deviceId } = req.params;
  if (!deviceRegistry[deviceId]) {
    return res.status(404).json({ success: false, error: 'Device not registered.' });
  }
  deviceLastSeen[deviceId] = new Date().toISOString();
  res.json({ success: true, data: { deviceId, timestamp: deviceLastSeen[deviceId], message: 'Heartbeat received' } });
});

// GET /api/devices/:deviceId/status
router.get('/:deviceId/status', (req: Request, res: Response) => {
  const { deviceId } = req.params;
  const device = deviceRegistry[deviceId];
  if (!device) return res.status(404).json({ success: false, error: 'Device not found.' });

  const lastSeen = deviceLastSeen[deviceId] || null;
  const isOnline = lastSeen
    ? Date.now() - new Date(lastSeen).getTime() < 120000
    : false;

  res.json({
    success: true,
    data: {
      deviceId,
      ...device,
      lastSeen,
      readingCount: deviceReadingCount[deviceId] || 0,
      status: isOnline ? 'online' : lastSeen ? 'idle' : 'never_connected',
    },
  });
});

export default router;
