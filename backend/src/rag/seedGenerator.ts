/**
 * CareSphere AI — Malaysian Patient Data Generator
 * Generates realistic elderly Malaysian patients based on:
 * - National Health & Morbidity Survey (NHMS) 2019 statistics
 * - MOH Malaysia Clinical Practice Guidelines
 * - Malaysian demographic distribution
 */

import { Patient } from '../types/health.types';

// ─── NAMES ────────────────────────────────────────────────────────────────────

const MALAY_MALE_FIRST = [
  'Ahmad', 'Muhammad', 'Mohd', 'Abdul', 'Hasrul', 'Azman', 'Zulkifli', 'Kamaruddin',
  'Roslan', 'Hisham', 'Johari', 'Nordin', 'Salleh', 'Wahab', 'Yusof', 'Zainal',
  'Fadzillah', 'Hairul', 'Razali', 'Shamsul', 'Ruslam', 'Baharuddin', 'Ghazali',
  'Hamid', 'Idris', 'Jalil', 'Kassim', 'Latif', 'Mazlan', 'Nadzri', 'Omar',
  'Pahmi', 'Rashid', 'Sabri', 'Talib', 'Uthman', 'Yahya', 'Zaki', 'Ariffin',
];

const MALAY_FEMALE_FIRST = [
  'Siti', 'Nor', 'Noor', 'Noraini', 'Faridah', 'Zainab', 'Halimah', 'Rohani',
  'Ramlah', 'Fatimah', 'Hasnah', 'Maimunah', 'Rokiah', 'Salamah', 'Asmah',
  'Hamidah', 'Kalsom', 'Mariam', 'Nabilah', 'Paridah', 'Rahimah', 'Sabariah',
  'Timah', 'Umi', 'Wardah', 'Zabedah', 'Aisha', 'Balqis', 'Che Minah', 'Darus',
];

const MALAY_LAST = [
  'bin Razali', 'bin Ahmad', 'bin Hassan', 'bin Ibrahim', 'bin Ismail', 'bin Kassim',
  'bin Latif', 'bin Mansor', 'bin Nawi', 'bin Osman', 'bin Puteh', 'bin Rahim',
  'bin Saad', 'bin Taib', 'bin Ujang', 'bin Wahab', 'bin Yahya', 'bin Zainudin',
  'binti Abdullah', 'binti Ahmad', 'binti Hassan', 'binti Ibrahim', 'binti Ismail',
  'binti Kassim', 'binti Latif', 'binti Mansor', 'binti Nawi', 'binti Osman',
  'binti Rahim', 'binti Saad', 'binti Taib', 'binti Wahab', 'binti Yahya',
];

const CHINESE_MALE_FIRST = [
  'Ah Kow', 'Ah Seng', 'Boon', 'Chee Keong', 'Eng Huat', 'Fong', 'Guan', 'Hock',
  'Ing', 'Jin', 'Kok', 'Liang', 'Meng', 'Nam', 'Peng', 'Qiang', 'Rong', 'Siew',
  'Teck', 'Uan', 'Voon', 'Wei', 'Xin', 'Yew', 'Zhen', 'Ah Chong', 'Beng',
  'Chun', 'Dah', 'Fui', 'Ghee', 'Hon', 'Ing Huat', 'Kah', 'Loh',
];

const CHINESE_FEMALE_FIRST = [
  'Ah Mui', 'Bee', 'Chui', 'Ding', 'Eng', 'Fong', 'Geok', 'Huey', 'Ing', 'Joo',
  'Kim', 'Lan', 'Mooi', 'Nee', 'Ong', 'Poh', 'Quek', 'Rose', 'Siok', 'Tin',
  'Uma', 'Viv', 'Wai', 'Xiu', 'Yen', 'Zhu', 'Ai Lian', 'Beng Choo', 'Chai',
  'May', 'Li Hua', 'Mei Lin', 'Siew Ling', 'Ah Lian',
];

