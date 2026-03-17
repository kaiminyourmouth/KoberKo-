import hospitals from '../data/hospitals.json';

export const HOSPITAL_DATA_PROVENANCE = {
  lastReviewed: 'March 17, 2026',
  accreditationSource_en: 'PhilHealth accredited hospitals offline snapshot used by KoberKo',
  accreditationSource_fil: 'Offline snapshot ng PhilHealth-accredited hospitals na gamit ng KoberKo',
};

function normalize(value = '') {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function compareHospitals(a, b) {
  const typeOrder = { DOH: 0, LGU: 1, PRIVATE: 2 };
  const typeDelta = (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9);
  if (typeDelta !== 0) {
    return typeDelta;
  }

  const levelDelta = (b.level ?? 0) - (a.level ?? 0);
  if (levelDelta !== 0) {
    return levelDelta;
  }

  return a.name.localeCompare(b.name);
}

function normalizeLevel(level) {
  if (level === null || level === undefined || level === '') {
    return null;
  }

  const numericLevel = Number(level);
  return Number.isFinite(numericLevel) ? numericLevel : null;
}

function scoreHospital(hospital, query) {
  const name = normalize(hospital.name);
  const shortName = normalize(hospital.shortName);
  const city = normalize(hospital.city);
  const province = normalize(hospital.province);
  const haystackTerms = (hospital.searchTerms ?? []).map(normalize);

  if (name === query || shortName === query) return 120;
  if (name.startsWith(query) || shortName.startsWith(query)) return 100;
  if (city === query) return 90;
  if (province === query) return 80;
  if (name.includes(query)) return 70;
  if (shortName.includes(query)) return 65;
  if (city.includes(query)) return 60;
  if (province.includes(query)) return 55;
  if (haystackTerms.some((term) => term === query)) return 50;
  if (haystackTerms.some((term) => term.startsWith(query))) return 45;
  if (haystackTerms.some((term) => term.includes(query))) return 40;
  return 0;
}

export function searchHospitals(query) {
  const normalizedQuery = normalize(query);
  if (normalizedQuery.length < 2) {
    return [];
  }

  return hospitals
    .map((hospital) => ({
      hospital,
      score: scoreHospital(hospital, normalizedQuery),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return compareHospitals(a.hospital, b.hospital);
    })
    .slice(0, 8)
    .map((entry) => entry.hospital);
}

export function getHospitalsByCity(city, level = null) {
  const normalizedCity = normalize(city);
  const normalizedLevel = normalizeLevel(level);
  if (!normalizedCity) {
    return [];
  }

  const exactCityMatches = hospitals.filter(
    (hospital) =>
      normalize(hospital.city) === normalizedCity &&
      (normalizedLevel === null || hospital.level === normalizedLevel),
  );

  if (exactCityMatches.length > 0) {
    return exactCityMatches.sort(compareHospitals);
  }

  return getHospitalsByProvince(city, level);
}

export function getHospitalsByProvince(province, level = null) {
  const normalizedProvince = normalize(province);
  const normalizedLevel = normalizeLevel(level);
  if (!normalizedProvince) {
    return [];
  }

  return hospitals
    .filter(
      (hospital) =>
        normalize(hospital.province) === normalizedProvince &&
        (normalizedLevel === null || hospital.level === normalizedLevel),
    )
    .sort(compareHospitals);
}

export function getCities() {
  return [...new Set(hospitals.map((hospital) => hospital.city))]
    .sort((a, b) => a.localeCompare(b));
}

export function getHospitalById(id) {
  return hospitals.find((hospital) => hospital.id === id) ?? null;
}
