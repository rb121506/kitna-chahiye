/*
 * Expense model + smart scaling between cities.
 *
 * Three kinds of line:
 *  - driven   computed from your choices and the city's own prices (rent, electricity, fuel, help, fees…)
 *  - amounts  sliders you set for your city; other cities scale them by the relevant price index
 *  - fixed    same everywhere (EMIs, subscriptions, insurance premiums tied to you, SIPs)
 */
import { CITIES, CITY_BY_ID, LPG_DELHI, STATES, type City } from './cities';
import {
  AMOUNTS, COLLEGE_FEES, COVER_FACTOR, DAYCARE, FURNISH, GOAL_TYPES, HELP_BASE, INFLATION, LOCALITY,
  PRESCHOOL_FEES, SCHOOL_FEES, SENIOR_PREMIUM, SQFT, SUB_BY_ID, SUB_PRESETS, VEHICLES, ZONE_FACTOR,
  criticalIllnessPremium, healthBase, pick, sipForGoal, soloLivingCost, termPerCrore, type IdxKey, type L,
} from './constants';
import { clamp, roundTo } from './format';
import { solveBoth, type SalaryCfg, type Slip, type Solved, type TaxCtx } from './tax';
import {
  LIFESTYLES, type AmountId, type AppState, type Child, type Group, type Lifestyle, type SchoolType,
} from './types';

export interface Line {
  id: string;
  label: string;
  group: Group;
  value: number;
  consumption: boolean;
}

export interface CityCalc {
  city: City;
  lines: Line[];
  groups: Record<Group, number>;
  spend: number;
  buffer: number;
  savings: number;
  need: number;
  needBare: number;
  rent: number;
  emis: number;
  electricityUnits: number;
  ctx: TaxCtx;
  solved: Solved;
  bare?: Solved;
  upfront: number;
  /** slider values as they apply in this city */
  amounts: Record<AmountId, number>;
}

export const lvl = (s: AppState): L => LIFESTYLES.indexOf(s.lifestyle) as L;

export function household(s: AppState) {
  const kids = s.children;
  const count = (a: Child['age']) => kids.filter((k) => k.age === a).length;
  const infants = count('infant');
  const pre = count('preschool');
  const school = count('school');
  const teen = count('teen');
  const college = count('college');
  const atHome = kids.length - college;
  const people = s.adults + atHome + s.seniors;
  const adultEq = s.adults + 0.6 * (school + teen) + 0.3 * (infants + pre) + 0.9 * s.seniors;
  return { infants, pre, school, teen, college, atHome, kids: kids.length, people: Math.max(1, people), adultEq };
}

const hasCar = (s: AppState) => ['hatch', 'suv', 'cng', 'ev'].includes(s.transport.vehicle);

function idx(city: City, key: IdxKey): number {
  return key === 'none' ? 100 : city[key];
}

/** Preset value of an amount at price index 100. */
function amountDefault(id: AmountId, s: AppState): number {
  const l = lvl(s);
  const hh = household(s);
  const A = s.adults;
  const S = s.seniors;
  const P = hh.people;
  const pg = s.housing.type === 'pg';
  switch (id) {
    case 'familyContribution': return pick(l, [5000, 10000, 15000, 25000]);
    case 'water': return pg ? 0 : pick(l, [250, 400, 600, 900]) * (1 + 0.15 * (P - 1));
    case 'broadband': return pg ? 0 : pick(l, [707, 825, 1180, 1770]);
    case 'mobile': return (A + hh.teen + hh.college) * pick(l, [380, 450, 600, 1000]) + S * 300;
    case 'groceries': return pick(l, [3800, 5200, 7500, 11000]) * Math.pow(hh.adultEq, 0.85) * (pg ? 0.25 : 1);
    case 'dining': return pick(l, [1000, 3500, 6000, 14000]) * (A + 0.4 * hh.atHome + 0.4 * S);
    case 'deliveryOrders': return Math.round(pick(l, [2, 8, 12, 20]) * (1 + 0.35 * (A - 1)));
    case 'cabs': {
      const v = s.transport.vehicle;
      return pick(l, [800, 3000, 6000, 12000]) * (hasCar(s) ? 0.5 : v === 'bike' ? 0.7 : 1) * (1 + 0.4 * (A - 1));
    }
    case 'transit': return pick(l, [1200, 700, 200, 0]) * A * (s.transport.vehicle !== 'none' ? 0.4 : 1);
    case 'coaching': return hh.school * pick(l, [0, 1000, 2500, 5000]) + hh.teen * pick(l, [1500, 4000, 7000, 12000]);
    case 'activities': return (hh.pre + hh.school + hh.teen) * pick(l, [300, 1500, 3500, 7000]);
    case 'medicines': return P * pick(l, [300, 600, 1000, 2000]) + S * pick(l, [1500, 2500, 4000, 6000]);
    case 'gym': return A * pick(l, [0, 1500, 3000, 7000]);
    case 'otherSubs': return pick(l, [0, 0, 300, 1000]);
    case 'shopping': return (A + 0.6 * hh.kids + 0.4 * S) * pick(l, [1200, 3000, 5500, 15000]);
    case 'personalCare': return (A + 0.2 * hh.kids + 0.4 * S) * pick(l, [500, 1200, 2500, 6000]);
    case 'entertainment': return pick(l, [800, 2500, 5000, 12000]) * (1 + 0.35 * (P - 1));
    case 'travelYear': return (A + 0.6 * (hh.kids + S)) * pick(l, [12000, 50000, 120000, 350000]);
    case 'festivalsYear': return pick(l, [12000, 35000, 90000, 250000]) * (1 + 0.15 * (P - 1));
    case 'gadgetsYear': return (A + 0.5 * (hh.teen + hh.college)) * pick(l, [6000, 25000, 60000, 150000]);
    default: return 0;
  }
}

