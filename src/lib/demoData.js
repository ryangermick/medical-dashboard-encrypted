// Demo data for Joe Stevens - populates Supabase with encrypted test data
import * as db from './db'

const months = ['Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb']
const monthsFull = ['2025-03','2025-04','2025-05','2025-06','2025-07','2025-08','2025-09','2025-10','2025-11','2025-12','2026-01','2026-02']

export async function loadDemoData(userId, passphrase, onProgress) {
  const report = (msg) => onProgress && onProgress(msg)

  // Clear existing
  report('Clearing existing data...')
  await db.clearAllUserData(userId)

  // 1. Patient
  report('Creating patient profile...')
  await db.upsertPatient(userId, {
    name: 'Joe Stevens',
    age: 45,
    dob: '1980-08-14',
    sex: 'Male',
    height: "6'0\"",
    weight: '195 lbs',
    bmi: 26.4,
    blood_type: 'O+',
    member_id: 'MED-2026-04819',
    last_visit: '2026-02-18',
    next_checkup: '2026-08-18',
    primary_physician: 'Dr. Sarah Chen',
    insurance: 'Blue Shield PPO',
    emergency_contact: JSON.stringify({ name: 'Linda Stevens', relationship: 'Spouse', phone: '(555) 234-5678' }),
  }, passphrase)

  // 2. Vitals — 12 months of history
  report('Generating 12 months of vitals...')
  const vitals = []
  const hrTrend = [72, 70, 68, 71, 69, 68, 67, 70, 68, 66, 69, 68]
  const sysTrend = [128, 126, 125, 124, 123, 122, 124, 123, 122, 120, 121, 122]
  const diaTrend = [82, 81, 80, 80, 79, 78, 79, 78, 78, 77, 78, 78]
  const tempTrend = [98.6, 98.4, 98.5, 98.3, 98.4, 98.5, 98.4, 98.6, 98.4, 98.3, 98.5, 98.4]
  const o2Trend = [97, 98, 97, 98, 99, 98, 98, 97, 98, 98, 99, 98]
  const respTrend = [16, 15, 16, 16, 15, 16, 17, 16, 15, 16, 16, 16]
  const restHrTrend = [66, 65, 64, 63, 63, 62, 63, 62, 61, 62, 63, 62]
  const weightTrend = [200, 199, 198, 198, 197, 196, 197, 196, 196, 195, 195, 195]

  for (let i = 0; i < 12; i++) {
    const date = `${monthsFull[i]}-15`
    vitals.push(
      { vital_type: 'heart_rate', value: JSON.stringify({ avg: hrTrend[i], min: hrTrend[i]-4, max: hrTrend[i]+6 }), unit: 'bpm', recorded_at: date, status: 'normal', reference_range: '60-100' },
      { vital_type: 'blood_pressure', value: JSON.stringify({ systolic: sysTrend[i], diastolic: diaTrend[i] }), unit: 'mmHg', recorded_at: date, status: sysTrend[i] > 125 ? 'elevated' : 'normal', reference_range: '<120/80' },
      { vital_type: 'temperature', value: JSON.stringify({ avg: tempTrend[i] }), unit: '°F', recorded_at: date, status: 'normal', reference_range: '97.8-99.1' },
      { vital_type: 'oxygen_sat', value: JSON.stringify({ avg: o2Trend[i] }), unit: '%', recorded_at: date, status: 'normal', reference_range: '95-100' },
      { vital_type: 'respiratory_rate', value: JSON.stringify({ avg: respTrend[i] }), unit: '/min', recorded_at: date, status: 'normal', reference_range: '12-20' },
      { vital_type: 'resting_hr', value: JSON.stringify({ avg: restHrTrend[i] }), unit: 'bpm', recorded_at: date, status: 'optimal', reference_range: '60-100' },
      { vital_type: 'weight', value: JSON.stringify({ avg: weightTrend[i] }), unit: 'lbs', recorded_at: date, status: 'normal', reference_range: '170-200' },
    )
  }
  await db.insertVitals(userId, vitals, passphrase)

  // 3. Lab Results
  report('Adding blood work panels...')
  const labPanels = [
    {
      panel_name: 'Complete Blood Count',
      panel_abbr: 'CBC',
      drawn_date: '2026-02-18',
      results: JSON.stringify([
        { name: 'WBC', value: 6.2, unit: 'K/uL', range: '4.5-11.0', status: 'normal' },
        { name: 'RBC', value: 5.1, unit: 'M/uL', range: '4.7-6.1', status: 'normal' },
        { name: 'Hemoglobin', value: 15.2, unit: 'g/dL', range: '13.5-17.5', status: 'normal' },
        { name: 'Hematocrit', value: 44.8, unit: '%', range: '38.3-48.6', status: 'normal' },
        { name: 'Platelets', value: 245, unit: 'K/uL', range: '150-400', status: 'normal' },
        { name: 'MCV', value: 88, unit: 'fL', range: '80-100', status: 'normal' },
      ]),
    },
    {
      panel_name: 'Comprehensive Metabolic Panel',
      panel_abbr: 'CMP',
      drawn_date: '2026-02-18',
      results: JSON.stringify([
        { name: 'Glucose', value: 94, unit: 'mg/dL', range: '70-100', status: 'normal' },
        { name: 'BUN', value: 16, unit: 'mg/dL', range: '7-20', status: 'normal' },
        { name: 'Creatinine', value: 1.0, unit: 'mg/dL', range: '0.7-1.3', status: 'normal' },
        { name: 'eGFR', value: 92, unit: 'mL/min', range: '>60', status: 'normal' },
        { name: 'Sodium', value: 140, unit: 'mEq/L', range: '136-145', status: 'normal' },
        { name: 'Potassium', value: 4.2, unit: 'mEq/L', range: '3.5-5.0', status: 'normal' },
        { name: 'Calcium', value: 9.6, unit: 'mg/dL', range: '8.5-10.5', status: 'normal' },
        { name: 'ALT', value: 28, unit: 'U/L', range: '7-56', status: 'normal' },
        { name: 'AST', value: 24, unit: 'U/L', range: '10-40', status: 'normal' },
      ]),
    },
    {
      panel_name: 'Lipid Panel',
      panel_abbr: 'LIPID',
      drawn_date: '2026-02-18',
      results: JSON.stringify([
        { name: 'Total Cholesterol', value: 208, unit: 'mg/dL', range: '<200', status: 'elevated' },
        { name: 'LDL', value: 128, unit: 'mg/dL', range: '<100', status: 'elevated' },
        { name: 'HDL', value: 52, unit: 'mg/dL', range: '>40', status: 'normal' },
        { name: 'Triglycerides', value: 140, unit: 'mg/dL', range: '<150', status: 'normal' },
        { name: 'VLDL', value: 28, unit: 'mg/dL', range: '5-40', status: 'normal' },
      ]),
    },
    {
      panel_name: 'Thyroid Panel',
      panel_abbr: 'THY',
      drawn_date: '2026-02-18',
      results: JSON.stringify([
        { name: 'TSH', value: 2.1, unit: 'mIU/L', range: '0.4-4.0', status: 'normal' },
        { name: 'Free T4', value: 1.2, unit: 'ng/dL', range: '0.8-1.8', status: 'normal' },
        { name: 'Free T3', value: 3.1, unit: 'pg/mL', range: '2.3-4.2', status: 'normal' },
      ]),
    },
    {
      panel_name: 'Vitamin Panel',
      panel_abbr: 'VIT',
      drawn_date: '2026-02-18',
      results: JSON.stringify([
        { name: 'Vitamin D', value: 32, unit: 'ng/mL', range: '30-100', status: 'normal' },
        { name: 'Vitamin B12', value: 480, unit: 'pg/mL', range: '200-900', status: 'normal' },
        { name: 'Folate', value: 14, unit: 'ng/mL', range: '>3', status: 'normal' },
        { name: 'Iron', value: 95, unit: 'ug/dL', range: '60-170', status: 'normal' },
        { name: 'Ferritin', value: 120, unit: 'ng/mL', range: '20-500', status: 'normal' },
      ]),
    },
    {
      panel_name: 'Hormones',
      panel_abbr: 'HRM',
      drawn_date: '2026-02-18',
      results: JSON.stringify([
        { name: 'Testosterone', value: 520, unit: 'ng/dL', range: '300-1000', status: 'normal' },
        { name: 'Free Testosterone', value: 12.5, unit: 'pg/mL', range: '8.7-25.1', status: 'normal' },
        { name: 'DHEA-S', value: 280, unit: 'ug/dL', range: '80-560', status: 'normal' },
        { name: 'Cortisol (AM)', value: 14, unit: 'ug/dL', range: '6-23', status: 'normal' },
        { name: 'PSA', value: 0.8, unit: 'ng/mL', range: '<4.0', status: 'normal' },
      ]),
    },
    {
      panel_name: 'Inflammatory Markers',
      panel_abbr: 'INF',
      drawn_date: '2026-02-18',
      results: JSON.stringify([
        { name: 'CRP (hs)', value: 1.2, unit: 'mg/L', range: '<3.0', status: 'normal' },
        { name: 'ESR', value: 8, unit: 'mm/hr', range: '0-22', status: 'normal' },
        { name: 'Homocysteine', value: 9.5, unit: 'umol/L', range: '5-15', status: 'normal' },
      ]),
    },
  ]
  await db.insertLabResults(userId, labPanels, passphrase)

  // 4. Medications
  report('Adding medications...')
  await db.insertMedications(userId, [
    { name: 'Lisinopril', dose: '10mg', frequency: 'Daily', purpose: 'Blood pressure', start_date: '2024-03-15', active: true },
    { name: 'Vitamin D3', dose: '2000 IU', frequency: 'Daily', purpose: 'Supplement', start_date: '2025-01-10', active: true },
    { name: 'Fish Oil', dose: '1000mg', frequency: 'Daily', purpose: 'Heart health', start_date: '2025-06-01', active: true },
    { name: 'Melatonin', dose: '3mg', frequency: 'As needed', purpose: 'Sleep', start_date: '2025-09-20', active: true },
  ], passphrase)

  // 5. Allergies
  report('Adding allergies...')
  await db.insertAllergies(userId, [
    { allergen: 'Penicillin', severity: 'Moderate', reaction: 'Rash', confirmed: true },
    { allergen: 'Shellfish', severity: 'Mild', reaction: 'Hives', confirmed: true },
  ], passphrase)

  // 6. Genetics
  report('Adding genetic data...')
  await db.upsertGenetics(userId, {
    provider: '23andMe + WGS',
    sequence_date: '2025-06-15',
    coverage: '30x',
    snps_analyzed: '683,421',
    data: JSON.stringify({
      ancestry: {
        british: 38, german: 22, scandinavian: 12, eastAsian: 3,
        subSaharanAfrican: 2, nativeAmerican: 1, other: 22,
      },
      riskFactors: [
        { condition: 'Type 2 Diabetes', gene: 'TCF7L2', snp: 'rs7903146', odds: '1.3x', status: 'watch', genotype: 'CT' },
        { condition: 'Coronary Artery Disease', gene: '9p21.3', snp: 'rs1333049', odds: '1.0x', status: 'normal', genotype: 'CG' },
        { condition: "Alzheimer's Disease", gene: 'APOE', snp: 'rs429358', odds: '1.0x', status: 'good', genotype: 'ε3/ε3' },
        { condition: 'Macular Degeneration', gene: 'CFH', snp: 'rs1061170', odds: '1.4x', status: 'watch', genotype: 'TC' },
        { condition: 'Celiac Disease', gene: 'HLA-DQ2.5', snp: 'rs2187668', odds: '0.3x', status: 'good', genotype: 'CC' },
        { condition: 'Prostate Cancer', gene: '8q24', snp: 'rs6983267', odds: '1.1x', status: 'normal', genotype: 'GT' },
      ],
      pharmacogenomics: [
        { drug: 'Warfarin', gene: 'CYP2C9/VKORC1', metabolism: 'Normal', note: 'Standard dosing expected' },
        { drug: 'Clopidogrel', gene: 'CYP2C19', metabolism: 'Rapid', note: 'May need dose adjustment' },
        { drug: 'Statins', gene: 'SLCO1B1', metabolism: 'Normal', note: 'Low myopathy risk' },
        { drug: 'SSRIs', gene: 'CYP2D6', metabolism: 'Normal', note: 'Standard response expected' },
        { drug: 'Codeine', gene: 'CYP2D6', metabolism: 'Normal', note: 'Normal conversion to morphine' },
        { drug: 'Metformin', gene: 'SLC22A1', metabolism: 'Normal', note: 'Normal response expected' },
      ],
      traits: [
        { trait: 'Caffeine Metabolism', gene: 'CYP1A2', result: 'Fast metabolizer' },
        { trait: 'Alcohol Flush', gene: 'ALDH2', result: 'No reaction' },
        { trait: 'Lactose Tolerance', gene: 'MCM6', result: 'Tolerant' },
        { trait: 'Muscle Composition', gene: 'ACTN3', result: 'Mixed sprint/endurance' },
        { trait: 'Sleep Chronotype', gene: 'PER2', result: 'Intermediate' },
        { trait: 'Bitter Taste', gene: 'TAS2R38', result: 'Can taste (PAV/AVI)' },
      ],
    }),
  }, passphrase)

  report('Demo data loaded successfully!')
}
