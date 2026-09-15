/*
 * City dataset — September 2026.
 *
 * rent:      mid-market, semi-furnished flat in a decent "standard" locality, ₹/month [1BHK, 2BHK, 3BHK].
 *            Anchored to Numbeo city rents (1BR centre/outside, 3BR outside, Sep 2026) and 2026 portal
 *            reports (Magicbricks / NoBroker / 99acres); cities without survey data are modelled from
 *            peers in the same state and tier.
 * indices:   100 = Bengaluru. groc = groceries, dine = eating out & delivery, col = everyday goods &
 *            services, help = domestic-help wages, school = school fees, transit = autos/cabs/buses.
 *            Numbeo India indices, compressed toward the national mean for branded/online-priced goods.
 * maint:     society maintenance ₹/sq ft/month. maintInRent: renters usually don't pay it separately.
 * deposit:   customary security deposit (months of rent).
 * zone:      health-insurer pricing zone (A = NCR, MMR, Gujarat metros).
 * climate:   share of the year an AC runs hard (0–1); heat = extra winter heating units/month.
 * petrol:    ₹/litre on 15 Sep 2026; cng ₹/kg; lpgOff = 14.2 kg domestic cylinder vs Delhi (₹942).
 */
import type { Group } from './types';

export type StateCode =
  | 'MH' | 'DL' | 'HR' | 'UP' | 'KA' | 'TG' | 'TN' | 'WB' | 'GJ' | 'RJ' | 'CH' | 'PB' | 'BR'
  | 'JH' | 'OD' | 'AS' | 'MP' | 'CG' | 'GA' | 'KL' | 'AP' | 'PY' | 'UK' | 'HP' | 'JK';

export type Region = 'North' | 'South' | 'East' | 'West' | 'Central' | 'Northeast';

export interface StateInfo {
  name: string;
  /** professional tax, ₹/year for salaries above ₹25k/month */
  pt: number;
  /** domestic electricity bill ₹ at 100 / 300 / 600 units a month incl. fixed charges (FY 2025-26 tariffs); engine adds ~10% duty */
  elec: [number, number, number];
  subsidy?: 'DL' | 'PB' | 'KA';
  petrol: number;
}

export const STATES: Record<StateCode, StateInfo> = {
  // Maharashtra incl. wheeling charges; Gujarat incl. FPPPA fuel surcharge; TN & Kerala bill bimonthly slabs (converted)
  MH: { name: 'Maharashtra', pt: 2500, elec: [650, 2700, 6800], petrol: 111.78 },
  DL: { name: 'Delhi', pt: 0, elec: [350, 1250, 3100], subsidy: 'DL', petrol: 102.12 },
  HR: { name: 'Haryana', pt: 0, elec: [364, 1608, 3738], petrol: 103.32 },
  UP: { name: 'Uttar Pradesh', pt: 0, elec: [660, 1934, 4034], petrol: 101.66 },
  KA: { name: 'Karnataka', pt: 2500, elec: [600, 2070, 4300], subsidy: 'KA', petrol: 111.01 },
  TG: { name: 'Telangana', pt: 2400, elec: [300, 1800, 4700], petrol: 116.94 },
  TN: { name: 'Tamil Nadu', pt: 2500, elec: [118, 1440, 4590], petrol: 109.75 },
  WB: { name: 'West Bengal', pt: 2400, elec: [650, 2300, 5000], petrol: 113.59 },
  GJ: { name: 'Gujarat', pt: 2400, elec: [480, 1900, 4400], petrol: 102.15 },
  RJ: { name: 'Rajasthan', pt: 0, elec: [616, 2002, 4531], petrol: 112.31 },
  CH: { name: 'Chandigarh', pt: 0, elec: [300, 1100, 2600], petrol: 101.54 },
  PB: { name: 'Punjab', pt: 2400, elec: [685, 1815, 3762], subsidy: 'PB', petrol: 105.56 },
  BR: { name: 'Bihar', pt: 2500, elec: [660, 2068, 4303], petrol: 115.06 },
  JH: { name: 'Jharkhand', pt: 2500, elec: [540, 1768, 3987], petrol: 105.62 },
  OD: { name: 'Odisha', pt: 2500, elec: [368, 1367, 3116], petrol: 110.26 },
  AS: { name: 'Assam', pt: 2500, elec: [441, 1679, 3958], petrol: 106.16 },
  MP: { name: 'Madhya Pradesh', pt: 2500, elec: [473, 1592, 3496], petrol: 115.61 },
  CG: { name: 'Chhattisgarh', pt: 0, elec: [305, 1354, 3103], petrol: 107.8 },
  GA: { name: 'Goa', pt: 0, elec: [240, 833, 1913], petrol: 103.5 },
  KL: { name: 'Kerala', pt: 2500, elec: [330, 2000, 5300], petrol: 113.88 },
  AP: { name: 'Andhra Pradesh', pt: 2400, elec: [300, 1750, 4600], petrol: 117.61 },
  PY: { name: 'Puducherry', pt: 2500, elec: [200, 950, 2400], petrol: 103.32 },
  UK: { name: 'Uttarakhand', pt: 0, elec: [300, 1262, 3046], petrol: 100.82 },
  HP: { name: 'Himachal Pradesh', pt: 0, elec: [80, 702, 2065], petrol: 102.1 },
  JK: { name: 'Jammu & Kashmir', pt: 0, elec: [250, 900, 2100], petrol: 106 },
};