/** The value a slider shows for your own city. */
export function amountHome(id: AmountId, s: AppState, home: City): number {
  const o = s.amounts[id];
  if (o !== undefined) return o;
  const def = AMOUNTS[id];
  return roundTo(amountDefault(id, s) * idx(home, def.idx) / 100, def.step);
}

function amountIn(id: AmountId, s: AppState, city: City, home: City): number {
  const def = AMOUNTS[id];
  const h = amountHome(id, s, home);
  return def.count ? h : h * idx(city, def.idx) / idx(home, def.idx);
}

export function estRent(s: AppState, city: City): number {
  const { bhk, locality, furnish, type } = s.housing;
  if (type === 'pg') {
    const locF = { budget: 0.85, standard: 1, prime: 1.3, luxury: 1.6 }[locality];
    return (0.35 * city.rent[0] + 3000) * locF * s.adults;
  }
  const base = bhk === 4 ? city.rent[2] * 1.45 : city.rent[bhk - 1];
  return base * LOCALITY[locality].rent * FURNISH[furnish];
}

export function rentFor(s: AppState, city: City, home: City): number {
  const t = s.housing.type;
  if (t !== 'rent' && t !== 'pg') return 0;
  const o = s.rentOverrides[city.id];
  if (o !== undefined) return o;
  const est = estRent(s, city);
  if (s.housing.customRent != null) return s.housing.customRent * est / estRent(s, home);
  return roundTo(est, 500);
}

function estMaintenance(s: AppState, city: City): number {
  const t = s.housing.type;
  if (t === 'pg' || t === 'family') return 0;
  if (t === 'rent' && city.maintInRent) return 0;
  return SQFT[s.housing.bhk] * city.maint * LOCALITY[s.housing.locality].maint;
}

function estParking(s: AppState, city: City): number {
  const spec = VEHICLES[s.transport.vehicle];
  if (s.transport.vehicle === 'none') return 0;
  const mumbaiCar = city.id === 'mumbai' && hasCar(s) ? 2 : 1;
  return spec.parking[city.tier - 1] * mumbaiCar * pick(lvl(s), [0.6, 1, 1.3, 1.6]);
}

function withOverride(id: AmountId, s: AppState, city: City, home: City, est: (c: City) => number): number {
  const o = s.amounts[id];
  if (o === undefined) return est(city);
  const h = est(home);
  if (h > 0) return o * est(city) / h;
  return o;
}

export function helpEstimate(s: AppState, city: City) {
  const hh = household(s);
  const hi = city.help / 100;
  return {
    cleaning: HELP_BASE.cleaning[s.housing.bhk] * hi,
    cook: (meals: 1 | 2 | 3) =>
      (HELP_BASE.cookBase + HELP_BASE.cookPerPerson * Math.min(5, hh.people - 1)) * { 1: 0.6, 2: 1, 3: 1.35 }[meals] * hi,
    fullTime: HELP_BASE.fullTime * hi,
    nanny: HELP_BASE.nanny * hi,
    driver: HELP_BASE.driver * hi,
    elderCare: HELP_BASE.elderCare * hi,
    laundry: (400 + 250 * hh.people) * hi,
  };
}