const CHINESE_LAST = [
  'Lim', 'Tan', 'Wong', 'Chen', 'Lee', 'Ng', 'Koh', 'Goh', 'Teo', 'Cheah',
  'Yap', 'Chong', 'Foo', 'Ho', 'Leong', 'Low', 'Ooi', 'Ong', 'Pang', 'Quek',
  'Sim', 'Teoh', 'Wee', 'Yeoh', 'Zhu', 'Chua', 'Heng', 'Khoo', 'Lau', 'Mah',
];

const INDIAN_MALE_FIRST = [
  'Muthu', 'Rajan', 'Kumar', 'Gopal', 'Arumugam', 'Vellu', 'Selvam', 'Krishnan',
  'Samy', 'Pillai', 'Subramaniam', 'Balasubramaniam', 'Kannan', 'Murugan',
  'Nair', 'Pandian', 'Rajendran', 'Shanmugam', 'Thurai', 'Vengadesan',
  'Annamalai', 'Chelladurai', 'Durai', 'Eswaran', 'Ganesan', 'Haridas',
];

const INDIAN_FEMALE_FIRST = [
  'Meenakshi', 'Lakshmi', 'Devi', 'Rani', 'Kamala', 'Saraswathi', 'Vasantha',
  'Malathi', 'Nirmala', 'Padmavathi', 'Rajeshwari', 'Seetha', 'Thilaka',
  'Uma', 'Vimala', 'Ambika', 'Bharathi', 'Chandra', 'Durga', 'Gayathri',
];

const INDIAN_LAST = [
  'a/l Krishnan', 'a/l Muthu', 'a/l Rajan', 'a/l Subramaniam', 'a/l Gopal',
  'a/l Pillai', 'a/l Samy', 'a/l Arumugam', 'a/l Selvam', 'a/l Vellu',
  'a/p Krishnan', 'a/p Muthu', 'a/p Rajan', 'a/p Subramaniam', 'a/p Gopal',
  'a/p Pillai', 'a/p Samy', 'a/p Arumugam', 'a/p Selvam', 'a/p Vellu',
];

const IBAN_MALE = [
  'Awang', 'Bujang', 'Dayung', 'Empaling', 'Francis', 'Gumbang', 'Hilary',
  'Igat', 'John', 'Kendawang', 'Lawrence', 'Malang', 'Nuing', 'Oya',
];

const IBAN_FEMALE = [
  'Dayang', 'Empiang', 'Fatimah', 'Gundi', 'Intan', 'Juah', 'Kimah',
  'Linggi', 'Mandok', 'Nyipa', 'Oyah', 'Puah', 'Rayang', 'Siah',
];

const IBAN_LAST = [
  'anak Bujang', 'anak Awang', 'anak Empaling', 'anak Francis', 'anak Gumbang',
  'anak Hilary', 'anak Igat', 'anak John', 'anak Kendawang', 'anak Lawrence',
];

// ─── LOCATIONS ────────────────────────────────────────────────────────────────