export const LPG_DELHI = 942;

export interface City {
  id: string;
  name: string;
  state: StateCode;
  tier: 1 | 2 | 3;
  region: Region;
  rent: [number, number, number];
  groc: number;
  dine: number;
  col: number;
  help: number;
  school: number;
  transit: number;
  maint: number;
  maintInRent?: boolean;
  deposit: number;
  hraMetro?: boolean;
  zone: 'A' | 'B' | 'C';
  climate: number;
  heat: number;
  petrol: number;
  cng: number;
  lpgOff: number;
  metro?: boolean;
  quality: 'survey' | 'modelled';
}

type Idx = [groc: number, dine: number, col: number, help: number, school: number, transit: number];
type Extra = Partial<Pick<City, 'maintInRent' | 'hraMetro' | 'metro'>> & {
  maint: number; deposit: number; zone: City['zone']; climate: number; heat?: number;
  petrol?: number; cng: number; lpgOff: number; q?: 'm';
};

function c(id: string, name: string, state: StateCode, tier: 1 | 2 | 3, region: Region,
  rent: [number, number, number], i: Idx, x: Extra): City {
  return {
    id, name, state, tier, region, rent,
    groc: i[0], dine: i[1], col: i[2], help: i[3], school: i[4], transit: i[5],
    maint: x.maint, maintInRent: x.maintInRent, deposit: x.deposit, hraMetro: x.hraMetro, zone: x.zone,
    climate: x.climate, heat: x.heat ?? 0, petrol: x.petrol ?? STATES[state].petrol, cng: x.cng,
    lpgOff: x.lpgOff, metro: x.metro, quality: x.q === 'm' ? 'modelled' : 'survey',
  };
}