export function electricityUnits(s: AppState, city: City): number {
  if (s.housing.type === 'pg') return 0;
  const hh = household(s);
  const l = lvl(s);
  const { acs, acHours, wfh } = s.bills;
  let units = 40 + 35 * hh.people + (wfh ? 60 : 0) + pick(l, [0, 20, 50, 100]);
  units += acs * acHours * 30 * 1.1 * 0.7 * city.climate;
  units += city.heat * (1 + 0.15 * (hh.people - 1)) * (l === 0 ? 0.5 : 1);
  return units;
}

export function electricityBill(city: City, units: number, subsidy: boolean): number {
  const st = STATES[city.state];
  const [b1, b3, b6] = st.elec;
  let bill: number;
  if (units <= 100) bill = (b1 * units) / 100;
  else if (units <= 300) bill = b1 + ((b3 - b1) * (units - 100)) / 200;
  else if (units <= 600) bill = b3 + ((b6 - b3) * (units - 300)) / 300;
  else bill = b6 + ((b6 - b3) / 300) * 1.1 * (units - 600);
  bill *= 1.1;
  if (subsidy && st.subsidy === 'DL') {
    if (units <= 200) bill = 0;
    else if (units <= 400) bill -= Math.min(800, bill * 0.5);
  }
  if (subsidy && st.subsidy === 'PB' && units <= 300) bill = 0;
  if (subsidy && st.subsidy === 'KA' && units <= 200) bill = 0;
  return bill;
}

function evRate(city: City): number {
  const [, b3, b6] = STATES[city.state].elec;
  const marginal = Math.max(6, ((b6 - b3) / 300) * 1.1);
  return 0.7 * marginal + 0.3 * 22;
}

export function salaryCfg(s: AppState): SalaryCfg {
  const x = s.salary;
  return { basicPct: x.basicPct, pf: x.pf, gratuity: x.gratuity, variablePct: x.variablePct, npsPct: x.npsPct, nps80ccd1b: x.nps80ccd1b };
}

const NON_CONSUMPTION = new Set(['homeLoanEmi', 'carEmi', 'personalEmi', 'educationEmi', 'ccRepay', 'bnpl', 'familySupport', 'donations', 'termInsurance', 'spouseTermInsurance']);

