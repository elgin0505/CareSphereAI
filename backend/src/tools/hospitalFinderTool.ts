/**
 * Hospital Finder Tool
 * Real Malaysian government hospitals, specialist centres & Klinik Kesihatan
 */

import { z } from 'zod';
import { Hospital } from '../types/health.types';
import { healthMemory } from '../rag/healthMemoryService';

export const hospitalFinderInputSchema = z.object({
  patientId: z.string().describe('The patient ID to find hospitals near their location'),
  urgency: z.enum(['low', 'medium', 'high']).describe('Urgency level affecting hospital type preference'),
});

export const hospitalFinderOutputSchema = z.object({
  success: z.boolean(),
  hospitals: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      address: z.string(),
      city: z.string(),
      phone: z.string(),
      distance: z.string(),
      type: z.string(),
      emergencyAvailable: z.boolean(),
    })
  ),
  recommendedHospital: z.string(),
  estimatedTravelTime: z.string(),
  emergencyContact: z.string(),
});

export type HospitalFinderInput = z.infer<typeof hospitalFinderInputSchema>;
export type HospitalFinderOutput = z.infer<typeof hospitalFinderOutputSchema>;

const MALAYSIAN_HOSPITALS: Record<string, Hospital[]> = {
  'Wilayah Persekutuan': [
    { id: 'hkl', name: 'Hospital Kuala Lumpur (HKL)', address: 'Jalan Pahang, 50586 Kuala Lumpur', city: 'Kuala Lumpur', phone: '03-2615 5555', distance: '3.2 km', type: 'Government Hospital', emergencyAvailable: true },
    { id: 'hukm', name: 'Hospital Universiti Kebangsaan Malaysia (HUKM)', address: 'Jalan Yaacob Latiff, Bandar Tun Razak, 56000 Kuala Lumpur', city: 'Kuala Lumpur', phone: '03-9145 6000', distance: '6.1 km', type: 'University Hospital', emergencyAvailable: true },
    { id: 'ppum', name: 'Pusat Perubatan Universiti Malaya (PPUM)', address: 'Lembah Pantai, 59100 Kuala Lumpur', city: 'Kuala Lumpur', phone: '03-7949 2222', distance: '8.4 km', type: 'University Hospital', emergencyAvailable: true },
    { id: 'hpkl', name: 'Pantai Hospital Kuala Lumpur', address: 'Jalan Bukit Pantai, Bangsar, 59100 Kuala Lumpur', city: 'Kuala Lumpur', phone: '03-2296 0888', distance: '9.0 km', type: 'Private Hospital', emergencyAvailable: true },
    { id: 'kk-chow-kit', name: 'Klinik Kesihatan Chow Kit', address: 'Jalan Pahang Barat, Chow Kit, 50350 Kuala Lumpur', city: 'Kuala Lumpur', phone: '03-4042 5351', distance: '2.0 km', type: 'Klinik Kesihatan', emergencyAvailable: false },
    { id: 'kk-wangsa-maju', name: 'Klinik Kesihatan Wangsa Maju', address: 'Seksyen 1, Wangsa Maju, 53300 Kuala Lumpur', city: 'Kuala Lumpur', phone: '03-4142 4798', distance: '4.5 km', type: 'Klinik Kesihatan', emergencyAvailable: false },
  ],

  'Selangor': [
    { id: 'hsa', name: 'Hospital Shah Alam', address: 'Jalan Indah 7/5, Seksyen 7, 40000 Shah Alam', city: 'Shah Alam', phone: '03-5544 2000', distance: '4.1 km', type: 'Government Hospital', emergencyAvailable: true },
    { id: 'hsb', name: 'Hospital Sungai Buloh', address: 'Jalan Hospital, 47000 Sungai Buloh', city: 'Sungai Buloh', phone: '03-6145 0000', distance: '12.3 km', type: 'Government Hospital', emergencyAvailable: true },
    { id: 'hamp', name: 'Hospital Ampang', address: 'Jalan Mewah Utama, Pandan Mewah, 68000 Ampang', city: 'Ampang', phone: '03-4289 4000', distance: '7.2 km', type: 'Government Hospital', emergencyAvailable: true },
    { id: 'sunway', name: 'Sunway Medical Centre', address: 'No 5, Jalan Lagoon Selatan, Sunway, 47500 Subang Jaya', city: 'Subang Jaya', phone: '03-7491 9191', distance: '15.0 km', type: 'Private Hospital', emergencyAvailable: true },
    { id: 'kk-petaling', name: 'Klinik Kesihatan Petaling', address: 'Jalan 222, Seksyen 51A, 46100 Petaling Jaya', city: 'Petaling Jaya', phone: '03-7956 4800', distance: '5.6 km', type: 'Klinik Kesihatan', emergencyAvailable: false },
    { id: 'kk-klang', name: 'Klinik Kesihatan Klang', address: 'Jalan Besar, 41000 Klang', city: 'Klang', phone: '03-3371 2750', distance: '18.0 km', type: 'Klinik Kesihatan', emergencyAvailable: false },
  ],

  'Johor': [
    { id: 'hsa-jb', name: 'Hospital Sultanah Aminah Johor Bahru', address: 'Jalan Persiaran Abu Bakar Sultan, 80100 Johor Bahru', city: 'Johor Bahru', phone: '07-225 8000', distance: '2.3 km', type: 'Government Hospital', emergencyAvailable: true },
    { id: 'htmj', name: 'Hospital Temenggong Syed Harun, Mersing', address: 'Jalan Dato Mansor, 86800 Mersing', city: 'Mersing', phone: '07-799 1333', distance: '35.0 km', type: 'Government Hospital', emergencyAvailable: true },
    { id: 'kpj-jb', name: 'KPJ Johor Specialist Hospital', address: 'No. 39-B, Jalan Abdul Samad, 80100 Johor Bahru', city: 'Johor Bahru', phone: '07-225 3000', distance: '3.1 km', type: 'Specialist Hospital', emergencyAvailable: true },
    { id: 'utm-kk', name: 'Klinik Kesihatan Skudai', address: 'Jalan Pendidikan, UTM Skudai, 81310 Johor', city: 'Skudai', phone: '07-520 1352', distance: '1.2 km', type: 'Klinik Kesihatan', emergencyAvailable: false },
    { id: 'kk-jb', name: 'Klinik Kesihatan Johor Bahru', address: 'Jalan Ayer Molek, 80300 Johor Bahru', city: 'Johor Bahru', phone: '07-227 3333', distance: '0.8 km', type: 'Klinik Kesihatan', emergencyAvailable: false },
    { id: 'hpj', name: 'Hospital Pakar Sultanah Fatimah, Muar', address: 'Jalan Salleh, 84000 Muar', city: 'Muar', phone: '06-952 3333', distance: '80.0 km', type: 'Specialist Hospital', emergencyAvailable: true },
  ],

  'Pulau Pinang': [
    { id: 'hpp', name: 'Hospital Pulau Pinang', address: 'Jalan Residensi, 10990 George Town', city: 'George Town', phone: '04-222 5333', distance: '1.5 km', type: 'Government Hospital', emergencyAvailable: true },
    { id: 'glen-pg', name: 'Gleneagles Penang', address: 'No 1 Jalan Pangkor, 10050 George Town', city: 'George Town', phone: '04-222 9111', distance: '2.8 km', type: 'Private Hospital', emergencyAvailable: true },
    { id: 'lgl', name: 'Loh Guan Lye Specialist Centre', address: '238 Jalan Macalister, 10400 George Town', city: 'George Town', phone: '04-238 8888', distance: '3.2 km', type: 'Specialist Hospital', emergencyAvailable: true },
    { id: 'kk-pg', name: 'Klinik Kesihatan Seberang Jaya', address: 'Jalan Pelangi, 13700 Prai', city: 'Seberang Perai', phone: '04-397 4878', distance: '6.0 km', type: 'Klinik Kesihatan', emergencyAvailable: false },
  ],

  'Perak': [
    { id: 'hrpz', name: 'Hospital Raja Permaisuri Bainun Ipoh', address: 'Jalan Raja Ashman Shah, 30450 Ipoh', city: 'Ipoh', phone: '05-208 5000', distance: '3.0 km', type: 'Government Hospital', emergencyAvailable: true },
    { id: 'kk-ipoh', name: 'Klinik Kesihatan Ipoh Timur', address: 'Jalan Pasir Puteh, 31400 Ipoh', city: 'Ipoh', phone: '05-525 9800', distance: '4.2 km', type: 'Klinik Kesihatan', emergencyAvailable: false },
  ],

  'Negeri Sembilan': [
    { id: 'hns', name: 'Hospital Tuanku Ja\'afar Seremban', address: 'Jalan Rasah, 70300 Seremban', city: 'Seremban', phone: '06-768 2000', distance: '2.5 km', type: 'Government Hospital', emergencyAvailable: true },
    { id: 'kk-srbn', name: 'Klinik Kesihatan Rasah', address: 'Jalan Rasah, 70300 Seremban', city: 'Seremban', phone: '06-764 1633', distance: '1.8 km', type: 'Klinik Kesihatan', emergencyAvailable: false },
  ],

  'Melaka': [
    { id: 'htam', name: 'Hospital Melaka', address: 'Jalan Mufti Haji Khalil, 75400 Melaka', city: 'Melaka', phone: '06-289 2344', distance: '3.0 km', type: 'Government Hospital', emergencyAvailable: true },
    { id: 'kk-mlk', name: 'Klinik Kesihatan Bandaraya Melaka', address: 'Jalan Semabok, 75050 Melaka', city: 'Melaka', phone: '06-282 7895', distance: '2.1 km', type: 'Klinik Kesihatan', emergencyAvailable: false },
  ],

  'Kelantan': [
    { id: 'husm', name: 'Hospital Universiti Sains Malaysia (HUSM)', address: 'Jalan Raja Perempuan Zainab II, 16150 Kubang Kerian', city: 'Kota Bharu', phone: '09-767 2000', distance: '5.0 km', type: 'University Hospital', emergencyAvailable: true },
    { id: 'hrpzii', name: 'Hospital Raja Perempuan Zainab II', address: 'Jalan Hospital, 15586 Kota Bharu', city: 'Kota Bharu', phone: '09-748 5000', distance: '2.0 km', type: 'Government Hospital', emergencyAvailable: true },
  ],

  'Sabah': [
    { id: 'hqe', name: 'Hospital Queen Elizabeth II', address: 'Lorong Bersatu, 88300 Kota Kinabalu', city: 'Kota Kinabalu', phone: '088-517 555', distance: '4.0 km', type: 'Government Hospital', emergencyAvailable: true },
    { id: 'kk-kk', name: 'Klinik Kesihatan Luyang', address: 'Jalan Luyang, 88300 Kota Kinabalu', city: 'Kota Kinabalu', phone: '088-233 400', distance: '2.5 km', type: 'Klinik Kesihatan', emergencyAvailable: false },
  ],

  'Sarawak': [
    { id: 'hsr', name: 'Hospital Sarawak (Hospital Umum Sarawak)', address: 'Jalan Hospital, 93586 Kuching', city: 'Kuching', phone: '082-276 666', distance: '3.5 km', type: 'Government Hospital', emergencyAvailable: true },
    { id: 'kk-kch', name: 'Klinik Kesihatan Kota Samarahan', address: 'Jalan Datuk Mohammad Musa, 94300 Kota Samarahan', city: 'Kota Samarahan', phone: '082-665 300', distance: '5.0 km', type: 'Klinik Kesihatan', emergencyAvailable: false },
  ],
};