export const CITIES: City[] = [
  // ——— Mumbai Metropolitan Region & Maharashtra ———
  c('mumbai', 'Mumbai', 'MH', 1, 'West', [38000, 62000, 105000], [104, 115, 110, 125, 125, 105],
    { maint: 5.5, maintInRent: true, deposit: 4, hraMetro: true, zone: 'A', climate: 0.7, petrol: 111.21, cng: 88, lpgOff: -0.5, metro: true }),
  c('thane', 'Thane', 'MH', 1, 'West', [20000, 32000, 50000], [101, 99, 99, 112, 105, 95],
    { maint: 3.5, maintInRent: true, deposit: 4, zone: 'A', climate: 0.7, petrol: 111.5, cng: 88, lpgOff: 0, metro: true }),
  c('navi-mumbai', 'Navi Mumbai', 'MH', 1, 'West', [20000, 32000, 48000], [101, 92, 96, 110, 105, 92],
    { maint: 3.5, maintInRent: true, deposit: 4, zone: 'A', climate: 0.7, petrol: 111.5, cng: 88, lpgOff: 0, metro: true }),
  c('pune', 'Pune', 'MH', 1, 'West', [17000, 28000, 44000], [99, 106, 102, 95, 100, 100],
    { maint: 3.5, deposit: 2, hraMetro: true, zone: 'B', climate: 0.35, petrol: 112.02, cng: 91, lpgOff: 2.5, metro: true }),
  c('nagpur', 'Nagpur', 'MH', 2, 'Central', [10000, 16000, 23000], [92, 82, 92, 68, 78, 82],
    { maint: 2, deposit: 2, zone: 'B', climate: 0.75, cng: 100, lpgOff: 5, metro: true, q: 'm' }),
  c('nashik', 'Nashik', 'MH', 2, 'West', [9000, 15000, 22000], [92, 80, 91, 68, 75, 80],
    { maint: 2, deposit: 2, zone: 'B', climate: 0.4, petrol: 112.2, cng: 94, lpgOff: 5, q: 'm' }),
  c('sambhajinagar', 'Chhatrapati Sambhajinagar', 'MH', 3, 'West', [8000, 13000, 19000], [90, 76, 89, 62, 68, 78],
    { maint: 1.8, deposit: 2, zone: 'C', climate: 0.55, petrol: 112.5, cng: 96, lpgOff: 7, q: 'm' }),

  // ——— Delhi NCR ———
  c('delhi', 'Delhi', 'DL', 1, 'North', [18000, 30000, 48000], [97, 102, 99, 105, 112, 92],
    { maint: 2.5, maintInRent: true, deposit: 2, hraMetro: true, zone: 'A', climate: 0.6, heat: 20, cng: 86.98, lpgOff: 0, metro: true }),
  c('gurugram', 'Gurugram', 'HR', 1, 'North', [22000, 38000, 58000], [102, 110, 106, 115, 125, 108],
    { maint: 4.5, deposit: 2, zone: 'A', climate: 0.6, heat: 20, petrol: 102.97, cng: 94, lpgOff: 8.5, metro: true }),
  c('noida', 'Noida', 'UP', 1, 'North', [15000, 24000, 36000], [98, 95, 97, 100, 105, 95],
    { maint: 3, deposit: 2, zone: 'A', climate: 0.6, heat: 20, petrol: 101.96, cng: 92, lpgOff: -2.5, metro: true }),
  c('ghaziabad', 'Ghaziabad', 'UP', 2, 'North', [11000, 17000, 25000], [95, 88, 93, 90, 90, 88],
    { maint: 2.5, deposit: 2, zone: 'A', climate: 0.6, heat: 20, petrol: 101.7, cng: 92, lpgOff: -2.5, metro: true, q: 'm' }),
  c('faridabad', 'Faridabad', 'HR', 2, 'North', [10000, 16000, 24000], [95, 86, 92, 90, 90, 88],
    { maint: 2.5, deposit: 2, zone: 'A', climate: 0.6, heat: 20, petrol: 103.3, cng: 93, lpgOff: 1.5, metro: true, q: 'm' }),

  // ——— Karnataka ———
  c('bengaluru', 'Bengaluru', 'KA', 1, 'South', [20000, 34000, 55000], [100, 100, 100, 100, 110, 110],
    { maint: 4, deposit: 6, hraMetro: true, zone: 'B', climate: 0.2, petrol: 111.68, cng: 97, lpgOff: 3, metro: true }),
  c('mysuru', 'Mysuru', 'KA', 2, 'South', [11000, 18000, 26000], [96, 82, 91, 78, 78, 88],
    { maint: 2, deposit: 6, zone: 'B', climate: 0.3, petrol: 111.2, cng: 97, lpgOff: 5, q: 'm' }),
  c('mangaluru', 'Mangaluru', 'KA', 2, 'South', [11000, 18000, 26000], [97, 82, 92, 80, 80, 90],
    { maint: 2, deposit: 5, zone: 'B', climate: 0.65, petrol: 110.8, cng: 98, lpgOff: 6, q: 'm' }),
  c('hubballi', 'Hubballi–Dharwad', 'KA', 3, 'South', [8000, 13000, 19000], [92, 74, 88, 65, 68, 80],
    { maint: 1.5, deposit: 5, zone: 'C', climate: 0.45, petrol: 111.4, cng: 98, lpgOff: 8, q: 'm' }),

  // ——— Telangana & Andhra Pradesh ———
  c('hyderabad', 'Hyderabad', 'TG', 1, 'South', [16000, 28000, 42000], [98, 96, 100, 90, 100, 100],
    { maint: 3.5, deposit: 2, hraMetro: true, zone: 'B', climate: 0.55, petrol: 116.15, cng: 110, lpgOff: 55, metro: true }),
  c('visakhapatnam', 'Visakhapatnam', 'AP', 2, 'South', [11000, 18000, 26000], [94, 80, 91, 68, 75, 84],
    { maint: 2, deposit: 2, zone: 'B', climate: 0.75, petrol: 117, cng: 100, lpgOff: 18, q: 'm' }),
  c('vijayawada', 'Vijayawada', 'AP', 2, 'South', [10000, 16000, 23000], [93, 76, 90, 65, 72, 82],
    { maint: 2, deposit: 2, zone: 'B', climate: 0.8, cng: 100, lpgOff: 24, q: 'm' }),

  // ——— Tamil Nadu & Puducherry ———
  c('chennai', 'Chennai', 'TN', 1, 'South', [14000, 24000, 38000], [97, 85, 96, 88, 95, 98],
    { maint: 3, deposit: 5, hraMetro: true, zone: 'B', climate: 0.85, petrol: 107.76, cng: 97, lpgOff: 15.5, metro: true }),
  c('coimbatore', 'Coimbatore', 'TN', 2, 'South', [10000, 17000, 25000], [93, 78, 88, 75, 80, 85],
    { maint: 2, deposit: 5, zone: 'B', climate: 0.4, petrol: 108.2, cng: 98, lpgOff: 20 }),
  c('madurai', 'Madurai', 'TN', 3, 'South', [8000, 13000, 19000], [91, 72, 87, 65, 68, 80],
    { maint: 1.5, deposit: 5, zone: 'C', climate: 0.75, petrol: 108.5, cng: 98, lpgOff: 20, q: 'm' }),
  c('tiruchirappalli', 'Tiruchirappalli', 'TN', 3, 'South', [7500, 12000, 17000], [90, 70, 86, 62, 65, 78],
    { maint: 1.5, deposit: 5, zone: 'C', climate: 0.8, petrol: 108.7, cng: 98, lpgOff: 20, q: 'm' }),
  c('puducherry', 'Puducherry', 'PY', 3, 'South', [9000, 15000, 22000], [93, 80, 89, 65, 70, 85],
    { maint: 1.5, deposit: 3, zone: 'C', climate: 0.8, cng: 98, lpgOff: 16, q: 'm' }),

  // ——— Kerala ———
  c('kochi', 'Kochi', 'KL', 2, 'South', [12000, 19000, 28000], [99, 82, 92, 95, 80, 90],
    { maint: 2.5, deposit: 3, zone: 'B', climate: 0.6, cng: 92, lpgOff: 9, metro: true }),
  c('thiruvananthapuram', 'Thiruvananthapuram', 'KL', 2, 'South', [11000, 17000, 25000], [99, 80, 91, 90, 78, 88],
    { maint: 2, deposit: 3, zone: 'B', climate: 0.6, petrol: 114, cng: 92, lpgOff: 9 }),
  c('kozhikode', 'Kozhikode', 'KL', 3, 'South', [9000, 14000, 20000], [97, 76, 89, 85, 70, 84],
    { maint: 1.8, deposit: 3, zone: 'C', climate: 0.6, petrol: 114, cng: 92, lpgOff: 12, q: 'm' }),
  c('thrissur', 'Thrissur', 'KL', 3, 'South', [8500, 13000, 19000], [97, 75, 89, 85, 70, 84],
    { maint: 1.8, deposit: 3, zone: 'C', climate: 0.6, petrol: 114, cng: 92, lpgOff: 10, q: 'm' }),

  // ——— West Bengal, East & North-East ———
  c('kolkata', 'Kolkata', 'WB', 1, 'East', [12000, 20000, 32000], [94, 83, 96, 70, 85, 85],
    { maint: 3, deposit: 3, hraMetro: true, zone: 'B', climate: 0.65, petrol: 113.51, cng: 99.5, lpgOff: 26, metro: true }),
  c('siliguri', 'Siliguri', 'WB', 3, 'East', [7500, 12000, 17000], [92, 76, 88, 58, 65, 76],
    { maint: 1.5, deposit: 2, zone: 'C', climate: 0.45, cng: 100, lpgOff: 35, q: 'm' }),
  c('bhubaneswar', 'Bhubaneswar', 'OD', 2, 'East', [10000, 16000, 23000], [92, 78, 91, 62, 72, 80],
    { maint: 2, deposit: 2, zone: 'B', climate: 0.7, cng: 100, lpgOff: 26 }),
  c('patna', 'Patna', 'BR', 2, 'East', [8000, 13000, 19000], [90, 80, 90, 58, 70, 78],
    { maint: 1.8, deposit: 2, zone: 'C', climate: 0.6, heat: 10, cng: 100, lpgOff: 98 }),
  c('ranchi', 'Ranchi', 'JH', 3, 'East', [8000, 13000, 19000], [90, 78, 89, 60, 68, 78],
    { maint: 1.5, deposit: 2, zone: 'C', climate: 0.4, cng: 100, lpgOff: 57.5, q: 'm' }),
  c('jamshedpur', 'Jamshedpur', 'JH', 3, 'East', [8000, 13000, 18000], [90, 76, 88, 60, 68, 76],
    { maint: 1.5, deposit: 2, zone: 'C', climate: 0.55, petrol: 105.7, cng: 100, lpgOff: 60, q: 'm' }),
  c('guwahati', 'Guwahati', 'AS', 2, 'Northeast', [10000, 16000, 24000], [97, 90, 92, 65, 72, 88],
    { maint: 2, deposit: 2, zone: 'B', climate: 0.5, cng: 98, lpgOff: 10 }),

  // ——— Gujarat ———
  c('ahmedabad', 'Ahmedabad', 'GJ', 1, 'West', [12000, 20000, 30000], [95, 100, 99, 80, 88, 88],
    { maint: 2.5, deposit: 2, hraMetro: true, zone: 'A', climate: 0.7, petrol: 102.15, cng: 94.02, lpgOff: 7, metro: true }),
  c('gandhinagar', 'Gandhinagar', 'GJ', 2, 'West', [10000, 16000, 24000], [93, 85, 93, 75, 80, 80],
    { maint: 2, deposit: 2, zone: 'A', climate: 0.7, petrol: 102.2, cng: 94, lpgOff: 7, metro: true, q: 'm' }),
  c('surat', 'Surat', 'GJ', 2, 'West', [10000, 16000, 24000], [93, 86, 92, 75, 78, 82],
    { maint: 2, deposit: 2, zone: 'A', climate: 0.7, petrol: 102, cng: 94, lpgOff: 5 }),
  c('vadodara', 'Vadodara', 'GJ', 2, 'West', [9000, 15000, 22000], [93, 82, 92, 72, 75, 80],
    { maint: 2, deposit: 2, zone: 'A', climate: 0.7, petrol: 102, cng: 94, lpgOff: 7 }),
  c('rajkot', 'Rajkot', 'GJ', 2, 'West', [8000, 13000, 19000], [92, 78, 90, 70, 70, 78],
    { maint: 1.8, deposit: 2, zone: 'A', climate: 0.65, petrol: 102, cng: 94, lpgOff: 6 }),

  // ——— Goa ———
  c('goa', 'Goa (Panaji–Porvorim)', 'GA', 2, 'West', [15000, 25000, 38000], [103, 108, 102, 95, 85, 125],
    { maint: 2.5, deposit: 2, zone: 'B', climate: 0.65, cng: 97, lpgOff: 13.5, q: 'm' }),

  // ——— Rajasthan ———
  c('jaipur', 'Jaipur', 'RJ', 2, 'North', [10000, 17000, 25000], [92, 88, 93, 75, 80, 85],
    { maint: 2, deposit: 2, zone: 'B', climate: 0.6, heat: 10, petrol: 112.66, cng: 96, lpgOff: 3.5, metro: true }),
  c('jodhpur', 'Jodhpur', 'RJ', 3, 'North', [8000, 13000, 19000], [90, 78, 89, 65, 65, 78],
    { maint: 1.5, deposit: 2, zone: 'C', climate: 0.7, heat: 8, petrol: 112.5, cng: 98, lpgOff: 5, q: 'm' }),
  c('udaipur', 'Udaipur', 'RJ', 3, 'North', [9000, 15000, 22000], [91, 85, 90, 68, 68, 85],
    { maint: 1.5, deposit: 2, zone: 'C', climate: 0.5, heat: 8, petrol: 113, cng: 98, lpgOff: 5, q: 'm' }),

  // ——— Punjab, Chandigarh, Himachal, J&K, Uttarakhand ———
  c('chandigarh', 'Chandigarh Tricity', 'CH', 2, 'North', [13000, 22000, 32000], [97, 95, 100, 90, 95, 90],
    { maint: 2.5, deposit: 2, zone: 'B', climate: 0.5, heat: 25, cng: 95, lpgOff: 9.5 }),
  c('ludhiana', 'Ludhiana', 'PB', 2, 'North', [10000, 16000, 23000], [93, 85, 93, 78, 78, 82],
    { maint: 2, deposit: 2, zone: 'B', climate: 0.5, heat: 25, petrol: 105.8, cng: 98, lpgOff: 27, q: 'm' }),
  c('amritsar', 'Amritsar', 'PB', 3, 'North', [9000, 14000, 20000], [91, 80, 90, 72, 70, 80],
    { maint: 1.5, deposit: 2, zone: 'C', climate: 0.5, heat: 30, petrol: 105.9, cng: 98, lpgOff: 30, q: 'm' }),
  c('dehradun', 'Dehradun', 'UK', 2, 'North', [12000, 19000, 28000], [94, 85, 92, 72, 95, 85],
    { maint: 2, deposit: 2, zone: 'B', climate: 0.35, heat: 40, cng: 99, lpgOff: -2.5 }),
  c('shimla', 'Shimla', 'HP', 3, 'North', [13000, 20000, 28000], [97, 88, 93, 78, 80, 100],
    { maint: 1.5, deposit: 2, zone: 'C', climate: 0, heat: 90, cng: 100, lpgOff: 44.5, q: 'm' }),
  c('jammu', 'Jammu', 'JK', 3, 'North', [10000, 15000, 22000], [95, 80, 90, 68, 68, 82],
    { maint: 1.5, deposit: 2, zone: 'C', climate: 0.55, heat: 30, petrol: 104.5, cng: 100, lpgOff: 72.5, q: 'm' }),
  c('srinagar', 'Srinagar', 'JK', 3, 'North', [10000, 16000, 24000], [97, 82, 91, 70, 68, 85],
    { maint: 1.5, deposit: 2, zone: 'C', climate: 0.1, heat: 140, petrol: 107.7, cng: 100, lpgOff: 116, q: 'm' }),

  // ——— Uttar Pradesh ———
  c('lucknow', 'Lucknow', 'UP', 2, 'North', [9000, 15000, 22000], [90, 80, 89, 70, 78, 82],
    { maint: 2, deposit: 2, zone: 'B', climate: 0.6, heat: 15, petrol: 101.89, cng: 96, lpgOff: 37.5, metro: true }),
  c('kanpur', 'Kanpur', 'UP', 3, 'North', [7000, 11000, 16000], [88, 75, 87, 62, 65, 75],
    { maint: 1.5, deposit: 2, zone: 'C', climate: 0.6, heat: 15, petrol: 101.8, cng: 99, lpgOff: 24, metro: true }),
  c('varanasi', 'Varanasi', 'UP', 3, 'North', [7000, 12000, 18000], [88, 75, 87, 60, 62, 78],
    { maint: 1.5, deposit: 2, zone: 'C', climate: 0.6, heat: 15, petrol: 102.2, cng: 99, lpgOff: 63.5, q: 'm' }),
  c('prayagraj', 'Prayagraj', 'UP', 3, 'North', [6500, 11000, 16000], [87, 72, 86, 58, 60, 75],
    { maint: 1.5, deposit: 2, zone: 'C', climate: 0.65, heat: 15, petrol: 102, cng: 98, lpgOff: 50, q: 'm' }),
  c('agra', 'Agra', 'UP', 3, 'North', [7000, 11000, 16000], [88, 75, 87, 60, 62, 76],
    { maint: 1.5, deposit: 2, zone: 'C', climate: 0.65, heat: 15, cng: 98, lpgOff: 12.5, q: 'm' }),
  c('meerut', 'Meerut', 'UP', 3, 'North', [7000, 11000, 16000], [89, 75, 88, 62, 65, 75],
    { maint: 1.5, deposit: 2, zone: 'C', climate: 0.55, heat: 20, petrol: 101.7, cng: 94, lpgOff: 5, q: 'm' }),

  // ——— Madhya Pradesh & Chhattisgarh ———
  c('indore', 'Indore', 'MP', 2, 'Central', [10000, 16000, 23000], [90, 80, 91, 65, 78, 80],
    { maint: 2, deposit: 2, zone: 'B', climate: 0.45, cng: 98, lpgOff: 28, metro: true }),
  c('bhopal', 'Bhopal', 'MP', 2, 'Central', [9000, 14000, 20000], [92, 78, 89, 62, 72, 78],
    { maint: 1.8, deposit: 2, zone: 'B', climate: 0.5, cng: 98, lpgOff: 5.5 }),
  c('gwalior', 'Gwalior', 'MP', 3, 'Central', [7000, 11000, 16000], [89, 72, 86, 58, 62, 75],
    { maint: 1.5, deposit: 2, zone: 'C', climate: 0.6, heat: 15, petrol: 115.7, cng: 100, lpgOff: 30, q: 'm' }),
  c('jabalpur', 'Jabalpur', 'MP', 3, 'Central', [7000, 11000, 15000], [88, 72, 86, 58, 60, 74],
    { maint: 1.5, deposit: 2, zone: 'C', climate: 0.5, petrol: 115.8, cng: 100, lpgOff: 35, q: 'm' }),
  c('raipur', 'Raipur', 'CG', 2, 'Central', [8500, 14000, 20000], [90, 76, 89, 60, 68, 78],
    { maint: 1.8, deposit: 2, zone: 'C', climate: 0.6, cng: 100, lpgOff: 71, q: 'm' }),
];

export const CITY_BY_ID: Record<string, City> = Object.fromEntries(CITIES.map((x) => [x.id, x]));

export const GROUP_META: Record<Group, { label: string; short: string }> = {
  home: { label: 'Home & bills', short: 'Home' },
  food: { label: 'Food', short: 'Food' },
  help: { label: 'Help at home', short: 'Help' },
  transport: { label: 'Getting around', short: 'Transport' },
  kids: { label: 'Children', short: 'Kids' },
  health: { label: 'Health & insurance', short: 'Health' },
  lifestyle: { label: 'Lifestyle & subscriptions', short: 'Lifestyle' },
  dues: { label: 'Loans & family', short: 'Dues' },
  savings: { label: 'Savings & buffer', short: 'Savings' },
};

/** Chart order — matches the validated categorical palette slots 1–8; savings is drawn neutral. */
export const GROUP_ORDER: Group[] = ['home', 'food', 'help', 'transport', 'kids', 'health', 'lifestyle', 'dues', 'savings'];