export function computeCity(s: AppState, city: City, home: City, opts: { bare?: boolean } = {}): CityCalc {
  const l = lvl(s);
  const hh = household(s);
  const lines: Line[] = [];
  const add = (id: string, label: string, group: Group, value: number) => {
    if (value > 0.5) lines.push({ id, label, group, value, consumption: group !== 'savings' && !NON_CONSUMPTION.has(id) });
  };
  const amounts = {} as Record<AmountId, number>;
  const amt = (id: AmountId) => (amounts[id] = amountIn(id, s, city, home));
  const H = s.housing;
  const helpIdx = city.help / 100;

  // ——— Home & bills ———
  const rent = rentFor(s, city, home);
  if (H.type === 'pg') add('pg', 'PG / shared room', 'home', rent);
  else add('rent', `Rent · ${H.bhk} BHK`, 'home', rent);
  if (H.type === 'ownLoan') add('homeLoanEmi', 'Home loan EMI', 'home', H.homeLoanEmi);
  if (H.type === 'family') add('familyContribution', 'Contribution to household', 'home', amt('familyContribution'));
  const maint = withOverride('maintenance', s, city, home, (c) => estMaintenance(s, c));
  amounts.maintenance = maint;
  add('maintenance', 'Society maintenance', 'home', maint);
  if (H.type === 'own' || H.type === 'ownLoan') {
    const rate = city.id === 'mumbai' ? 14 : [10, 6, 4][city.tier - 1];
    add('propertyTax', 'Property tax', 'home', (SQFT[H.bhk] * rate * LOCALITY[H.locality].maint) / 12);
  }
  let brokerage = 0;
  if (H.moveIn && (H.type === 'rent' || H.type === 'pg')) {
    brokerage = rent * (city.tier === 1 ? 1 : 0.5);
    const shifting = H.type === 'pg' ? 3000 : (5000 + 5000 * H.bhk) * (city.tier === 1 ? 1.2 : 1);
    add('moveIn', 'Brokerage & shifting (÷11 months)', 'home', (brokerage + shifting) / 11);
  }
  const units = electricityUnits(s, city);
  if (H.type !== 'pg') {
    lines.push({ id: 'electricity', label: 'Electricity', group: 'home', value: electricityBill(city, units, s.bills.subsidy), consumption: true });
  }
  if (H.type !== 'pg') {
    const cylinders = 0.35 + 0.17 * hh.people + (s.help.cook ? 0.1 : 0);
    add('cookingGas', 'Cooking gas (LPG)', 'home', cylinders * (LPG_DELHI + city.lpgOff));
  }
  add('water', 'Water & tanker', 'home', amt('water'));
  add('broadband', 'Broadband', 'home', amt('broadband'));
  add('mobile', 'Mobile plans', 'home', amt('mobile'));

  // ——— Food ———
  add('groceries', 'Groceries, milk & essentials', 'food', amt('groceries'));
  add('dining', 'Eating out', 'food', amt('dining'));
  const orders = amt('deliveryOrders');
  add('delivery', `Food delivery · ${orders} orders`, 'food', orders * pick(l, [380, 520, 720, 1050]) * city.dine / 100);

  // ——— Help ———
  if (H.type !== 'pg') {
    const hp = s.help;
    const est = helpEstimate(s, city);
    if (hp.cleaning) add('cleaning', 'Maid · sweeping, mopping, dishes', 'help', est.cleaning);
    if (hp.cook) add('cook', `Cook · ${hp.cook} meal${hp.cook > 1 ? 's' : ''} a day`, 'help', est.cook(hp.cook));
    if (hp.fullTime) add('fullTime', 'Full-time house help', 'help', est.fullTime);
    if (hp.nanny) add('nanny', 'Nanny / babysitter', 'help', est.nanny);
    if (hp.driver) add('driver', 'Driver', 'help', est.driver);
    if (hp.elderCare) add('elderCare', 'Elder-care attendant', 'help', est.elderCare);
    if (hp.laundry) add('laundry', 'Laundry & ironing', 'help', est.laundry);
  }

  // ——— Transport ———
  const v = s.transport.vehicle;
  const spec = VEHICLES[v];
  if (v !== 'none') {
    const km = s.transport.km;
    const price = spec.fuel === 'petrol' ? city.petrol : spec.fuel === 'cng' ? city.cng : evRate(city);
    add('fuel', spec.fuel === 'electric' ? 'Charging' : spec.fuel === 'cng' ? 'CNG' : 'Petrol', 'transport', (km / spec.eff) * price);
    add('vehicleUpkeep', 'Insurance, service & cleaning', 'transport',
      ((spec.insurance + spec.service) / 12) * (0.85 + 0.15 * city.col / 100) + spec.cleaning * helpIdx);
  }
  const parking = withOverride('parking', s, city, home, (c) => estParking(s, c));
  amounts.parking = parking;
  add('parking', 'Parking & tolls', 'transport', parking);
  add('cabs', 'Cabs, autos & bike taxis', 'transport', amt('cabs'));
  add('transit', 'Metro, bus & train', 'transport', amt('transit'));

  // ——— Children ———
  let fees = 0, schoolBus = 0, daycare = 0, baby = 0, college = 0, collegeLiving = 0, tuition = 0;
  const sIdx = city.school / 100;
  const tIdx = city.transit / 100;
  s.children.forEach((k, i) => {
    const counts80c = i < 2;
    const busFor = (t: SchoolType, f: number) => (t === 'govt' ? 0 : 2500 * tIdx * f * (t === 'premium' || t === 'intl' ? 1.3 : 1));
    if (k.age === 'infant') {
      baby += pick(l, [3500, 5000, 7500, 12000]) * city.col / 100;
      if (s.bothWork && !s.help.nanny) daycare += DAYCARE[k.school] * sIdx;
    } else if (k.age === 'preschool') {
      const f = (PRESCHOOL_FEES[k.school] / 12) * sIdx;
      fees += f;
      if (counts80c) tuition += f * 12 * 0.8;
      if (s.bothWork && !s.help.nanny) daycare += DAYCARE[k.school] * 0.5 * sIdx;
      schoolBus += busFor(k.school, 0.7);
    } else if (k.age === 'school' || k.age === 'teen') {
      const f = ((SCHOOL_FEES[k.school] * (k.age === 'teen' ? 1.15 : 1)) / 12) * sIdx;
      fees += f;
      if (counts80c) tuition += f * 12 * 0.8;
      schoolBus += busFor(k.school, 1);
    } else {
      college += COLLEGE_FEES[k.school] / 12;
      if (counts80c) tuition += COLLEGE_FEES[k.school] * 0.8;
      collegeLiving += pick(l, [4000, 8000, 12000, 20000]);
    }
  });
  add('schoolFees', 'School & preschool fees', 'kids', fees);
  add('schoolBus', 'School bus / van', 'kids', schoolBus);
  add('daycare', 'Daycare / creche', 'kids', daycare);
  add('babyEssentials', 'Diapers, formula & baby care', 'kids', baby);
  if (hh.school + hh.teen > 0) add('coaching', 'Tuition & coaching', 'kids', amt('coaching'));
  if (hh.pre + hh.school + hh.teen > 0) add('activities', 'Classes, sports & hobbies', 'kids', amt('activities'));
  add('college', 'College fees', 'kids', college);
  add('collegeLiving', 'Hostel & pocket money', 'kids', collegeLiving);

  // ——— Health & insurance ———
  const zone = ZONE_FACTOR[city.zone];
  const healthAnnual = s.health.cover > 0
    ? healthBase(s.age) * (1 + 0.55 * (s.adults - 1) + 0.2 * hh.kids) * COVER_FACTOR[s.health.cover] * zone
    : 0;
  const parentsAnnual = s.seniors > 0 && s.health.parentsCover > 0
    ? s.seniors * SENIOR_PREMIUM * COVER_FACTOR[s.health.parentsCover] * zone * (s.seniors > 1 ? 0.9 : 1)
    : 0;
  const termAnnual = s.health.termCr * termPerCrore(s.age);
  add('healthInsurance', `Health insurance · ₹${s.health.cover >= 100 ? '1 Cr' : s.health.cover + ' L'}`, 'health', healthAnnual / 12);
  add('parentsInsurance', 'Parents’ health insurance', 'health', parentsAnnual / 12);
  add('termInsurance', `Term life · ₹${s.health.termCr} Cr`, 'health', termAnnual / 12);
  if (s.adults >= 2) {
    add('spouseTermInsurance', `Spouse’s term life · ₹${s.health.spouseTermCr} Cr`, 'health', (s.health.spouseTermCr * termPerCrore(s.age)) / 12);
  }
  add('criticalIllness', `Critical illness cover · ₹${s.health.criticalIllness} L`, 'health', criticalIllnessPremium(s.age, s.health.criticalIllness) / 12);
  add('medicines', 'Doctor visits & medicines', 'health', amt('medicines'));
  add('gym', 'Gym & fitness', 'health', amt('gym'));

  // ——— Lifestyle ———
  const subs = s.subs.reduce((t, id) => t + (SUB_BY_ID[id]?.monthly ?? 0), 0);
  add('subscriptions', `Subscriptions · ${s.subs.length}`, 'lifestyle', subs);
  add('otherSubs', 'Other apps & memberships', 'lifestyle', amt('otherSubs'));
  add('shopping', 'Clothes & shopping', 'lifestyle', amt('shopping'));
  add('personalCare', 'Salon & personal care', 'lifestyle', amt('personalCare'));
  add('entertainment', 'Movies, events & nights out', 'lifestyle', amt('entertainment'));
  add('travel', 'Holidays & trips home', 'lifestyle', amt('travelYear') / 12);
  add('festivals', 'Festivals, weddings & gifts', 'lifestyle', amt('festivalsYear') / 12);
  add('gadgets', 'Phones, gadgets & appliances', 'lifestyle', amt('gadgetsYear') / 12);
  if (s.pets > 0) add('pets', `Pets · ${s.pets}`, 'lifestyle', s.pets * pick(l, [2500, 3500, 6000, 10000]) * city.col / 100);

  // ——— Loans & family ———
  add('carEmi', 'Car / bike loan EMI', 'dues', amt('carEmi'));
  add('personalEmi', 'Personal loan EMI', 'dues', amt('personalEmi'));
  add('educationEmi', 'Education loan EMI', 'dues', amt('educationEmi'));
  add('ccRepay', 'Credit card dues', 'dues', amt('ccRepay'));
  add('bnpl', 'No-cost EMIs & pay-later', 'dues', amt('bnpl'));
  add('familySupport', 'Money sent to family', 'dues', amt('familySupport'));
  add('donations', 'Donations', 'dues', amt('donations'));

  // ——— Savings ———
  const spend = lines.reduce((t, x) => t + x.value, 0);
  const consumption = lines.reduce((t, x) => t + (x.consumption ? x.value : 0), 0);
  const buffer = consumption * s.savings.buffer;
  add('buffer', `Surprise buffer · ${Math.round(s.savings.buffer * 100)}%`, 'savings', buffer);
  if (s.salary.nps80ccd1b) add('nps', 'NPS · 80CCD(1B)', 'savings', 50000 / 12);
  const ef = s.savings.efOn ? (s.savings.efMonths * (spend + buffer)) / (s.savings.efYears * 12) : 0;
  add('emergencyFund', `Emergency fund · ${s.savings.efMonths} months`, 'savings', ef);
  let goalTotal = 0;
  for (const g of s.goals) {
    const monthly = sipForGoal(g.target, g.years, g.returnPct, g.current);
    goalTotal += monthly;
    add(`goal-${g.id}`, `${g.name || GOAL_TYPES[g.type].label} · goal`, 'savings', monthly);
  }
  const sip = amt('sip');
  let need: number;
  const core = spend + buffer + ef + goalTotal + (s.salary.nps80ccd1b ? 50000 / 12 : 0);
  if (s.savings.mode === 'rate') {
    need = core / (1 - s.savings.rate);
    add('savingsGoal', `Savings goal · ${Math.round(s.savings.rate * 100)}% of take-home`, 'savings', need - core);
  } else {
    add('sip', 'SIPs & investments', 'savings', sip);
    need = core + sip;
  }
  const needBare = spend + buffer;

  const groups = { home: 0, food: 0, help: 0, transport: 0, kids: 0, health: 0, lifestyle: 0, dues: 0, savings: 0 } as Record<Group, number>;
  for (const x of lines) groups[x.group] += x.value;

  const ctx: TaxCtx = {
    ptAnnual: STATES[city.state].pt,
    hraMetro: !!city.hraMetro,
    rentMonthly: H.type === 'rent' || H.type === 'pg' ? rent : 0,
    homeLoanEmi: H.type === 'ownLoan' ? H.homeLoanEmi : 0,
    health80dSelf: healthAnnual,
    health80dParents: parentsAnnual,
    termPremium: termAnnual,
    tuition,
  };
  const cfg = salaryCfg(s);
  const solved = solveBoth(need, cfg, ctx, s.salary.regime);
  const bare = opts.bare ? solveBoth(needBare, cfg, ctx, s.salary.regime) : undefined;
  const emis = ['homeLoanEmi', 'carEmi', 'personalEmi', 'educationEmi', 'ccRepay', 'bnpl']
    .reduce((t, id) => t + (lines.find((x) => x.id === id)?.value ?? 0), 0);
  const upfront = H.type === 'rent' ? rent * city.deposit + brokerage : H.type === 'pg' ? rent : 0;

  return {
    city, lines, groups, spend, buffer, savings: groups.savings, need, needBare, rent, emis,
    electricityUnits: units, ctx, solved, bare, upfront, amounts,
  };
}

