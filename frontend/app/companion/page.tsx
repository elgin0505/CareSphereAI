'use client';

// Web Speech API types (not always in TS dom lib)
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative { transcript: string; confidence: number; }
interface SpeechRecognitionI extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend:    (() => void) | null;
  onerror:  ((event: Event) => void) | null;
  onstart:  (() => void) | null;
}
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionI;
    webkitSpeechRecognition?: new () => SpeechRecognitionI;
  }
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Heart, Bell, Calendar, Smile, AlertTriangle, Volume2, VolumeX, Mic, MicOff } from 'lucide-react';
import { api, Patient, CompanionResponse } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
  sentiment?: string;
  medicationReminders?: string[];
  flagged?: boolean;
}

export default function CompanionPage() {
  const { t, lang } = useLanguage();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionType, setSessionType] = useState<'general' | 'daily_checkin' | 'medication_reminder' | 'emotional_support'>('general');
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);

  // ── STT (Speech-to-Text) state ────────────────────────────────
  const [sttSupported, setSttSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText]   = useState('');   // words appearing while speaking
  const recognitionRef = useRef<SpeechRecognitionI | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      setTtsSupported(true);
    }
  }, []);

  // ── STT: initialise SpeechRecognition ─────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    setSttSupported(true);

    const rec = new SR();
    rec.continuous      = false;   // stop after a pause
    rec.interimResults  = true;    // show words as they appear
    rec.maxAlternatives = 1;

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final   = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += transcript;
        else interim += transcript;
      }
      setInterimText(interim);
      if (final) {
        setInput((prev) => (prev ? prev + ' ' + final.trim() : final.trim()));
        setInterimText('');
      }
    };

    rec.onend  = () => { setIsListening(false); setInterimText(''); };
    rec.onerror = () => { setIsListening(false); setInterimText(''); };

    recognitionRef.current = rec;
  }, []);

  // ── Update recognition language when lang changes ─────────────
  useEffect(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current.lang = lang === 'bm' ? 'ms-MY' : 'en-MY';
  }, [lang]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setInterimText('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  useEffect(() => {
    api.getPatients().then((ps) => {
      setPatients(ps);
      if (ps.length > 0) setSelectedPatient(ps[0].id);
    });
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      api.getChatHistory(selectedPatient).then((history) => {
        const msgs: Message[] = history.map((h) => ({
          id: h.id,
          role: h.role === 'user' ? 'user' : 'ai',
          content: h.content,
          timestamp: new Date(h.timestamp),
        }));
        setMessages(msgs);
      });
    }
  }, [selectedPatient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const speakText = useCallback((text: string) => {
    if (!ttsEnabled || !synthRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    utterance.pitch = 1.05;
    utterance.volume = 0.9;
    // Pick voice matching current language: ms-* for BM, en-* for English
    const voices = synthRef.current.getVoices();
    const preferred = lang === 'bm'
      ? (voices.find((v) => v.lang.startsWith('ms')) || voices.find((v) => v.lang.startsWith('en')))
      : (voices.find((v) => v.lang === 'en-GB') || voices.find((v) => v.lang.startsWith('en')));
    if (preferred) utterance.voice = preferred;
    if (lang === 'bm') utterance.lang = 'ms-MY';

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synthRef.current.speak(utterance);
  }, [ttsEnabled, lang]);

  const stopSpeaking = () => {
    synthRef.current?.cancel();
    setIsSpeaking(false);
    // Do NOT disable TTS — just stop current playback
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedPatient || loading) return;

    const msgText = input.trim();
    const userMsg: Message = {
      id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role: 'user',
      content: msgText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const result: CompanionResponse = await api.chat(selectedPatient, msgText, sessionType, lang);
      const aiMsg: Message = {
        id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        role: 'ai',
        content: result.response,
        timestamp: new Date(),
        sentiment: result.sentiment,
        medicationReminders: result.medicationReminders,
        flagged: result.flaggedForCaregiver,
      };
      setMessages((prev) => [...prev, aiMsg]);
      speakText(result.response);
    } catch (_err) {
      // Restore input so user can retry without retyping
      setInput(msgText);
      const errMsg: Message = {
        id: `e-${Date.now()}`,
        role: 'ai',
        content: lang === 'bm'
          ? 'Maaf, saya menghadapi masalah sambungan. Sila cuba lagi sebentar.'
          : "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleDailyCheckin = async () => {
    if (!selectedPatient) return;
    setLoading(true);
    try {
      const result = await api.dailyCheckin(selectedPatient, lang);
      const msg: Message = {
        id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        role: 'ai',
        content: result.response,
        timestamp: new Date(),
        sentiment: result.sentiment,
        medicationReminders: result.medicationReminders,
      };
      setMessages((prev) => [...prev, msg]);
      speakText(result.response);
    } catch (_err) {
      console.error('[handleDailyCheckin] failed');
    } finally {
      setLoading(false);
    }
  };

  const currentPatient = patients.find((p) => p.id === selectedPatient);

  return (
    <div className="flex h-[calc(100vh-3rem)] gap-4 animate-fade-in">
      {/* Left Panel */}
      <div className="w-72 flex flex-col gap-4">
        {/* Patient Select */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-4">
          <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Heart className="w-4 h-4 text-teal-600" />
            {t.aiCompanion}
          </h2>
          <select
            value={selectedPatient}
            onChange={(e) => setSelectedPatient(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {currentPatient && (
            <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-xs text-slate-500">{currentPatient.age} years · {currentPatient.location.city}</p>
              <p className="text-xs text-slate-400 mt-1">{currentPatient.conditions.join(', ')}</p>
              <p className="text-xs text-teal-600 mt-1">{lang === 'bm' ? 'Ubatan' : 'Medications'}: {currentPatient.medications.length}</p>
            </div>
          )}
        </div>

        {/* Session Type */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-3">{lang === 'bm' ? 'Jenis Sesi' : 'Session Type'}</p>
          <div className="space-y-1">
            {([
              { value: 'general',             label: lang === 'bm' ? 'Perbualan Biasa'    : 'General Chat',        icon: Smile },
              { value: 'daily_checkin',       label: lang === 'bm' ? 'Pemeriksaan Harian' : 'Daily Check-in',      icon: Calendar },
              { value: 'medication_reminder', label: lang === 'bm' ? 'Peringatan Ubatan'  : 'Medication Reminder', icon: Bell },
              { value: 'emotional_support',   label: lang === 'bm' ? 'Sokongan Emosi'     : 'Emotional Support',   icon: Heart },
            ] as const).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setSessionType(value)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  sessionType === value
                    ? 'bg-teal-50 text-teal-700 border border-teal-200'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Voice Panel (STT + TTS) */}
        {(ttsSupported || sttSupported) && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-card p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase">
              {lang === 'bm' ? 'Teman Suara' : 'Voice Companion'}
            </p>

            {/* STT — Speak to type */}
            {sttSupported && (
              <div>
                <button
                  onClick={toggleListening}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all border ${
                    isListening
                      ? 'bg-red-50 text-red-600 border-red-300 animate-pulse'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-red-200 hover:text-red-500'
                  }`}
                >
                  {isListening
                    ? <MicOff className="w-4 h-4 shrink-0" />
                    : <Mic className="w-4 h-4 shrink-0" />}
                  <span className="flex-1 text-left">
                    {isListening
                      ? (lang === 'bm' ? '🔴 Mendengar… (tekan berhenti)' : '🔴 Listening… (tap to stop)')
                      : (lang === 'bm' ? 'Tekan untuk bercakap' : 'Tap to speak')}
                  </span>
                </button>
                {isListening && (
                  <div className="mt-2 flex items-center justify-center gap-1">
                    {[0,1,2,3,4].map((i) => (
                      <div key={i} className="w-1 bg-red-400 rounded-full animate-bounce"
                        style={{ height: `${6 + (i % 3) * 4}px`, animationDelay: `${i * 0.1}s` }} />
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-slate-400 mt-1 text-center">
                  {lang === 'bm' ? 'Sokong Bahasa Malaysia & Inggeris' : 'Supports English & Bahasa Malaysia'}
                </p>
              </div>
            )}

            {/* TTS — AI speaks back */}
            {ttsSupported && (
              <div>
                <button
                  onClick={() => {
                    if (isSpeaking) { stopSpeaking(); }
                    else { setTtsEnabled((v) => !v); }
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors border ${
                    ttsEnabled
                      ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {isSpeaking ? <VolumeX className="w-4 h-4 animate-pulse" /> : ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  {isSpeaking ? (lang === 'bm' ? 'Bercakap… (klik berhenti)' : 'Speaking… (click to stop)') : ttsEnabled ? `${t.listenVoice} — ON` : `${t.listenVoice} — OFF`}
                </button>
                {isSpeaking && (
                  <div className="mt-2 flex items-center justify-center gap-1">
                    {[0,1,2,3,4].map((i) => (
                      <div key={i} className="w-1 bg-purple-400 rounded-full animate-bounce"
                        style={{ height: `${8 + (i % 3) * 4}px`, animationDelay: `${i * 0.1}s` }} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-card p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-3">{lang === 'bm' ? 'Tindakan Pantas' : 'Quick Actions'}</p>
          <button onClick={handleDailyCheckin} disabled={loading}
            className="w-full py-2 px-3 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 text-sm transition-colors disabled:opacity-50">
            {lang === 'bm' ? 'Mulakan Pemeriksaan Harian' : 'Start Daily Check-in'}
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-card flex flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
            <Heart className="w-5 h-5 text-white animate-heartbeat" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">{t.companionTitle}</p>
            <p className="text-xs text-teal-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-blink" />
              Powered by Gemini Flash · RAG Memory Active
            </p>
          </div>
          {currentPatient && (
            <div className="ml-auto text-right">
              <p className="text-sm font-medium text-slate-900">{currentPatient.name}</p>
              <p className="text-xs text-slate-400">{currentPatient.age} years old</p>
            </div>
          )}
          {isSpeaking && (
            <button onClick={stopSpeaking}
              className="ml-2 p-2 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors">
              <VolumeX className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Heart className="w-12 h-12 text-teal-300 mx-auto mb-3" />
              <p className="text-slate-500">{t.companionSubtitle}</p>
              <p className="text-slate-400 text-sm mt-1">
                {lang === 'bm' ? 'Sokongan mesra untuk warga emas di Malaysia' : 'Warm, caring support for elderly patients in Malaysia'}
              </p>
              {ttsSupported && (
                <p className="text-slate-400 text-xs mt-3 flex items-center justify-center gap-1">
                  <Volume2 className="w-3 h-3" />
                  {lang === 'bm' ? 'Aktifkan Teman Suara untuk dengar respons AI' : 'Enable Voice Companion to hear AI responses aloud'}
                </p>
              )}
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'} p-3 group relative`}>
                <p className="text-sm leading-relaxed">{msg.content}</p>
                {msg.medicationReminders && msg.medicationReminders.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {msg.medicationReminders.map((rem, i) => (
                      <p key={i} className="text-xs text-teal-600 flex items-center gap-1">
                        <Bell className="w-3 h-3" /> {rem}
                      </p>
                    ))}
                  </div>
                )}
                {msg.flagged && (
                  <div className="mt-2 flex items-center gap-1 text-red-600 text-xs">
                    <AlertTriangle className="w-3 h-3" /> Caregiver notified
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <p className="text-xs text-slate-400">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {msg.role === 'ai' && ttsEnabled && (
                    <button
                      onClick={() => speakText(msg.content)}
                      className="text-xs text-slate-400 hover:text-purple-600 transition-colors flex items-center gap-0.5 opacity-0 group-hover:opacity-100"
                    >
                      <Volume2 className="w-3 h-3" /> Replay
                    </button>
                  )}
                  {msg.sentiment && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ml-auto ${
                      msg.sentiment === 'urgent'      ? 'bg-red-50 text-red-600' :
                      msg.sentiment === 'supportive'  ? 'bg-green-50 text-green-700' :
                      msg.sentiment === 'reassuring'  ? 'bg-blue-50 text-blue-700' :
                      msg.sentiment === 'informative' ? 'bg-purple-50 text-purple-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {msg.sentiment}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="chat-bubble-ai p-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="w-2 h-2 rounded-full bg-teal-400 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-100 bg-white">
          {/* Interim transcript (words appearing while speaking) */}
          {isListening && (
            <div className="mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
              <p className="text-sm text-slate-500 italic flex-1 min-h-[1.25rem]">
                {interimText || (lang === 'bm' ? 'Mendengar…' : 'Listening…')}
              </p>
              <button onClick={toggleListening} className="text-xs text-red-500 hover:text-red-700 font-medium shrink-0">
                {lang === 'bm' ? 'Berhenti' : 'Stop'}
              </button>
            </div>
          )}

          <div className="flex gap-2">
            {/* Text input */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder={isListening
                ? (lang === 'bm' ? 'Bercakap sekarang…' : 'Speak now…')
                : t.typeMessage}
              className={`flex-1 border rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 transition-colors ${
                isListening
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-500/20'
                  : 'border-slate-200 focus:border-brand-500 focus:ring-brand-500/20'
              }`}
            />

            {/* Mic button (STT) */}
            {sttSupported && (
              <button
                onClick={toggleListening}
                title={lang === 'bm'
                  ? (isListening ? 'Berhenti mendengar' : 'Tekan untuk bercakap')
                  : (isListening ? 'Stop listening'     : 'Tap to speak')}
                className={`p-3 rounded-xl border transition-all ${
                  isListening
                    ? 'bg-red-500 border-red-500 text-white shadow-lg scale-105 animate-pulse'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-red-500 hover:border-red-200'
                }`}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            )}

            {/* Send button */}
            <button
              onClick={sendMessage}
              disabled={loading || (!input.trim() && !isListening)}
              className="p-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          {/* Helper text */}
          {sttSupported && !isListening && (
            <p className="text-xs text-slate-400 mt-2 text-center">
              {lang === 'bm'
                ? '🎤 Tekan butang mikrofon untuk bercakap — CareSphere AI faham Bahasa Malaysia'
                : '🎤 Tap the mic button to speak — supports English & Bahasa Malaysia'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