export async function findNearbyHospitals(input: HospitalFinderInput): Promise<HospitalFinderOutput> {
  const patient = healthMemory.getPatient(input.patientId);
  if (!patient) {
    return {
      success: false,
      hospitals: [],
      recommendedHospital: 'Hospital Kuala Lumpur (HKL)',
      estimatedTravelTime: 'Unknown',
      emergencyContact: '999',
    };
  }

  // Match by state, fall back to KL
  const stateHospitals =
    MALAYSIAN_HOSPITALS[patient.location.state] ||
    MALAYSIAN_HOSPITALS['Wilayah Persekutuan'];

  // For high urgency: emergency hospitals first; for low: include clinics
  const filtered =
    input.urgency === 'high'
      ? stateHospitals.filter((h) => h.emergencyAvailable)
      : stateHospitals;

  // Sort: government first, then specialist, then private, then clinics
  const sorted = filtered.sort((a, b) => {
    const priority = (t: string) =>
      t.includes('Government') || t.includes('University') ? 0 :
      t.includes('Specialist') ? 1 :
      t.includes('Private') ? 2 : 3;
    return priority(a.type) - priority(b.type);
  });

  const recommended = sorted[0];
  const travelMin = Math.floor(Math.random() * 8) + 5;
  const travelMax = travelMin + Math.floor(Math.random() * 10) + 5;

  return {
    success: true,
    hospitals: sorted.slice(0, 4),
    recommendedHospital: recommended?.name || 'Hospital Kuala Lumpur (HKL)',
    estimatedTravelTime: `${travelMin}–${travelMax} minit / ${travelMin}–${travelMax} minutes`,
    emergencyContact: `999 (Kecemasan) | ${recommended?.phone || '03-2615 5555'} (${recommended?.name || 'HKL'})`,
  };
}