export interface EarnerSolve {
  label: string;
  city: City;
  slip: Slip;
  need: number;
  away: number;
}

export interface HouseholdSolve {
  dual: boolean;
  primary: EarnerSolve;
  second?: EarnerSolve;
  combinedCtc: number;
  combinedTakeHome: number;
}

/**
 * Splits the household's required take-home between two earners when a second income is on.
 * Same-city: the two simply split the shared need. A different city adds that earner's own
 * solo cost of living (rent + groceries + transport for one adult, at that city's prices) on top
 * of their share — a simplified stand-in for maintaining a second home.
 */
export function solveHousehold(s: AppState, calc: CityCalc, home: City): HouseholdSolve {
  const primaryBase: EarnerSolve = { label: 'You', city: home, slip: calc.solved.best, need: calc.need, away: 0 };
  if (!s.secondEarner.enabled) {
    return { dual: false, primary: primaryBase, combinedCtc: calc.solved.best.ctc, combinedTakeHome: calc.solved.best.inHandMonthly };
  }
  const split = clamp(s.secondEarner.splitPct, 0, 1);
  const secondCity = s.secondEarner.cityId === 'same' ? home : (CITY_BY_ID[s.secondEarner.cityId] ?? home);
  const away = secondCity.id !== home.id ? soloLivingCost(secondCity) : 0;
  const primaryNeed = calc.need * (1 - split);
  const secondNeed = calc.need * split + away;
  const primarySolved = solveBoth(primaryNeed, salaryCfg(s), calc.ctx, s.salary.regime);
  const secondCfg: SalaryCfg = { basicPct: s.secondEarner.basicPct, pf: s.salary.pf, gratuity: s.salary.gratuity, variablePct: 0, npsPct: 0, nps80ccd1b: false };
  const secondCtx: TaxCtx = {
    ptAnnual: STATES[secondCity.state].pt,
    hraMetro: !!secondCity.hraMetro,
    rentMonthly: away > 0 ? secondCity.rent[0] * 0.85 : 0,
    homeLoanEmi: 0, health80dSelf: 0, health80dParents: 0, termPremium: 0, tuition: 0,
  };
  const secondSolved = solveBoth(secondNeed, secondCfg, secondCtx, s.secondEarner.regime);
  const primary: EarnerSolve = { label: 'You', city: home, slip: primarySolved.best, need: primaryNeed, away: 0 };
  const second: EarnerSolve = { label: 'Partner', city: secondCity, slip: secondSolved.best, need: secondNeed, away };
  return {
    dual: true, primary, second,
    combinedCtc: primary.slip.ctc + second.slip.ctc,
    combinedTakeHome: primary.slip.inHandMonthly + second.slip.inHandMonthly,
  };
}

