import medicines from '../data/medicines.json';

function normalizeMedicineText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getMedicineSearchTerms(medicine) {
  return [
    medicine.genericName,
    medicine.strength,
    medicine.dosageForm,
    ...(medicine.aliases || []),
    ...(medicine.brandExamples || []),
  ]
    .map(normalizeMedicineText)
    .filter(Boolean);
}

function scoreMedicineMatch(medicine, normalizedQuery) {
  if (!normalizedQuery) {
    return Number.POSITIVE_INFINITY;
  }

  const terms = getMedicineSearchTerms(medicine);
  const joinedTerms = terms.join(' ');

  if (terms.includes(normalizedQuery)) {
    return 0;
  }

  if (terms.some((term) => term.startsWith(normalizedQuery))) {
    return 1;
  }

  if (joinedTerms.includes(normalizedQuery)) {
    return 2;
  }

  const queryTokens = normalizedQuery.split(' ').filter(Boolean);
  if (queryTokens.length && queryTokens.every((token) => joinedTerms.includes(token))) {
    return 3;
  }

  return Number.POSITIVE_INFINITY;
}

export function searchMedicines(query, limit = 8) {
  const normalizedQuery = normalizeMedicineText(query);
  if (!normalizedQuery) {
    return [];
  }

  return medicines
    .map((medicine) => ({
      medicine,
      score: scoreMedicineMatch(medicine, normalizedQuery),
    }))
    .filter((entry) => Number.isFinite(entry.score))
    .sort((a, b) => {
      if (a.score !== b.score) {
        return a.score - b.score;
      }
      return a.medicine.genericName.localeCompare(b.medicine.genericName);
    })
    .slice(0, limit)
    .map((entry) => entry.medicine);
}

export function getMedicineById(id) {
  return medicines.find((medicine) => medicine.id === id) || null;
}

