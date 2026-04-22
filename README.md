# 🏥 CareSphere AI

> **Project 2030: MyAI Future Hackathon**  
> Track 3: Vital Signs — Healthcare & Wellbeing  
> Team: GDG UTM

**Live Demo:** https://care-sphere-ai.vercel.app  
**Backend API:**cd frontend
npm install
npm run dev

---

## 🌟 Overview

CareSphere AI is a full-stack AI-powered elderly health monitoring system built for Malaysia's ageing population. It transitions from simple health data collection to **autonomous AI action** — detecting risk, alerting caregivers, and providing emotional support in real time.

---

## 🤖 AI Stack (Google Ecosystem)

| Technology | Role |
|---|---|
| **Gemini 2.5 Flash** | Risk assessment, companion chat, weekly reports |
| **Firebase Genkit** | AI flow orchestration & agentic pipelines |
| **Google AI Studio** | Gemini API access & prompt engineering |
| **Google Cloud Run** | Serverless backend deployment (asia-southeast1) |
| **Vercel** | Frontend hosting |

---

## ✨ Features

### 🔴 Real-Time Risk Assessment
- Continuous vital signs monitoring (heart rate, blood pressure, SpO₂, temperature, sleep, movement)
- Gemini AI classifies risk as **Low / Medium / High** with reasoning
- Autonomous emergency agent triggers when risk is detected

### 🤖 Autonomous Emergency Agent (Chat → Action)
When high risk is detected, the agent automatically:
1. **Alerts the caregiver** with patient summary
2. **Generates a medical summary** for hospital handover
3. **Finds the nearest Malaysian hospital** with directions

### 💬 AI Companion (Bilingual)
- Warm conversational AI for elderly patients
- Supports **English & Bahasa Malaysia** 🇲🇾
- Session types: Daily Check-in, Medication Reminder, Emotional Support, General Chat
- Voice TTS — AI responses read aloud
- Sentiment analysis on every response

### 📊 Health Dashboard
- Live patient monitoring cards
- Risk score trends & baseline anomaly detection
- Auto-simulate vital signs (normal / warning / critical scenarios)

### 💊 Medication Tracker
- Daily medication schedule with taken/missed logging
- Adherence rate tracking
- Medication reminders via AI Companion

### 🏥 Hospital Finder
- 30+ real Malaysian hospitals (KKM, government & private)
- Coverage: KL, Selangor, Johor, Penang, Sabah, Sarawak & more
- Emergency contact: **999**

### 📱 IoT Device Simulation
- Smartwatch, BP cuff, pulse oximeter, glucose meter, mobile app
- Each device sends readings → triggers Gemini risk assessment
- Live ingestion log

### 📄 Weekly AI Health Report
- Gemini-generated comprehensive 7-day health summary
- Vital signs trends, medication adherence, caregiver action items
- Print / PDF export

### 👤 Patient Onboarding
- 3-step form: Patient Info → Health Profile → Caregiver & Location
- Supports all 14 Malaysian states
- Auto-seeds baseline health readings on registration

---

## 🏗️ Architecture

```
┌─────────────────────┐     HTTPS      ┌──────────────────────────┐
│   Next.js Frontend  │ ────────────► │  Node.js / Express API   │
│   (Vercel)          │               │  (Google Cloud Run)       │
│                     │               │                           │
│  • Dashboard        │               │  Firebase Genkit Flows:   │
│  • AI Companion     │               │  • riskAssessmentFlow     │
│  • Medications      │               │  • emergencyActionFlow    │
│  • Hospitals        │               │  • companionFlow          │
│  • Devices          │               │  • weeklyReportFlow       │
│  • Reports          │               │                           │
│  • Onboarding       │               │  Gemini 2.5 Flash API     │
└─────────────────────┘               │  RAG Health Memory        │
                                      └──────────────────────────┘
```

---

## 🛠️ Tech Stack

**Frontend**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS (glassmorphism dark theme)
- Recharts (vital sign trend charts)
- Web Speech API (TTS voice companion)

**Backend**
- Node.js + Express
- TypeScript
- Firebase Genkit (AI flow orchestration)
- `@google/generative-ai` SDK (Gemini 2.5 Flash)
- RAG health memory service (in-memory with baseline computation)

**Infrastructure**
- Google Cloud Run (backend, asia-southeast1)
- Vercel (frontend)
- Docker (containerisation)
- GitHub Actions / Cloud Build (CI/CD)

---

## 🚀 Run Locally

### Prerequisites
- Node.js 20+
- Google AI Studio API key → [aistudio.google.com](https://aistudio.google.com)

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Add your GOOGLE_GENAI_API_KEY to .env
npm run dev
# Runs on http://localhost:3001
```

### Frontend
```bash
cd frontend
npm install
# Create .env.local with:
# NEXT_PUBLIC_API_URL=http://localhost:3001
npm run dev
# Runs on http://localhost:3000
```

### Docker (both services)
```bash
docker-compose up
```

---

## 🌏 Malaysian Context

- Bilingual UI: **English & Bahasa Malaysia**
- 30+ real **KKM hospitals** with actual phone numbers
- Emergency number: **999**
- Patient locations across all **14 Malaysian states**
- Culturally appropriate AI companion (uses "lah", "Pak Cik", "Mak Cik")

---

## 👥 Team

**GDG UTM — Project 2030 MyAI Future Hackathon**

---

## 📄 License

MIT License — built for hackathon purposes.