export function computeAll(s: AppState) {
  const home = CITY_BY_ID[s.cityId] ?? CITIES[0];
  const homeCalc = computeCity(s, home, home, { bare: true });
  const all = CITIES.map((c) => (c.id === home.id ? homeCalc : computeCity(s, c, home)));
  return { home: homeCalc, all };
}

export interface ProjectionPoint {
  year: number;
  need: number;
  ctc: number;
}

export function project(s: AppState, calc: CityCalc, years = 10): ProjectionPoint[] {
  const cfg = salaryCfg(s);
  const out: ProjectionPoint[] = [];
  for (let t = 0; t <= years; t++) {
    const grow = (id: string) => Math.pow(1 + (INFLATION[id] ?? 0.05), t);
    let spend = 0;
    let consumption = 0;
    for (const x of calc.lines) {
      if (x.group === 'savings') continue;
      const v = x.value * grow(x.id);
      spend += v;
      if (x.consumption) consumption += v;
    }
    const buffer = consumption * s.savings.buffer;
    const ef = s.savings.efOn ? (s.savings.efMonths * (spend + buffer)) / (s.savings.efYears * 12) : 0;
    // years-remaining shrinks as t grows, so goal contributions are re-solved, not merely inflated
    const goalTotal = s.goals.reduce((sum, g) => sum + sipForGoal(g.target, Math.max(1, g.years - t), g.returnPct, g.current), 0);
    const core = spend + buffer + ef + goalTotal + (s.salary.nps80ccd1b ? 50000 / 12 : 0);
    const sip = (calc.lines.find((x) => x.id === 'sip')?.value ?? 0) * grow('sip');
    const need = s.savings.mode === 'rate' ? core / (1 - s.savings.rate) : core + sip;
    const ctx: TaxCtx = {
      ...calc.ctx,
      rentMonthly: calc.ctx.rentMonthly * grow('rent'),
      health80dSelf: calc.ctx.health80dSelf * grow('healthInsurance'),
      health80dParents: calc.ctx.health80dParents * grow('parentsInsurance'),
      tuition: calc.ctx.tuition * grow('schoolFees'),
    };
    out.push({ year: t, need, ctc: solveBoth(need, cfg, ctx, s.salary.regime).best.ctc });
  }
  return out;
}

