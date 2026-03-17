import { createContext, useContext, useState, useCallback } from 'react';
import { INTAKE_CONTEXT_KEY } from '../constants/options';

/**
 * SearchContext — persists the user's last search and result
 * across tab switches and page refreshes.
 *
 * Shape of searchState:
 * {
 *   conditionId:      string | null,   e.g. 'CAP'
 *   conditionName_fil: string | null,  e.g. 'Pulmonya'
 *   conditionName_en:  string | null,  e.g. 'Community-Acquired Pneumonia'
 *   memberType:       string | null,   e.g. 'SSS'
 *   hospitalLevel:    string | null,   e.g. 'level2'
 *   hospitalType:     string | null,   e.g. 'DOH'
 *   roomType:         string | null,   e.g. 'WARD'
 *   hospitalId:       string | null,   e.g. 'east-avenue-medical-center'
 *   hospitalName:     string | null,   e.g. 'East Avenue Medical Center'
 *   hospitalCity:     string | null,   e.g. 'Quezon City'
 *   hospitalProvince: string | null,   e.g. 'Metro Manila'
 *   coverageVariantKey:string | null,   e.g. 'high_risk'
 *   resultSource:     string | null,   → 'find' | 'intake' | 'saved'
 *   result:           object | null,   → full output from coverage engine
 *   intakeContext:    object | null,   → last completed smart intake context
 *   intakeResult:     object | null,   → last smart intake result view payload
 * }
 */

const STORAGE_KEY = 'koberko_last_search';

const INITIAL_STATE = {
  conditionId: null,
  conditionName_fil: null,
  conditionName_en: null,
  memberType: null,
  hospitalLevel: null,
  hospitalType: null,
  roomType: null,
  hospitalId: null,
  hospitalName: null,
  hospitalCity: null,
  hospitalProvince: null,
  coverageVariantKey: null,
  resultSource: null,
  result: null,
  intakeContext: null,
  intakeResult: null,
};

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const intakeRaw = localStorage.getItem(INTAKE_CONTEXT_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const intakeContext = intakeRaw ? JSON.parse(intakeRaw) : null;

    return {
      conditionId: parsed.conditionId ?? null,
      conditionName_fil: parsed.conditionName_fil ?? null,
      conditionName_en: parsed.conditionName_en ?? null,
      memberType: parsed.memberType ?? null,
      hospitalLevel: parsed.hospitalLevel ?? null,
      hospitalType: parsed.hospitalType ?? null,
      roomType: parsed.roomType ?? null,
      hospitalId: parsed.hospitalId ?? null,
      hospitalName: parsed.hospitalName ?? null,
      hospitalCity: parsed.hospitalCity ?? null,
      hospitalProvince: parsed.hospitalProvince ?? null,
      coverageVariantKey: parsed.coverageVariantKey ?? null,
      resultSource: parsed.resultSource ?? null,
      result: parsed.result ?? null,
      intakeContext,
      intakeResult: parsed.intakeResult ?? null,
    };
  } catch {
    return INITIAL_STATE;
  }
}

function saveToStorage(state) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        conditionId: state.conditionId,
        conditionName_fil: state.conditionName_fil,
        conditionName_en: state.conditionName_en,
        memberType: state.memberType,
        hospitalLevel: state.hospitalLevel,
        hospitalType: state.hospitalType,
        roomType: state.roomType,
        hospitalId: state.hospitalId,
        hospitalName: state.hospitalName,
        hospitalCity: state.hospitalCity,
        hospitalProvince: state.hospitalProvince,
        coverageVariantKey: state.coverageVariantKey,
        resultSource: state.resultSource,
        result: state.result,
        intakeResult: state.intakeResult ?? null,
      }),
    );

    if (state.intakeContext) {
      localStorage.setItem(INTAKE_CONTEXT_KEY, JSON.stringify(state.intakeContext));
    } else {
      localStorage.removeItem(INTAKE_CONTEXT_KEY);
    }
  } catch {
    // Fail silently if storage is full or unavailable
  }
}

// ============================================================
// Context
// ============================================================
const SearchContext = createContext(null);

export function SearchProvider({ children }) {
  const [searchState, setSearchStateRaw] = useState(() => loadFromStorage());

  /**
   * setSearchState — merges partial updates and persists immediately.
   * Accepts either a new state object or an updater function.
   */
  const setSearchState = useCallback((updater) => {
    setSearchStateRaw((prev) => {
      const next =
        typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      saveToStorage(next);
      return next;
    });
  }, []);

  /**
   * clearSearch — resets everything back to initial state.
   */
  const clearSearch = useCallback(() => {
    setSearchStateRaw(INITIAL_STATE);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(INTAKE_CONTEXT_KEY);
    } catch {
      // Fail silently
    }
  }, []);

  return (
    <SearchContext.Provider value={{ searchState, setSearchState, clearSearch }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error('useSearch must be used within a SearchProvider');
  return ctx;
}

export default SearchContext;
