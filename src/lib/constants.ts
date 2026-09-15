import type { AgeBand, AmountId, Lifestyle, Locality, SchoolType, Vehicle } from './types';

/** Lifestyle picker value 0..3 */
export type L = 0 | 1 | 2 | 3;
export const pick = <T,>(l: L, v: [T, T, T, T]): T => v[l];

export const LIFESTYLE_META: Record<Lifestyle, { label: string; blurb: string }> = {
  essentials: { label: 'Essentials', blurb: 'Budget locality, cooks at home, public transport' },
  comfortable: { label: 'Comfortable', blurb: 'Standard flat, a maid, a hatchback, weekend outings' },
  premium: { label: 'Premium', blurb: 'Prime locality, cook + maid, SUV, yearly holidays' },
  luxury: { label: 'Luxury', blurb: 'Gated luxury home, full-time staff, driver, travel abroad' },
};

export const SQFT: Record<1 | 2 | 3 | 4, number> = { 1: 600, 2: 1050, 3: 1500, 4: 2100 };
export const LOCALITY: Record<Locality, { label: string; rent: number; maint: number }> = {
  budget: { label: 'Budget', rent: 0.7, maint: 0.6 },
  standard: { label: 'Standard', rent: 1, maint: 1 },
  prime: { label: 'Prime', rent: 1.5, maint: 1.6 },
  luxury: { label: 'Luxury', rent: 2.3, maint: 2.4 },
};
export const FURNISH = { unfurnished: 0.93, semi: 1, full: 1.12 } as const;

export interface VehicleSpec {
  label: string;
  fuel: 'petrol' | 'cng' | 'electric' | 'none';
  eff: number; // km per litre / kg / kWh
  insurance: number; // ₹/year
  service: number; // ₹/year
  cleaning: number; // ₹/month
  parking: [number, number, number]; // ₹/month by tier
  km: [number, number, number, number];
}

export const VEHICLES: Record<Vehicle, VehicleSpec> = {
  none: { label: 'No vehicle', fuel: 'none', eff: 1, insurance: 0, service: 0, cleaning: 0, parking: [0, 0, 0], km: [0, 0, 0, 0] },
  bike: { label: 'Scooter / bike', fuel: 'petrol', eff: 45, insurance: 2500, service: 4500, cleaning: 0, parking: [300, 150, 100], km: [450, 550, 600, 600] },
  hatch: { label: 'Hatchback', fuel: 'petrol', eff: 16, insurance: 16000, service: 12000, cleaning: 600, parking: [1500, 800, 400], km: [500, 700, 800, 900] },
  suv: { label: 'Sedan / SUV', fuel: 'petrol', eff: 12, insurance: 32000, service: 20000, cleaning: 700, parking: [2000, 1000, 500], km: [600, 800, 1000, 1200] },
  cng: { label: 'CNG car', fuel: 'cng', eff: 24, insurance: 17000, service: 13000, cleaning: 600, parking: [1500, 800, 400], km: [600, 800, 1000, 1000] },
  ev: { label: 'Electric car', fuel: 'electric', eff: 7, insurance: 22000, service: 7000, cleaning: 600, parking: [1500, 800, 400], km: [600, 800, 1000, 1200] },
};

export const AGE_BANDS: Record<AgeBand, string> = {
  infant: '0–2 yrs',
  preschool: '3–5',
  school: '6–12',
  teen: '13–17',
  college: '18+',
};

export const SCHOOL_TYPES: Record<SchoolType, { label: string; college: string }> = {
  govt: { label: 'Government', college: 'Govt college' },
  budget: { label: 'Budget private', college: 'Private (budget)' },
  mid: { label: 'CBSE / ICSE', college: 'Private college' },
  premium: { label: 'Premium', college: 'Top private' },
  intl: { label: 'International', college: 'Premium / abroad-track' },
};