// ——— Presets & state ———

export function applyPreset(s: AppState, lifestyle: Lifestyle, force: boolean): AppState {
  const next: AppState = structuredClone(s);
  next.lifestyle = lifestyle;
  if (force) {
    next.amounts = {};
    next.touched = {};
  }
  const l = lvl(next);
  const hh = household(next);
  const P = hh.people;
  const free = (k: string) => force || !s.touched[k];
  const H = next.housing;

  if (free('housing.type') && (H.type === 'rent' || H.type === 'pg')) {
    H.type = next.adults === 1 && hh.kids === 0 && next.seniors === 0 && l === 0 ? 'pg' : 'rent';
  }
  if (free('housing.bhk')) {
    const table: [1 | 2 | 3 | 4, 1 | 2 | 3 | 4, 1 | 2 | 3 | 4, 1 | 2 | 3 | 4] =
      P <= 1 ? [1, 1, 2, 3] : P === 2 ? [1, 2, 2, 3] : P <= 4 ? [2, 2, 3, 4] : [2, 3, 4, 4];
    H.bhk = pick(l, table);
  }
  if (free('housing.locality')) H.locality = pick(l, ['budget', 'standard', 'prime', 'luxury']);
  if (free('housing.furnish')) H.furnish = pick(l, ['semi', 'semi', 'full', 'full']);
  if (free('bills.acs')) next.bills.acs = pick(l, [0, Math.max(1, H.bhk - 1), H.bhk, Math.min(4, H.bhk + 1)]);
  if (free('bills.acHours')) next.bills.acHours = pick(l, [0, 6, 8, 10]);

  const young = hh.infants + hh.pre > 0;
  if (free('help.cleaning')) next.help.cleaning = l >= 1 || P >= 3;
  if (free('help.cook')) next.help.cook = pick(l, [0, P >= 3 ? 2 : 0, 2, 3]) as 0 | 1 | 2 | 3;
  if (free('help.fullTime')) next.help.fullTime = l === 3;
  if (free('help.nanny')) next.help.nanny = l >= 2 && young && next.bothWork;
  if (free('help.driver')) next.help.driver = l === 3;
  if (free('help.laundry')) next.help.laundry = l >= 2;

  if (free('transport.vehicle')) {
    const solo = next.adults === 1 && hh.kids === 0;
    next.transport.vehicle = solo ? pick(l, ['none', 'bike', 'hatch', 'suv']) : pick(l, ['bike', 'hatch', 'suv', 'suv']);
  }
  if (free('transport.km')) next.transport.km = VEHICLES[next.transport.vehicle].km[l];

  if (free('health.cover')) next.health.cover = pick(l, [next.health.employerCover ? 0 : 5, 10, 25, 100]);
  if (free('health.parentsCover')) next.health.parentsCover = next.seniors > 0 ? pick(l, [5, 10, 10, 25]) : 0;
  if (free('health.termCr')) {
    const dependents = next.adults > 1 || hh.kids > 0 || next.seniors > 0;
    next.health.termCr = dependents ? pick(l, [0.5, 1, 2, 3]) : pick(l, [0, 0, 0.5, 1]);
  }
  if (free('health.spouseTermCr')) {
    next.health.spouseTermCr = next.adults > 1 && (hh.kids > 0 || next.seniors > 0) ? pick(l, [0.5, 1, 1, 2]) : 0;
  }
  if (free('health.criticalIllness')) next.health.criticalIllness = pick(l, [0, 10, 25, 25]);
  if (free('subs')) next.subs = [...SUB_PRESETS[l]];
  if (free('savings.rate')) next.savings.rate = pick(l, [0.1, 0.2, 0.25, 0.3]);
  if (free('savings.buffer')) next.savings.buffer = pick(l, [0.05, 0.05, 0.07, 0.1]);
  next.children = next.children.map((k) => (free(`child.${k.id}`) ? { ...k, school: pick(l, ['budget', 'mid', 'premium', 'intl']) } : k));
  return next;
}