const LOCATIONS = [
  // High population — weighted more
  { city: 'Kuala Lumpur', state: 'Wilayah Persekutuan', lat: 3.1390, lng: 101.6869, weight: 10 },
  { city: 'Petaling Jaya', state: 'Selangor', lat: 3.1073, lng: 101.6067, weight: 8 },
  { city: 'Shah Alam', state: 'Selangor', lat: 3.0733, lng: 101.5185, weight: 7 },
  { city: 'Klang', state: 'Selangor', lat: 3.0449, lng: 101.4453, weight: 6 },
  { city: 'Subang Jaya', state: 'Selangor', lat: 3.0565, lng: 101.5850, weight: 6 },
  { city: 'Johor Bahru', state: 'Johor', lat: 1.4927, lng: 103.7414, weight: 8 },
  { city: 'Skudai', state: 'Johor', lat: 1.5321, lng: 103.6752, weight: 4 },
  { city: 'Batu Pahat', state: 'Johor', lat: 1.8567, lng: 102.9316, weight: 3 },
  { city: 'George Town', state: 'Pulau Pinang', lat: 5.4141, lng: 100.3288, weight: 6 },
  { city: 'Butterworth', state: 'Pulau Pinang', lat: 5.3992, lng: 100.3627, weight: 4 },
  { city: 'Ipoh', state: 'Perak', lat: 4.5975, lng: 101.0901, weight: 6 },
  { city: 'Taiping', state: 'Perak', lat: 4.8563, lng: 100.7373, weight: 3 },
  { city: 'Kota Kinabalu', state: 'Sabah', lat: 5.9804, lng: 116.0735, weight: 6 },
  { city: 'Sandakan', state: 'Sabah', lat: 5.8402, lng: 118.1179, weight: 3 },
  { city: 'Tawau', state: 'Sabah', lat: 4.2448, lng: 117.8915, weight: 3 },
  { city: 'Kuching', state: 'Sarawak', lat: 1.5497, lng: 110.3592, weight: 5 },
  { city: 'Miri', state: 'Sarawak', lat: 4.3995, lng: 113.9914, weight: 3 },
  { city: 'Sibu', state: 'Sarawak', lat: 2.3062, lng: 111.8175, weight: 3 },
  { city: 'Kuantan', state: 'Pahang', lat: 3.8077, lng: 103.3260, weight: 4 },
  { city: 'Alor Setar', state: 'Kedah', lat: 6.1248, lng: 100.3674, weight: 4 },
  { city: 'Kota Bharu', state: 'Kelantan', lat: 6.1254, lng: 102.2381, weight: 4 },
  { city: 'Kuala Terengganu', state: 'Terengganu', lat: 5.3296, lng: 103.1370, weight: 3 },
  { city: 'Seremban', state: 'Negeri Sembilan', lat: 2.7297, lng: 101.9381, weight: 3 },
  { city: 'Melaka', state: 'Melaka', lat: 2.1896, lng: 102.2501, weight: 3 },
  { city: 'Kangar', state: 'Perlis', lat: 6.4429, lng: 100.1986, weight: 1 },
  { city: 'Putrajaya', state: 'Wilayah Persekutuan', lat: 2.9264, lng: 101.6964, weight: 2 },
];

// ─── CONDITIONS (NHMS 2019 prevalence-weighted) ───────────────────────────────

const CONDITION_POOLS = [
  { condition: 'Hypertension', weight: 54 },
  { condition: 'Hypercholesterolaemia', weight: 47 },
  { condition: 'Type 2 Diabetes', weight: 20 },
  { condition: 'Osteoarthritis', weight: 18 },
  { condition: 'Ischaemic Heart Disease', weight: 12 },
  { condition: 'Osteoporosis', weight: 10 },
  { condition: 'COPD', weight: 8 },
  { condition: 'Depression', weight: 8 },
  { condition: 'Chronic Kidney Disease', weight: 6 },
  { condition: 'Atrial Fibrillation', weight: 4 },
  { condition: 'Heart Failure', weight: 4 },
  { condition: 'Cognitive Decline', weight: 7 },
  { condition: 'Stroke (history)', weight: 5 },
  { condition: 'Asthma', weight: 6 },
  { condition: 'Gout', weight: 9 },
  { condition: 'Mild Anaemia', weight: 8 },
  { condition: 'Peripheral Artery Disease', weight: 3 },
  { condition: 'Glaucoma', weight: 5 },
  { condition: 'Hypothyroidism', weight: 4 },
  { condition: 'Benign Prostatic Hyperplasia', weight: 10 }, // male-only
];

