import { createContext, useContext } from 'react';
import type { City } from '../lib/cities';
import type { CityCalc, HouseholdSolve } from '../lib/engine';
import type { AppState } from '../lib/types';

export interface UpdateOpts {
  /** mark enumerated fields as hand-set so presets leave them alone */
  touch?: string | string[];
  /** household changed — re-run the preset for fields the user hasn't set */
  household?: boolean;
}

export interface Store {
  state: AppState;
  update: (fn: (draft: AppState) => void, opts?: UpdateOpts) => void;
  replace: (s: AppState) => void;
  home: City;
  /** your city, recomputed instantly */
  calc: CityCalc;
  /** every city, recomputed a beat later so sliders stay smooth */
  all: CityCalc[];
  /** how the required take-home splits across one or two earners */
  household: HouseholdSolve;
}

export const StoreCtx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(StoreCtx);
  if (!s) throw new Error('StoreCtx missing');
  return s;
}