export function defaultState(): AppState {
  const base: AppState = {
    v: 3,
    cityId: 'bengaluru',
    lifestyle: 'comfortable',
    adults: 2,
    seniors: 0,
    pets: 0,
    children: [{ id: 'k1', age: 'school', school: 'mid' }],
    age: 32,
    bothWork: true,
    housing: { type: 'rent', bhk: 2, locality: 'standard', furnish: 'semi', customRent: null, homeLoanEmi: 35000, moveIn: false },
    bills: { acs: 1, acHours: 6, wfh: false, subsidy: true },
    help: { cleaning: true, cook: 2, fullTime: false, nanny: false, driver: false, laundry: false, elderCare: false },
    transport: { vehicle: 'hatch', km: 700 },
    health: { employerCover: true, cover: 10, parentsCover: 0, termCr: 1, spouseTermCr: 0, criticalIllness: 0 },
    subs: [],
    amounts: {},
    goals: [],
    secondEarner: { enabled: false, cityId: 'same', splitPct: 0.5, basicPct: 0.5, regime: 'auto' },
    quickMode: true,
    savings: { mode: 'rate', rate: 0.2, efOn: false, efMonths: 6, efYears: 2, buffer: 0.05 },
    salary: { regime: 'auto', basicPct: 0.5, pf: 'full', gratuity: true, variablePct: 0, npsPct: 0, nps80ccd1b: false },
    offerLpa: null,
    hikePct: 0.08,
    compare: ['pune', 'hyderabad', 'mumbai'],
    rentOverrides: {},
    touched: {},
  };
  return applyPreset(base, 'comfortable', true);
}

/** Adds or removes school-age children so the count matches `n` — used by Quick Estimate's simple stepper. */
export function setKidCount(s: AppState, n: number): AppState {
  const next = structuredClone(s);
  const cur = next.children.length;
  if (n < cur) next.children = next.children.slice(0, n);
  else for (let i = cur; i < n; i++) next.children.push({ id: `k${Date.now().toString(36)}${i}`, age: 'school', school: pick(lvl(next), ['budget', 'mid', 'premium', 'intl']) });
  return next;
}