/** Annual all-in fees (tuition + annual charges + books & uniform) at school index 100 (Pune-level). */
export const SCHOOL_FEES: Record<SchoolType, number> = { govt: 6000, budget: 40000, mid: 120000, premium: 250000, intl: 550000 };
export const PRESCHOOL_FEES: Record<SchoolType, number> = { govt: 3000, budget: 25000, mid: 70000, premium: 140000, intl: 280000 };
export const COLLEGE_FEES: Record<SchoolType, number> = { govt: 60000, budget: 150000, mid: 280000, premium: 450000, intl: 900000 };
export const DAYCARE: Record<SchoolType, number> = { govt: 4000, budget: 6000, mid: 9000, premium: 13000, intl: 18000 };

/** Health insurance: ₹10 L individual cover, Zone A, annual premium by age of eldest adult (2026 retail quotes). */
export function healthBase(age: number): number {
  if (age <= 30) return 9500;
  if (age <= 35) return 11500;
  if (age <= 40) return 14000;
  if (age <= 45) return 18000;
  if (age <= 50) return 24000;
  if (age <= 55) return 32000;
  return 42000;
}
export const COVER_FACTOR: Record<number, number> = { 0: 0, 5: 0.72, 10: 1, 25: 1.28, 100: 1.65 };
export const ZONE_FACTOR = { A: 1, B: 0.9, C: 0.8 } as const;
/** Per senior parent (60–70), ₹10 L cover, Zone A. */
export const SENIOR_PREMIUM = 36000;

/** Term life: ₹1 Cr cover to age 60, non-smoker, annual premium by entry age. */
export function termPerCrore(age: number): number {
  if (age <= 25) return 8000;
  if (age <= 30) return 10000;
  if (age <= 35) return 13500;
  if (age <= 40) return 19000;
  if (age <= 45) return 27000;
  if (age <= 50) return 40000;
  return 60000;
}

export interface SubItem {
  id: string;
  name: string;
  plan: string;
  monthly: number;
  kind: 'video' | 'music' | 'ai' | 'cloud' | 'other';
}

/** Official India prices, Sep 2026; annual plans shown as monthly equivalents. */
export const SUBSCRIPTIONS: SubItem[] = [
  { id: 'netflix-mobile', name: 'Netflix', plan: 'Mobile', monthly: 149, kind: 'video' },
  { id: 'netflix-basic', name: 'Netflix', plan: 'Basic', monthly: 199, kind: 'video' },
  { id: 'netflix-standard', name: 'Netflix', plan: 'Standard', monthly: 499, kind: 'video' },
  { id: 'netflix-premium', name: 'Netflix', plan: 'Premium 4K', monthly: 649, kind: 'video' },
  { id: 'prime', name: 'Amazon Prime', plan: '₹1,499/yr', monthly: 125, kind: 'video' },
  { id: 'jiohotstar-mobile', name: 'JioHotstar', plan: 'Mobile ₹499/yr', monthly: 42, kind: 'video' },
  { id: 'jiohotstar-super', name: 'JioHotstar', plan: 'Super ₹1,099/yr', monthly: 92, kind: 'video' },
  { id: 'jiohotstar-premium', name: 'JioHotstar', plan: 'Premium ₹2,199/yr', monthly: 183, kind: 'video' },
  { id: 'sonyliv', name: 'SonyLIV', plan: 'Premium ₹1,499/yr', monthly: 125, kind: 'video' },
  { id: 'zee5', name: 'ZEE5', plan: '₹749/yr', monthly: 62, kind: 'video' },
  { id: 'youtube', name: 'YouTube Premium', plan: 'Individual', monthly: 149, kind: 'video' },
  { id: 'youtube-family', name: 'YouTube Premium', plan: 'Family', monthly: 299, kind: 'video' },
  { id: 'dth', name: 'DTH / cable TV', plan: 'Basic pack', monthly: 350, kind: 'video' },
  { id: 'spotify', name: 'Spotify', plan: 'Premium', monthly: 139, kind: 'music' },
  { id: 'apple-music', name: 'Apple Music', plan: 'Individual', monthly: 139, kind: 'music' },
  { id: 'apple-one', name: 'Apple One', plan: 'Individual', monthly: 195, kind: 'music' },
  { id: 'chatgpt-go', name: 'ChatGPT', plan: 'Go', monthly: 399, kind: 'ai' },
  { id: 'chatgpt-plus', name: 'ChatGPT', plan: 'Plus', monthly: 1999, kind: 'ai' },
  { id: 'google-one', name: 'Google One', plan: '100 GB', monthly: 130, kind: 'cloud' },
  { id: 'icloud', name: 'iCloud+', plan: '200 GB', monthly: 219, kind: 'cloud' },
  { id: 'newspaper', name: 'Newspaper', plan: 'Daily delivery', monthly: 350, kind: 'other' },
];
export const SUB_BY_ID = Object.fromEntries(SUBSCRIPTIONS.map((s) => [s.id, s]));