// Medications matched to conditions (real Malaysian formulary drugs)
const CONDITION_MEDS: Record<string, string[]> = {
  'Hypertension': ['Amlodipine 5mg', 'Enalapril 10mg', 'Losartan 50mg', 'Metoprolol 50mg', 'Hydrochlorothiazide 25mg'],
  'Hypercholesterolaemia': ['Atorvastatin 20mg', 'Simvastatin 20mg', 'Rosuvastatin 10mg'],
  'Type 2 Diabetes': ['Metformin 500mg', 'Glibenclamide 5mg', 'Sitagliptin 100mg', 'Insulin Glargine 20 units'],
  'Osteoarthritis': ['Celecoxib 200mg', 'Diclofenac 50mg', 'Paracetamol 500mg', 'Glucosamine 500mg'],
  'Ischaemic Heart Disease': ['Aspirin 100mg', 'Clopidogrel 75mg', 'Atorvastatin 40mg', 'Bisoprolol 5mg'],
  'Osteoporosis': ['Calcium Carbonate 500mg', 'Vitamin D3 1000IU', 'Alendronate 70mg weekly'],
  'COPD': ['Salbutamol inhaler 100mcg', 'Tiotropium inhaler 18mcg', 'Prednisolone 5mg'],
  'Depression': ['Sertraline 50mg', 'Escitalopram 10mg', 'Mirtazapine 15mg'],
  'Chronic Kidney Disease': ['Calcium Carbonate 500mg', 'Erythropoietin 4000IU', 'Ferrous Fumarate 200mg'],
  'Atrial Fibrillation': ['Warfarin 3mg', 'Digoxin 0.25mg', 'Bisoprolol 5mg'],
  'Heart Failure': ['Furosemide 40mg', 'Spironolactone 25mg', 'Carvedilol 6.25mg'],
  'Cognitive Decline': ['Donepezil 5mg', 'Rivastigmine 6mg', 'Memantine 10mg'],
  'Stroke (history)': ['Aspirin 100mg', 'Clopidogrel 75mg', 'Atorvastatin 40mg'],
  'Asthma': ['Salbutamol inhaler 100mcg', 'Budesonide inhaler 200mcg', 'Montelukast 10mg'],
  'Gout': ['Allopurinol 100mg', 'Colchicine 0.5mg', 'Febuxostat 80mg'],
  'Mild Anaemia': ['Ferrous Fumarate 200mg', 'Folic Acid 5mg', 'Vitamin B12 1000mcg'],
  'Hypothyroidism': ['Levothyroxine 50mcg', 'Levothyroxine 100mcg'],
  'Glaucoma': ['Timolol eye drops 0.5%', 'Latanoprost eye drops 0.005%'],
  'Benign Prostatic Hyperplasia': ['Tamsulosin 0.4mg', 'Finasteride 5mg'],
  'Peripheral Artery Disease': ['Aspirin 100mg', 'Clopidogrel 75mg', 'Cilostazol 100mg'],
};

// ─── ADDRESSES ────────────────────────────────────────────────────────────────

const STREET_TYPES = ['Jalan', 'Lorong', 'Taman', 'Persiaran', 'Lebuh', 'Jalan'];
const STREET_NAMES = [
  'Mawar', 'Melati', 'Kenanga', 'Cempaka', 'Dahlia', 'Merbah', 'Wangsa', 'Damai',
  'Bahagia', 'Maju', 'Indah', 'Murni', 'Harmoni', 'Sejahtera', 'Perdana',
  'Utama', 'Setia', 'Mulia', 'Aman', 'Bestari', 'Cemerlang', 'Gemilang',
  'Sri', 'Baru', 'Lama', 'Besar', 'Kecil', 'Tengah', 'Selatan', 'Utara',
];

// ─── CAREGIVER NAMES ──────────────────────────────────────────────────────────

