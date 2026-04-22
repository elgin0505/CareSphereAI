# CareSphere AI - Patient Account Registration System

## Overview
Complete patient account creation system with account number and password authentication has been implemented for the CareSphere AI website.

## What's Been Implemented

### 1. **Frontend - Patient Signup Page** 
**File**: `frontend/app/signup/page.tsx`
- Beautiful signup form with CareSphere branding
- Fields:
  - Full Name (required)
  - Account Number (provided by healthcare provider, e.g., - CS-2026-04202256)
  - Password (minimum 6 characters)
  - Confirm Password
- Form validation before submission
- Automatic account creation and login after successful signup
- Link to login page for existing users
- Loading states and error messaging

### 2. **Frontend - Enhanced Login Page**
**File**: `frontend/app/login/page.tsx`
- Added two login modes:
  - **Healthcare Staff**: Login with email and password (admin@caresphere.my / demo2030)
  - **Patient**: Login with account number and password
- Tabbed interface to switch between login types
- Patient signup link for new accounts
- Responsive design and error handling

### 3. **Frontend - Authentication Context**
**File**: `frontend/contexts/AuthContext.tsx`
- Extended to support:
  - `loginPatient()`: Login with account number and password
  - `signupPatient()`: Register new patient account
  - User state management (stores patient ID and name)
  - Cookie-based session persistence

### 4. **Frontend - API Integration**
**File**: `frontend/lib/api.ts`
- New authentication functions:
  - `signupPatient()`: POST request to create account
  - `loginPatient()`: POST request to authenticate
  - `verifyToken()`: Verify authentication token

### 5. **Frontend - Next.js API Routes**
**Files**: 
- `frontend/app/api/auth/signup/route.ts` - Proxy to backend signup
- `frontend/app/api/auth/login/route.ts` - Proxy to backend login

### 6. **Backend - Authentication Routes**
**File**: `backend/src/routes/authRoutes.ts`
- `POST /api/auth/signup` - Create new patient account
  - Input: accountNumber, fullName, password
  - Returns: patientId, patientName, token
  - Automatically creates patient record in health memory
  
- `POST /api/auth/login` - Authenticate patient
  - Input: accountNumber, password
  - Returns: patientId, patientName, token
  - Validates credentials securely
  
- `GET /api/auth/verify` - Verify authentication token

### 7. **Backend - Server Setup**
**File**: `backend/src/index.ts`
- Registered new auth routes: `app.use('/api/auth', authRoutes)`
- Routes are now accessible at `/api/auth/*`

## How It Works

### Patient Registration Flow:
1. Patient visits `/signup` page
2. Enters account number, full name, and password
3. Form validates input (password > 6 chars, passwords match)
4. Sends POST to `/api/auth/signup`
5. Backend creates:
   - Patient record in health memory system
   - Account credentials stored securely
6. Returns authentication token
7. Frontend stores token in cookies
8. Automatically redirects to dashboard

### Patient Login Flow:
1. Patient visits `/login` page
2. Clicks "Patient" tab
3. Enters account number and password
4. Clicks "Sign In to Dashboard"
5. Sends POST to `/api/auth/login`
6. Backend validates credentials
7. Returns authentication token if valid
8. Frontend stores token in cookies
9. Redirects to dashboard

## Authentication Details

### Security (Development Mode)
- **Important**: Current implementation uses SHA-256 for demo purposes
- **Production**: Should use bcrypt or similar industry-standard hashing
- Passwords stored securely (hashed, not plaintext)
- Session tokens are generated randomly

### Session Management
- Authentication stored in secure HTTP-only cookies
- Session expires after 24 hours (max-age=86400)
- Patient ID and name also stored in cookies
- Automatic logout clears all auth cookies

### Data Storage
- Patient credentials stored in-memory (demo)
- Patient records automatically created in health memory system
- Accounts persist during server runtime (reset on server restart)
- Production: Use persistent database (MongoDB, PostgreSQL, etc.)

## Patient Account Structure

When a patient signs up, the following is created:

```typescript
{
  accountNumber: string,        // e.g., "CS-2024-001234"
  fullName: string,             // Patient's full name
  passwordHash: string,         // Hashed password
  patientId: string,            // Auto-generated ID
  createdAt: ISO8601 timestamp
}
```

Associated patient record in health system:
```typescript
{
  id: string,                   // Matches patientId
  name: string,                 // From fullName
  age: 65,                       // Default, can be updated
  gender: "male",               // Default, can be updated
  conditions: [],               // Empty initially
  medications: [],              // Empty initially
  caregiver: { ... },           // Default values
  location: { ... },            // Default to Kuala Lumpur
  createdAt: ISO8601 timestamp
}
```

