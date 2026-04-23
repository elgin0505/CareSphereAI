import { Router, Request, Response } from 'express';
import { healthMemory } from '../rag/healthMemoryService';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// ─── LOGIN ──────────────────────────────────────────────────────────────────
router.post('/login', (req: Request, res: Response) => {
  const { accountNumber, password } = req.body;

  if (!accountNumber || !password) {
    return res.status(400).json({ success: false, error: 'Account number and password are required' });
  }

  // Support both admin login and patient login
  if (accountNumber === 'admin@caresphere.my' && password === 'demo2030') {
    return res.json({
      success: true,
      data: {
        role: 'admin',
        token: 'admin-token-123',
        user: { name: 'Admin', role: 'admin' }
      }
    });
  }

  const patient = healthMemory.getPatientByAccountNumber(accountNumber);

  if (!patient || patient.password !== password) {
    return res.status(401).json({ success: false, error: 'Invalid account number or password' });
  }

  res.json({
    success: true,
    data: {
      role: 'patient',
      token: `patient-token-${patient.id}`,
      user: {
        id: patient.id,
        name: patient.name,
        accountNumber: patient.accountNumber,
        role: 'patient'
      }
    }
  });
});

// ─── REGISTER (Patient Self-Signup) ──────────────────────────────────────────
router.post('/register', (req: Request, res: Response) => {
  try {
    const { accountNumber, password, name, age, gender } = req.body;

    if (!accountNumber || !password || !name || !age) {
      return res.status(400).json({ success: false, error: 'Required fields: accountNumber, password, name, age' });
    }

    const existing = healthMemory.getPatientByAccountNumber(accountNumber);
    if (existing) {
      return res.status(400).json({ success: false, error: 'Account number already exists' });
    }

    const patientId = `patient-${Date.now()}`;
    const newPatient = {
      id: patientId,
      accountNumber,
      password,
      name: name.trim(),
      age: parseInt(age),
      gender: gender || 'male',
      conditions: [],
      medications: [],
      caregiver: {
        name: 'Family Member',
        phone: '012-000 0000',
        email: '',
        relationship: 'Family',
      },
      location: {
        address: 'Malaysia',
        city: 'Kuala Lumpur',
        state: 'Wilayah Persekutuan',
        lat: 3.1390,
        lng: 101.6869,
      },
      createdAt: new Date().toISOString(),
    };

    healthMemory.storePatient(newPatient);
    console.log(`[auth] New patient registered: ${name} (${accountNumber})`);

    res.status(201).json({
      success: true,
      data: {
        id: newPatient.id,
        accountNumber: newPatient.accountNumber,
        name: newPatient.name
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

export default router;