const CAREGIVER_RELATIONSHIPS = ['Son', 'Daughter', 'Spouse', 'Sibling', 'Grandchild'];
const CAREGIVER_MALAY_NAMES = [
  'Ahmad Fariz', 'Siti Nabilah', 'Muhammad Haziq', 'Nur Amalina', 'Abdul Rahim',
  'Farah Nadia', 'Zulhilmi', 'Anis Syahira', 'Hafizuddin', 'Nurul Izzah',
];
const CAREGIVER_CHINESE_NAMES = [
  'Wei Ming', 'Mei Ling', 'Jia Hao', 'Xiu Ying', 'Zhi Wei', 'Li Na', 'Jun Hao',
  'Shu Fen', 'Kai Xuan', 'Hui Min',
];
const CAREGIVER_INDIAN_NAMES = [
  'Priya', 'Suresh', 'Kavitha', 'Rajesh', 'Anitha', 'Vikram', 'Deepa', 'Arun',
  'Shanthi', 'Prakash',
];

// ─── UTILITIES ────────────────────────────────────────────────────────────────

function rng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return Math.abs(s) / 0x80000000;
  };
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

function weightedPick<T extends { weight: number }>(items: T[], rand: () => number): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rand() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

function generatePhone(rand: () => number): string {
  const prefix = pick(['011', '012', '013', '014', '016', '017', '018', '019'], rand);
  const num = Math.floor(rand() * 90000000 + 10000000);
  return `+60${prefix.slice(1)}-${String(num).slice(0, 4)} ${String(num).slice(4)}`;
}

// ─── MAIN GENERATOR ───────────────────────────────────────────────────────────

export interface GeneratedPatient {
  patient: Patient;
  vitalProfile: {
    baseHR: number;
    baseSystolic: number;
    baseDiastolic: number;
    baseSleep: number;
    baseMovement: number;
    baseO2: number;
    baseGlucose?: number;
    baseTemp: number;
  };
}

