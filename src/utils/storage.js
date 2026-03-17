/**
 * KoberKo localStorage utilities
 * Centralises the two storage helpers duplicated across FindTab and IntakeTab.
 */
import { DEFAULT_MEMBERSHIP_KEY, SAVED_RESULTS_KEY } from '../constants/options';

const APP_TUTORIAL_KEY = 'koberko_app_tutorial_seen';

/**
 * Reads the user's preferred default membership type from localStorage.
 * Returns an empty string if nothing is stored or localStorage is unavailable.
 */
export function loadDefaultMembership() {
  try {
    return localStorage.getItem(DEFAULT_MEMBERSHIP_KEY) || '';
  } catch {
    return '';
  }
}

/**
 * Pushes a saved result to the front of the saved-results list in localStorage.
 * Fails silently if localStorage is unavailable.
 */
export function saveResultToStorage(savedItem) {
  try {
    const existing = JSON.parse(localStorage.getItem(SAVED_RESULTS_KEY) || '[]');
    existing.unshift(savedItem);
    localStorage.setItem(SAVED_RESULTS_KEY, JSON.stringify(existing));
  } catch {
    // Ignore localStorage issues for resilience.
  }
}

export function hasSeenAppTutorial() {
  try {
    return localStorage.getItem(APP_TUTORIAL_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markAppTutorialSeen() {
  try {
    localStorage.setItem(APP_TUTORIAL_KEY, 'true');
  } catch {
    // Ignore localStorage issues for resilience.
  }
}