export const SUB_PRESETS: [string[], string[], string[], string[]] = [
  ['jiohotstar-mobile'],
  ['netflix-basic', 'prime', 'jiohotstar-super', 'spotify'],
  ['netflix-standard', 'prime', 'jiohotstar-premium', 'youtube-family', 'spotify', 'google-one', 'chatgpt-go'],
  ['netflix-premium', 'prime', 'jiohotstar-premium', 'sonyliv', 'youtube-family', 'apple-one', 'chatgpt-plus', 'icloud', 'newspaper'],
];

/** Which city index scales an amount between cities. 'none' = same price everywhere. */
export type IdxKey = 'groc' | 'dine' | 'col' | 'help' | 'school' | 'transit' | 'none';

export interface AmountDef {
  id: AmountId;
  label: string;
  hint?: string;
  idx: IdxKey;
  max: number;
  step: number;
  yearly?: boolean;
  count?: boolean;
}

export const AMOUNTS: Record<AmountId, AmountDef> = {
  maintenance: { id: 'maintenance', label: 'Society maintenance', idx: 'none', max: 30000, step: 100 },
  familyContribution: { id: 'familyContribution', label: 'Contribution to household', idx: 'col', max: 100000, step: 500 },
  water: { id: 'water', label: 'Water & tanker', idx: 'col', max: 5000, step: 50 },
  broadband: { id: 'broadband', label: 'Broadband', hint: '100 Mbps ≈ ₹825 incl. GST', idx: 'none', max: 5000, step: 25 },
  mobile: { id: 'mobile', label: 'Mobile plans', hint: 'All family SIMs', idx: 'none', max: 10000, step: 50 },
  groceries: { id: 'groceries', label: 'Groceries, milk & essentials', idx: 'groc', max: 100000, step: 250 },
  dining: { id: 'dining', label: 'Eating out', idx: 'dine', max: 150000, step: 250 },
  deliveryOrders: { id: 'deliveryOrders', label: 'Food delivery orders', idx: 'none', max: 90, step: 1, count: true },
  parking: { id: 'parking', label: 'Parking & tolls', idx: 'none', max: 20000, step: 100 },
  cabs: { id: 'cabs', label: 'Cabs, autos & bike taxis', idx: 'transit', max: 60000, step: 250 },
  transit: { id: 'transit', label: 'Metro, bus & train', idx: 'transit', max: 15000, step: 100 },
  coaching: { id: 'coaching', label: 'Tuition & coaching', hint: 'All children', idx: 'school', max: 80000, step: 500 },
  activities: { id: 'activities', label: 'Classes, sports & hobbies', hint: 'All children', idx: 'col', max: 60000, step: 250 },
  medicines: { id: 'medicines', label: 'Doctor visits & medicines', idx: 'col', max: 60000, step: 250 },
  gym: { id: 'gym', label: 'Gym & fitness', idx: 'col', max: 40000, step: 250 },
  otherSubs: { id: 'otherSubs', label: 'Other apps & memberships', idx: 'none', max: 20000, step: 50 },
  shopping: { id: 'shopping', label: 'Clothes & shopping', idx: 'col', max: 300000, step: 500 },
  personalCare: { id: 'personalCare', label: 'Salon & personal care', idx: 'col', max: 80000, step: 250 },
  entertainment: { id: 'entertainment', label: 'Movies, events & nights out', idx: 'dine', max: 100000, step: 250 },
  travelYear: { id: 'travelYear', label: 'Holidays & trips home', idx: 'none', max: 3000000, step: 5000, yearly: true },
  festivalsYear: { id: 'festivalsYear', label: 'Festivals, weddings & gifts', idx: 'none', max: 1500000, step: 2500, yearly: true },
  gadgetsYear: { id: 'gadgetsYear', label: 'Phones, gadgets & appliances', idx: 'none', max: 1500000, step: 2500, yearly: true },
  carEmi: { id: 'carEmi', label: 'Car / bike loan EMI', idx: 'none', max: 200000, step: 500 },
  personalEmi: { id: 'personalEmi', label: 'Personal loan EMI', idx: 'none', max: 200000, step: 500 },
  educationEmi: { id: 'educationEmi', label: 'Education loan EMI', idx: 'none', max: 200000, step: 500 },
  ccRepay: { id: 'ccRepay', label: 'Credit card dues', hint: 'Only debt not already counted above', idx: 'none', max: 300000, step: 500 },
  bnpl: { id: 'bnpl', label: 'No-cost EMIs & pay-later', idx: 'none', max: 100000, step: 250 },
  familySupport: { id: 'familySupport', label: 'Money sent to parents / family', idx: 'none', max: 300000, step: 500 },
  donations: { id: 'donations', label: 'Donations & religious giving', idx: 'none', max: 100000, step: 250 },
  sip: { id: 'sip', label: 'SIPs & investments', idx: 'none', max: 500000, step: 500 },
};

