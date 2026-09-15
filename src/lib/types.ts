export type Lifestyle = 'essentials' | 'comfortable' | 'premium' | 'luxury';
export const LIFESTYLES: Lifestyle[] = ['essentials', 'comfortable', 'premium', 'luxury'];

export type HousingType = 'rent' | 'pg' | 'ownLoan' | 'own' | 'family';
export type Locality = 'budget' | 'standard' | 'prime' | 'luxury';
export type Furnish = 'unfurnished' | 'semi' | 'full';
export type Vehicle = 'none' | 'bike' | 'hatch' | 'suv' | 'cng' | 'ev';
export type AgeBand = 'infant' | 'preschool' | 'school' | 'teen' | 'college';
export type SchoolType = 'govt' | 'budget' | 'mid' | 'premium' | 'intl';
export type Regime = 'new' | 'old';
export type PfMode = 'full' | 'capped' | 'none';
export type SavingsMode = 'rate' | 'fixed';

export type Group = 'home' | 'food' | 'help' | 'transport' | 'kids' | 'health' | 'lifestyle' | 'dues' | 'savings';

export interface Child {
  id: string;
  age: AgeBand;
  school: SchoolType;
}

/** Amount-style inputs the user can drag. Stored only when the user overrides the preset. */
export type AmountId =
  | 'maintenance'
  | 'familyContribution'
  | 'water'
  | 'broadband'
  | 'mobile'
  | 'groceries'
  | 'dining'
  | 'deliveryOrders'
  | 'parking'
  | 'cabs'
  | 'transit'
  | 'coaching'
  | 'activities'
  | 'medicines'
  | 'gym'
  | 'otherSubs'
  | 'shopping'
  | 'personalCare'
  | 'entertainment'
  | 'travelYear'
  | 'festivalsYear'
  | 'gadgetsYear'
  | 'carEmi'
  | 'personalEmi'
  | 'educationEmi'
  | 'ccRepay'
  | 'bnpl'
  | 'familySupport'
  | 'donations'
  | 'sip';

export type GoalType = 'house' | 'education' | 'retirement' | 'custom';

export interface Goal {
  id: string;
  type: GoalType;
  name: string;
  target: number;
  years: number;
  returnPct: number;
  current: number;
}

export interface SecondEarner {
  enabled: boolean;
  /** 'same' = works in the household's home city */
  cityId: string;
  /** share (0..1) of the shared household need this earner covers */
  splitPct: number;
  basicPct: number;
  regime: 'auto' | Regime;
}

export interface AppState {
  v: 3;
  cityId: string;
  lifestyle: Lifestyle;
  adults: number;
  seniors: number;
  pets: number;
  children: Child[];
  age: number;
  bothWork: boolean;
  housing: {
    type: HousingType;
    bhk: 1 | 2 | 3 | 4;
    locality: Locality;
    furnish: Furnish;
    customRent: number | null;
    homeLoanEmi: number;
    moveIn: boolean;
  };
  bills: { acs: number; acHours: number; wfh: boolean; subsidy: boolean };
  help: {
    cleaning: boolean;
    cook: 0 | 1 | 2 | 3;
    fullTime: boolean;
    nanny: boolean;
    driver: boolean;
    laundry: boolean;
    elderCare: boolean;
  };
  transport: { vehicle: Vehicle; km: number };
  health: {
    employerCover: boolean;
    cover: number;
    parentsCover: number;
    termCr: number;
    spouseTermCr: number;
    criticalIllness: number;
  };
  subs: string[];
  amounts: Partial<Record<AmountId, number>>;
  goals: Goal[];
  secondEarner: SecondEarner;
  /** true = the compact 4-field entry point is shown instead of the full sidebar */
  quickMode: boolean;
  savings: {
    mode: SavingsMode;
    rate: number;
    efOn: boolean;
    efMonths: number;
    efYears: number;
    buffer: number;
  };
  salary: {
    regime: 'auto' | Regime;
    basicPct: number;
    pf: PfMode;
    gratuity: boolean;
    variablePct: number;
    npsPct: number;
    nps80ccd1b: boolean;
  };
  offerLpa: number | null;
  hikePct: number;
  compare: string[];
  rentOverrides: Record<string, number>;
  /** enumerated fields the user set by hand; presets leave these alone */
  touched: Record<string, true>;
}
