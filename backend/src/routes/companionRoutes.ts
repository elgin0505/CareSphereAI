import { Router, Request, Response } from 'express';
import { runCompanionChat } from '../flows/companionFlow';
import { healthMemory } from '../rag/healthMemoryService';

const router = Router();

router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { patientId, message, sessionType, language } = req.body as {
      patientId: string;
      message: string;
      sessionType?: 'daily_checkin' | 'medication_reminder' | 'general' | 'emotional_support';
      language?: 'en' | 'bm';
    };

    if (!patientId || !message) {
      return res.status(400).json({ success: false, error: 'patientId and message are required' });
    }

    const result = await runCompanionChat(patientId, message, sessionType || 'general', language || 'en');
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[POST /companion/chat] Error:', err);
    res.status(500).json({ success: false, error: 'Companion chat failed', details: String(err) });
  }
});

router.get('/history/:patientId', (req: Request, res: Response) => {
  const history = healthMemory.getConversationHistory(req.params.patientId, 20);
  res.json({ success: true, data: history });
});

router.post('/daily-checkin/:patientId', async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const language = (req.body?.language || 'en') as 'en' | 'bm';
    const patient = healthMemory.getPatient(patientId);
    if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });

    const firstName = patient.name.split(' ')[0];
    const hour = new Date().getHours();
    const timeGreeting =
      language === 'bm'
        ? hour < 12 ? 'Selamat pagi' : hour < 17 ? 'Selamat tengah hari' : 'Selamat petang'
        : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    const initMessage = language === 'bm'
      ? `${timeGreeting} ${firstName}! Ini masa untuk pemeriksaan harian anda.`
      : `${timeGreeting} ${firstName}! Time for your daily check-in.`;

    const result = await runCompanionChat(patientId, initMessage, 'daily_checkin', language);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

router.post('/medication-reminder/:patientId', async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const language = (req.body?.language || 'en') as 'en' | 'bm';
    const patient = healthMemory.getPatient(patientId);
    if (!patient) return res.status(404).json({ success: false, error: 'Patient not found' });

    // Don't expose full medication list in the message — companionFlow has access via healthMemory
    const initMessage = language === 'bm'
      ? `Sudah tiba masa untuk minum ubat.`
      : `It's time to take your medication.`;

    const result = await runCompanionChat(patientId, initMessage, 'medication_reminder', language);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