## Testing the Feature

### 1. Start the Backend Server
```bash
cd backend
npm install
npm run dev
```

### 2. Start the Frontend Dev Server
```bash
cd frontend
npm install
npm run dev
```

### 3. Test Signup
- Navigate to `http://localhost:3000/signup`
- Enter:
  - Full Name: "Ahmad Bin Hassan"
  - Account Number: "CS-2024-001234"
  - Password: "password123"
  - Confirm Password: "password123"
- Click "Create Account"
- Should redirect to dashboard

### 4. Test Login
- Navigate to `http://localhost:3000/login`
- Click "Patient" tab
- Enter:
  - Account Number: "CS-2024-001234"
  - Password: "password123"
- Click "Sign In to Dashboard"
- Should redirect to dashboard

### 5. Test Admin Login (Still Works)
- Click "Healthcare Staff" tab
- Email: `admin@caresphere.my`
- Password: `demo2030`

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Backend (.env)
```
PORT=3001
FRONTEND_URL=http://localhost:3000
GOOGLE_GENAI_API_KEY=your_api_key_here
```

## Files Modified/Created

### Frontend Files:
- ✅ Created: `app/signup/page.tsx` - Patient signup page
- ✅ Modified: `app/login/page.tsx` - Added patient login tab
- ✅ Modified: `contexts/AuthContext.tsx` - Extended auth functions
- ✅ Modified: `lib/api.ts` - Added auth API methods
- ✅ Created: `app/api/auth/signup/route.ts` - Signup proxy
- ✅ Created: `app/api/auth/login/route.ts` - Login proxy

### Backend Files:
- ✅ Created: `routes/authRoutes.ts` - Authentication endpoints
- ✅ Modified: `index.ts` - Registered auth routes

## Next Steps (Recommendations)import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './AICompanion.css'; // We'll create styling below

interface Patient {
  id: string;
  name: string;
  accountNumber: string;
  age?: number;
  gender?: string;
  lastVisit?: string;
}

const AICompanion: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const router = useRouter();

  // Fetch all patients on component mount
  useEffect(() => {
    const fetchPatients = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/patients`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch patients');
        }

        const data = await response.json();
        setPatients(data);
        setError('');
      } catch (err) {
        console.error('Error fetching patients:', err);
        setError('Unable to load patient list');
        setPatients([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  // Filter patients based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPatients([]);
      setShowDropdown(false);
    } else {
      const filtered = patients.filter((patient) =>
        patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.accountNumber.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPatients(filtered);
      setShowDropdown(filtered.length > 0);
    }
  }, [searchQuery, patients]);

  const handlePatientSelect = (patient: Patient) => {
    // Navigate to patient details page
    console.log('Selected patient:', patient);
    router.push(`/patient/${patient.id}`);
    setSearchQuery('');
    setShowDropdown(false);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setShowDropdown(false);
  };

  return (
    <div className="ai-companion">
      <div className="ai-companion-header">
        <h3>🤖 AI Companion</h3>
        <p className="ai-companion-subtitle">Patient Management Assistant</p>
      </div>

      <div className="search-container">
        <div className="search-input-wrapper">
          <input
            type="text"
            placeholder="Search patient by name or account number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery && setShowDropdown(true)}
            className="search-bar"
          />
          {searchQuery && (
            <button className="clear-button" onClick={handleClearSearch} title="Clear search">
              ✕
            </button>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}

        {showDropdown && filteredPatients.length > 0 && (
          <ul className="patient-dropdown">
            {filteredPatients.map((patient) => (
              <li
                key={patient.id}
                className="patient-item"
                onClick={() => handlePatientSelect(patient)}
              >
                <div className="patient-info">
                  <strong className="patient-name">{patient.name}</strong>
                  <span className="patient-account">{patient.accountNumber}</span>
                </div>
                <div className="patient-meta">
                  {patient.age && <span className="patient-age">Age: {patient.age}</span>}
                  {patient.gender && <span className="patient-gender">{patient.gender}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}

        {showDropdown && searchQuery && filteredPatients.length === 0 && !loading && (
          <div className="no-results">No patients found matching "{searchQuery}"</div>
        )}

        {loading && <div className="loading">Loading patients...</div>}
      </div>

      <div className="ai-features">
        <h4>Quick Features:</h4>
        <ul>
          <li>🔍 Search and view patient records</li>
          <li>📋 Manage patient information</li>
          <li>💊 Track medications and conditions</li>
          <li>📍 Hospital location assistance</li>
        </ul>
      </div>
    </div>
  );
};

export default AICompanion;
