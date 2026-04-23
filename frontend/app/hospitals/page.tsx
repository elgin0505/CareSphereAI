'use client';

import { useState, useEffect } from 'react';
import { MapPin, Phone, Clock, AlertCircle, ChevronDown, Building2, Ambulance } from 'lucide-react';
import { api, HospitalData, Patient } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

const CITY_COORDS: Record<string, [number, number]> = {
  'Kuala Lumpur': [3.1390, 101.6869],
  'Petaling Jaya': [3.1073, 101.6067],
  'Shah Alam': [3.0738, 101.5183],
  'Subang Jaya': [3.0497, 101.5851],
  'Klang': [3.0449, 101.4459],
  'Johor Bahru': [1.4927, 103.7414],
  'Ipoh': [4.5975, 101.0901],
  'Penang': [5.4141, 100.3288],
  'George Town': [5.4141, 100.3288],
  'Kota Bharu': [6.1248, 102.2381],
  'Kuching': [1.5533, 110.3592],
  'Kota Kinabalu': [5.9804, 116.0735],
  'Alor Setar': [6.1248, 100.3673],
  'Seremban': [2.7260, 101.9424],
  'Melaka': [2.1896, 102.2501],
  'Kuantan': [3.8077, 103.3260],
  'Putrajaya': [2.9264, 101.6964],
  'Cyberjaya': [2.9213, 101.6559],
  'Ampang': [3.1478, 101.7489],
  'Cheras': [3.0835, 101.7330],
};

export default function HospitalsPage() {
  const { t } = useLanguage();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [hospitalData, setHospitalData] = useState<HospitalData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getPatients().then((ps) => {
      setPatients(ps);
      if (ps.length > 0) {
        setSelectedPatientId(ps[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedPatientId) return;
    setLoading(true);
    api.getHospitals(selectedPatientId)
      .then(setHospitalData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedPatientId]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.hospitals}</h1>
          <p className="text-slate-500 mt-1 text-sm">Nearby Malaysian hospitals and emergency facilities</p>
        </div>
        <div className="relative">
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="appearance-none border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm text-slate-900 bg-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>{p.name} — {p.location.city}</option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : hospitalData ? (
        <>
          {/* Emergency Banner */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <Ambulance className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="font-semibold text-red-700">Emergency Contact: {hospitalData.emergencyContact}</p>
              <p className="text-sm text-red-600">
                Recommended: <span className="font-semibold">{hospitalData.recommendedHospital}</span> · Est. travel: {hospitalData.estimatedTravelTime}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Hospital List */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-teal-600" />
                Nearby Hospitals ({hospitalData.patientCity}, {hospitalData.patientState})
              </h2>
              {hospitalData.hospitals.map((hospital, idx) => (
                <div
                  key={hospital.id}
                  className={`bg-white rounded-xl border shadow-card p-4 transition-all hover:scale-[1.01] ${
                    idx === 0 ? 'border-teal-200' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {idx === 0 && (
                          <span className="text-xs bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full font-semibold">
                            Recommended
                          </span>
                        )}
                        <h3 className="font-semibold text-slate-900 text-sm">{hospital.name}</h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{hospital.address}, {hospital.city}</p>
                    </div>
                    {hospital.emergencyAvailable && (
                      <span className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full shrink-0">
                        24h A&E
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-teal-600" />
                      {hospital.distance}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-brand-500" />
                      {hospital.type}
                    </span>
                    <a href={`tel:${hospital.phone}`} className="flex items-center gap-1 text-teal-600 hover:text-teal-700 transition-colors ml-auto">
                      <Phone className="w-3 h-3" />
                      {hospital.phone}
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Map Panel */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-brand-500" />
                Hospital Map
              </h2>

              {/* OpenStreetMap iframe */}
              {(() => {
                const coords = CITY_COORDS[hospitalData.patientCity] || [3.1390, 101.6869];
                const [lat, lng] = coords;
                const delta = 0.05;
                const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
                const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
                return (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden" style={{ height: '420px' }}>
                    <iframe
                      src={osmUrl}
                      width="100%"
                      height="100%"
                      style={{ border: 'none', display: 'block' }}
                      title={`Map of ${hospitalData.patientCity}`}
                      loading="lazy"
                    />
                  </div>
                );
              })()}
              <a
                href={`https://www.openstreetmap.org/search?query=hospital+${encodeURIComponent(hospitalData.patientCity + ' Malaysia')}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium mt-2"
              >
                <MapPin className="w-3.5 h-3.5" /> Open full map →
              </a>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-amber-700 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  <p className="text-sm font-semibold">Emergency Protocol</p>
                </div>
                <ul className="text-xs text-amber-700/80 space-y-1">
                  <li>• Call <span className="text-red-700 font-semibold">999</span> for life-threatening emergencies</li>
                  <li>• Hospital emergency line: <span className="text-teal-700">{hospitalData.emergencyContact}</span></li>
                  <li>• Alert caregiver immediately before hospital transport</li>
                  <li>• Bring medication list to A&E department</li>
                  <li>• CareSphere AI has pre-prepared patient medical summary</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-slate-400">{t.noData}</div>
      )}
    </div>
  );
}