/** Annual inflation per line, India 2026: CPI 4.8% (Aug 2026), food 6%, private healthcare 12–14%, school fees 10–12%. */
export const INFLATION: Record<string, number> = {
  rent: 0.07, pg: 0.07, maintenance: 0.06, propertyTax: 0.04, homeLoanEmi: 0, familyContribution: 0.06, moveIn: 0.07,
  electricity: 0.04, cookingGas: 0.05, water: 0.05, broadband: 0.03, mobile: 0.08,
  groceries: 0.06, dining: 0.07, delivery: 0.07,
  cleaning: 0.08, cook: 0.08, fullTime: 0.08, nanny: 0.08, driver: 0.08, laundry: 0.07, elderCare: 0.08,
  fuel: 0.04, vehicleUpkeep: 0.06, parking: 0.05, cabs: 0.06, transit: 0.05,
  schoolFees: 0.1, daycare: 0.09, babyEssentials: 0.06, coaching: 0.1, activities: 0.07, college: 0.1, collegeLiving: 0.06,
  healthInsurance: 0.12, parentsInsurance: 0.13, termInsurance: 0, medicines: 0.1, gym: 0.06,
  subscriptions: 0.05, otherSubs: 0.05,
  shopping: 0.05, personalCare: 0.06, entertainment: 0.06, travel: 0.06, festivals: 0.06, gadgets: 0.03, pets: 0.07,
  carEmi: 0, personalEmi: 0, educationEmi: 0, ccRepay: 0, bnpl: 0, familySupport: 0.05, donations: 0.04,
  sip: 0.05, nps: 0, emergencyFund: 0.06, buffer: 0.06, savingsGoal: 0,
};

export const HELP_BASE = {
  cleaning: { 1: 3500, 2: 5500, 3: 7000, 4: 9000 } as Record<1 | 2 | 3 | 4, number>,
  cookBase: 4000,
  cookPerPerson: 1200,
  fullTime: 18000,
  nanny: 16000,
  driver: 20000,
  elderCare: 22000,
};

export const TAX_SOURCES = [
  'Income-tax Act 2025 & Budget 2026 — slabs, ₹75,000 standard deduction, ₹60,000 rebate up to ₹12 L (new regime)',
  'Income-tax Rules 2026 — 50% HRA metro list: Mumbai, Delhi, Kolkata, Chennai, Bengaluru, Hyderabad, Pune, Ahmedabad',
  'Labour codes (in force 21 Nov 2025) — wages ≥ 50% of pay, so basic is taken as 50% of CTC',
  'State professional tax schedules, FY 2026-27',
];