export function generateMalaysianPatients(count: number, startIndex = 5): GeneratedPatient[] {
  const results: GeneratedPatient[] = [];

  for (let i = 0; i < count; i++) {
    const rand = rng(i * 7919 + startIndex * 31337); // deterministic per index

    // Ethnicity distribution: Malay 55%, Chinese 25%, Indian 10%, Indigenous 10%
    const ethnicRoll = rand();
    const ethnicity = ethnicRoll < 0.55 ? 'malay' : ethnicRoll < 0.80 ? 'chinese' : ethnicRoll < 0.90 ? 'indian' : 'indigenous';

    // Gender
    const isMale = rand() < 0.48;

    // Age 60–90 (weighted toward 65–78)
    const age = Math.round(60 + rand() * rand() * 30 + 2);

    // Generate name
    let firstName: string;
    let lastName: string;

    if (ethnicity === 'malay') {
      firstName = isMale ? pick(MALAY_MALE_FIRST, rand) : pick(MALAY_FEMALE_FIRST, rand);
      // For BM names, bin/binti must match gender
      const lastOptions = MALAY_LAST.filter((l) =>
        isMale ? l.startsWith('bin ') : l.startsWith('binti ')
      );
      lastName = pick(lastOptions, rand);
    } else if (ethnicity === 'chinese') {
      firstName = isMale ? pick(CHINESE_MALE_FIRST, rand) : pick(CHINESE_FEMALE_FIRST, rand);
      lastName = pick(CHINESE_LAST, rand);
      // Chinese: Surname First
      [firstName, lastName] = [`${lastName} ${firstName}`, ''];
    } else if (ethnicity === 'indian') {
      firstName = isMale ? pick(INDIAN_MALE_FIRST, rand) : pick(INDIAN_FEMALE_FIRST, rand);
      const lastOptions = INDIAN_LAST.filter((l) =>
        isMale ? l.startsWith('a/l') : l.startsWith('a/p')
      );
      lastName = pick(lastOptions, rand);
    } else {
      firstName = isMale ? pick(IBAN_MALE, rand) : pick(IBAN_FEMALE, rand);
      lastName = pick(IBAN_LAST, rand);
    }

    const name = lastName ? `${firstName} ${lastName}` : firstName;

    // Location (weighted by population)
    const location = weightedPick(LOCATIONS, rand);
    const streetNum = Math.floor(rand() * 150 + 1);
    const streetType = pick(STREET_TYPES, rand);
    const streetName = pick(STREET_NAMES, rand);
    const address = `No. ${streetNum}, ${streetType} ${streetName}`;

    // Conditions (2–4 conditions based on age/ethnicity)
    const numConditions = age > 75 ? 3 + Math.floor(rand() * 2) : 2 + Math.floor(rand() * 2);
    const selectedConditions: string[] = [];
    const conditionPool = [...CONDITION_POOLS].filter((c) =>
      c.condition !== 'Benign Prostatic Hyperplasia' || isMale
    );

    for (let c = 0; c < numConditions && c < conditionPool.length; c++) {
      let attempts = 0;
      while (attempts < 20) {
        const cond = weightedPick(conditionPool, rand);
        if (!selectedConditions.includes(cond.condition)) {
          selectedConditions.push(cond.condition);
          break;
        }
        attempts++;
      }
    }

    // Medications from conditions
    const selectedMeds: string[] = [];
    for (const cond of selectedConditions) {
      const meds = CONDITION_MEDS[cond] || [];
      if (meds.length > 0) {
        const med = pick(meds, rand);
        if (!selectedMeds.includes(med)) selectedMeds.push(med);
      }
    }

    // Caregiver
    let caregiverName: string;
    if (ethnicity === 'malay') caregiverName = pick(CAREGIVER_MALAY_NAMES, rand);
    else if (ethnicity === 'chinese') caregiverName = pick(CAREGIVER_CHINESE_NAMES, rand);
    else caregiverName = pick(CAREGIVER_INDIAN_NAMES, rand);

    const relationship = pick(CAREGIVER_RELATIONSHIPS, rand);
    const caregiverPhone = generatePhone(rand);

    // Vital profile based on conditions
    const hasHypertension = selectedConditions.some((c) => c.includes('Hypertension'));
    const hasDiabetes = selectedConditions.includes('Type 2 Diabetes');
    const hasCOPD = selectedConditions.includes('COPD');
    const hasHeart = selectedConditions.some((c) => c.includes('Heart') || c.includes('Atrial'));
    const hasCognitive = selectedConditions.includes('Cognitive Decline');

    const baseHR = hasHeart ? 85 + Math.floor(rand() * 20) : 68 + Math.floor(rand() * 18);
    const baseSystolic = hasHypertension
      ? 148 + Math.floor(rand() * 22)
      : 118 + Math.floor(rand() * 18);
    const baseDiastolic = hasHypertension
      ? 90 + Math.floor(rand() * 12)
      : 76 + Math.floor(rand() * 10);
    const baseSleep = hasCognitive ? 4.5 + rand() * 2 : 5.5 + rand() * 2.5;
    const baseMovement = hasCOPD || age > 80 ? 18 + rand() * 20 : 35 + rand() * 35;
    const baseO2 = hasCOPD ? 91 + rand() * 4 : 95 + rand() * 4;
    const baseGlucose = hasDiabetes ? 8.5 + rand() * 5 : undefined;
    const baseTemp = 36.2 + rand() * 0.9;

    const patient: Patient = {
      id: `patient-${String(startIndex + i).padStart(4, '0')}`,
      name,
      age,
      gender: isMale ? 'male' : 'female',
      conditions: selectedConditions,
      medications: selectedMeds,
      caregiver: {
        name: caregiverName,
        phone: caregiverPhone,
        email: `caregiver.${startIndex + i}@email.com`,
        relationship,
      },
      location: {
        address,
        city: location.city,
        state: location.state,
        lat: location.lat + (rand() * 0.1 - 0.05),
        lng: location.lng + (rand() * 0.1 - 0.05),
      },
      createdAt: new Date().toISOString(),
    };

    results.push({
      patient,
      vitalProfile: {
        baseHR, baseSystolic, baseDiastolic,
        baseSleep, baseMovement, baseO2, baseGlucose, baseTemp,
      },
    });
  }

  return results;
}
