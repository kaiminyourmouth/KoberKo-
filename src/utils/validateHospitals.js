import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { searchHospitals, getHospitalsByCity } from '../engine/hospitalSearch.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_PATH = resolve(__dirname, '../data/hospitals.json');

const VALID_REGIONS = [
  'NCR', 'CAR', 'Region I', 'Region II', 'Region III',
  'Region IV-A', 'Region IV-B', 'Region V', 'Region VI', 'Region VII',
  'Region VIII', 'Region IX', 'Region X', 'Region XI', 'Region XII',
  'Region XIII', 'BARMM',
];

const VALID_TYPES = ['DOH', 'LGU', 'PRIVATE'];
const VALID_LEVELS = [1, 2, 3, 4];
const MINIMUM_PER_REGION = {
  NCR: 60,
  'Region III': 30,
  'Region IV-A': 35,
  'Region VII': 25,
  'Region XI': 20,
  'Region I': 10,
  'Region II': 10,
  'Region V': 10,
  'Region VI': 15,
  'Region VIII': 10,
  'Region IX': 10,
  'Region X': 15,
  'Region XII': 10,
  'Region XIII': 8,
  CAR: 8,
  'Region IV-B': 8,
  BARMM: 8,
};

const MUST_HAVE = [
  'Philippine General Hospital',
  "St. Luke's Medical Center",
  'Philippine Heart Center',
  'National Kidney and Transplant Institute',
  'Makati Medical Center',
  'Vicente Sotto Memorial Medical Center',
  'Southern Philippines Medical Center',
  'Northern Mindanao Medical Center',
];

const REGION_MAP = {
  'Metro Manila': 'NCR',
  'National Capital Region': 'NCR',
  Cordillera: 'CAR',
  MIMAROPA: 'Region IV-B',
  Soccsksargen: 'Region XII',
  ARMM: 'BARMM',
};

function loadHospitals() {
  return JSON.parse(readFileSync(DATA_PATH, 'utf8'));
}

function normalizeText(value = '') {
  return value.toLowerCase().trim();
}

function scoreCompleteness(hospital) {
  const keys = ['name', 'shortName', 'region', 'province', 'city', 'address', 'searchTerms'];
  let score = keys.reduce((sum, key) => {
    const value = hospital[key];
    if (Array.isArray(value)) return sum + value.length;
    return sum + (value ? String(value).length : 0);
  }, 0);

  if (hospital.address) score += 25;
  if (hospital.hasMalasakitCenter) score += 10;
  if (hospital.isDOH) score += 10;
  return score;
}

function buildSearchTerms(hospital) {
  const terms = new Set((hospital.searchTerms ?? []).map((term) => normalizeText(term)).filter(Boolean));
  const name = hospital.name ?? '';
  const words = name
    .split(/[^A-Za-z0-9']+/)
    .map((word) => normalizeText(word))
    .filter(Boolean);

  words.forEach((word) => terms.add(word));
  if (name) terms.add(normalizeText(name));
  if (hospital.shortName) terms.add(normalizeText(hospital.shortName));
  if (hospital.city) terms.add(normalizeText(hospital.city));
  if (hospital.province) terms.add(normalizeText(hospital.province));

  const abbreviation = words.map((word) => word[0]).join('');
  if (abbreviation.length >= 2) {
    terms.add(abbreviation);
  }

  if (normalizeText(name).includes('philippine general hospital')) {
    terms.add('pgh');
  }

  return Array.from(terms).sort();
}

function applyAutoFixes(hospitals) {
  const deduped = new Map();

  for (const hospital of hospitals) {
    const next = {
      ...hospital,
      region: REGION_MAP[hospital.region] ?? hospital.region,
      searchTerms: buildSearchTerms(hospital),
    };

    if (next.type === 'DOH' && next.isDOH === false) {
      next.isDOH = true;
    }

    if (next.isDOH === true && next.type !== 'DOH') {
      next.type = 'DOH';
    }

    const existing = deduped.get(next.id);
    if (!existing || scoreCompleteness(next) > scoreCompleteness(existing)) {
      deduped.set(next.id, next);
    }
  }

  return Array.from(deduped.values());
}

function buildReport(hospitals) {
  const report = {
    total: hospitals.length,
    errors: [],
    warnings: [],
    regionCounts: {},
    levelCounts: { 1: 0, 2: 0, 3: 0, 4: 0 },
    typeCounts: { DOH: 0, LGU: 0, PRIVATE: 0 },
    duplicateIds: [],
    duplicateNames: [],
    missingFields: [],
    invalidValues: [],
    suspiciousEntries: [],
  };

  const seenIds = new Set();
  const seenNames = new Set();

  for (const h of hospitals) {
    const requiredFields = ['id', 'name', 'region', 'city', 'level', 'type', 'philhealthAccredited', 'isDOH', 'hasMalasakitCenter', 'searchTerms'];
    for (const field of requiredFields) {
      if (h[field] === undefined || h[field] === null || h[field] === '') {
        report.missingFields.push({ id: h.id || 'UNKNOWN', field });
      }
    }

    if (seenIds.has(h.id)) {
      report.duplicateIds.push(h.id);
    }
    seenIds.add(h.id);

    const nameKey = h.name?.toLowerCase().trim();
    if (nameKey && seenNames.has(nameKey)) {
      report.duplicateNames.push(h.name);
    }
    if (nameKey) seenNames.add(nameKey);

    if (!VALID_REGIONS.includes(h.region)) {
      report.invalidValues.push({ id: h.id, field: 'region', value: h.region });
    }
    if (!VALID_TYPES.includes(h.type)) {
      report.invalidValues.push({ id: h.id, field: 'type', value: h.type });
    }
    if (!VALID_LEVELS.includes(h.level)) {
      report.invalidValues.push({ id: h.id, field: 'level', value: h.level });
    }

    if (h.type === 'DOH' && h.isDOH === false) {
      report.warnings.push({ id: h.id, issue: 'type is DOH but isDOH is false' });
    }
    if (h.isDOH === true && h.type !== 'DOH') {
      report.warnings.push({ id: h.id, issue: `isDOH is true but type is ${h.type}` });
    }
    if (h.level === 4 && h.type === 'LGU') {
      report.warnings.push({ id: h.id, issue: 'Level 4 hospital marked as LGU — verify' });
    }
    if (!Array.isArray(h.searchTerms) || h.searchTerms.length === 0) {
      report.warnings.push({ id: h.id, issue: 'searchTerms is empty or not an array' });
    }
    if (Array.isArray(h.searchTerms)) {
      for (const term of h.searchTerms) {
        if (term !== term.toLowerCase()) {
          report.warnings.push({ id: h.id, issue: `searchTerm "${term}" is not lowercase` });
        }
      }
    }
    if (h.philhealthAccredited === false) {
      report.warnings.push({ id: h.id, issue: 'philhealthAccredited is false — should this be in the list?' });
    }

    if (h.name && h.name.length < 8) {
      report.suspiciousEntries.push({ id: h.id, issue: `Name too short: "${h.name}"` });
    }

    const genericNames = ['hospital', 'medical center', 'clinic', 'test', 'placeholder'];
    if (genericNames.some((g) => h.name?.toLowerCase() === g)) {
      report.suspiciousEntries.push({ id: h.id, issue: `Generic/placeholder name: "${h.name}"` });
    }
    if (!h.city || h.city.trim() === '') {
      report.suspiciousEntries.push({ id: h.id, issue: 'Missing city' });
    }

    report.regionCounts[h.region] = (report.regionCounts[h.region] || 0) + 1;
    if (VALID_LEVELS.includes(h.level)) report.levelCounts[h.level] += 1;
    if (VALID_TYPES.includes(h.type)) report.typeCounts[h.type] += 1;
  }

  for (const [region, min] of Object.entries(MINIMUM_PER_REGION)) {
    const count = report.regionCounts[region] || 0;
    if (count < min) {
      report.errors.push(`${region} has only ${count} hospitals — minimum expected: ${min}`);
    }
  }

  for (const required of MUST_HAVE) {
    const found = hospitals.some((h) =>
      h.name.toLowerCase().includes(required.toLowerCase().split(' ').slice(0, 3).join(' ')),
    );
    if (!found) {
      report.errors.push(`MISSING REQUIRED HOSPITAL: ${required}`);
    }
  }

  return report;
}

function printChecklist(hospitals) {
  const findByName = (fragment) =>
    hospitals.find((hospital) => hospital.name.toLowerCase().includes(fragment.toLowerCase()));

  const checklist = [
    ['Total hospital count is 800+', hospitals.length >= 800],
    ['NCR has 60+ hospitals', (hospitals.filter((h) => h.region === 'NCR').length >= 60)],
    ['Region III has 30+ hospitals', (hospitals.filter((h) => h.region === 'Region III').length >= 30)],
    ['Region IV-A has 35+ hospitals', (hospitals.filter((h) => h.region === 'Region IV-A').length >= 35)],
    ['Region VII (Cebu) has 25+ hospitals', (hospitals.filter((h) => h.region === 'Region VII').length >= 25)],
    ['Region X (CDO) has 15+ hospitals including Northern Mindanao Medical Center', hospitals.filter((h) => h.region === 'Region X').length >= 15 && Boolean(findByName('Northern Mindanao Medical Center'))],
    ['Region XI (Davao) has 20+ hospitals including Southern Philippines Medical Center', hospitals.filter((h) => h.region === 'Region XI').length >= 20 && Boolean(findByName('Southern Philippines Medical Center'))],
    ['Philippine General Hospital is present with level: 3', Boolean(findByName('Philippine General Hospital')?.level === 3)],
    ['Philippine Heart Center is present with isDOH: true, type: DOH', Boolean(findByName('Philippine Heart Center')?.isDOH && findByName('Philippine Heart Center')?.type === 'DOH')],
    ['National Kidney Institute is present with isDOH: true, type: DOH', Boolean(findByName('National Kidney')?.isDOH && findByName('National Kidney')?.type === 'DOH')],
    ['St. Luke\'s QC and BGC are both present as separate entries', hospitals.filter((h) => h.name.toLowerCase().includes("st. luke's medical center")).length >= 2],
    ['Makati Medical Center is present with type: PRIVATE, level: 3', Boolean(findByName('Makati Medical Center')?.type === 'PRIVATE' && findByName('Makati Medical Center')?.level === 3)],
    ['Vicente Sotto Memorial (Cebu) is present with isDOH: true', Boolean(findByName('Vicente Sotto Memorial Medical Center')?.isDOH)],
    ['Northern Mindanao Medical Center (CDO) is present with isDOH: true', Boolean(findByName('Northern Mindanao Medical Center')?.isDOH)],
    ['No hospital has level: null or level: 0', hospitals.every((h) => VALID_LEVELS.includes(h.level))],
    ['No hospital has type: null or type: undefined', hospitals.every((h) => VALID_TYPES.includes(h.type))],
    ['searchTerms on all hospitals are lowercase arrays', hospitals.every((h) => Array.isArray(h.searchTerms) && h.searchTerms.every((term) => term === term.toLowerCase()))],
  ];

  console.log('\nManual review checklist:');
  for (const [label, passed] of checklist) {
    console.log(`${passed ? '[x]' : '[ ]'} ${label}`);
  }
}

async function runSpotTests() {
  const tests = [
    {
      label: "searchHospitals('PGH')",
      passed: searchHospitals('PGH').slice(0, 3).some((h) => h.shortName === 'PGH'),
    },
    {
      label: "searchHospitals('st lukes')",
      passed: (() => {
        const results = searchHospitals('st lukes');
        return results.some((h) => h.shortName.includes('QC')) && results.some((h) => h.shortName.includes('BGC'));
      })(),
    },
    {
      label: "searchHospitals('makati med')",
      passed: searchHospitals('makati med').some((h) => h.name.toLowerCase().includes('makati medical center')),
    },
    {
      label: "getHospitalsByCity('Cagayan de Oro')",
      passed: getHospitalsByCity('Cagayan de Oro').some((h) => h.name.toLowerCase().includes('northern mindanao medical center') && h.isDOH),
    },
    {
      label: "getHospitalsByCity('Cebu City')",
      passed: (() => {
        const results = getHospitalsByCity('Cebu City');
        return results.some((h) => h.name.toLowerCase().includes('vicente sotto memorial medical center')) &&
          results.some((h) => h.name.toLowerCase().includes("cebu doctors' university hospital"));
      })(),
    },
    {
      label: "getHospitalsByCity('Taguig', 4)",
      passed: getHospitalsByCity('Taguig', 4).some((h) => h.shortName.includes('BGC')),
      note: "Official PhilHealth 2026 accredited list currently shows St. Luke's BGC as LEVEL 3, so this expected result may be intentionally false.",
    },
    {
      label: "searchHospitals('xyz123nonexistent')",
      passed: searchHospitals('xyz123nonexistent').length === 0,
    },
    {
      label: "getHospitalsByCity('Nonexistent City')",
      passed: getHospitalsByCity('Nonexistent City').length === 0,
    },
  ];

  console.log('\nSpot tests:');
  for (const test of tests) {
    console.log(`${test.passed ? 'PASS' : 'FAIL'} - ${test.label}`);
    if (test.note && !test.passed) {
      console.log(`  note: ${test.note}`);
    }
  }

  return tests;
}

let hospitals = loadHospitals();
const fixedHospitals = applyAutoFixes(hospitals);
const changed = JSON.stringify(hospitals) !== JSON.stringify(fixedHospitals);

if (changed) {
  writeFileSync(DATA_PATH, `${JSON.stringify(fixedHospitals, null, 2)}\n`);
}

hospitals = loadHospitals();
const report = buildReport(hospitals);

console.group('🏥 KoberKo Hospital Data Quality Report');
console.log(`Total hospitals: ${report.total}`);
console.log('\nBy region:', report.regionCounts);
console.log('By level:', report.levelCounts);
console.log('By type:', report.typeCounts);

if (report.errors.length > 0) {
  console.error(`\n❌ ERRORS (${report.errors.length}):`, report.errors);
} else {
  console.log('\n✅ No critical errors');
}

if (report.duplicateIds.length > 0) {
  console.error(`\n❌ DUPLICATE IDs (${report.duplicateIds.length}):`, report.duplicateIds);
}
if (report.duplicateNames.length > 0) {
  console.warn(`\n⚠️ DUPLICATE NAMES (${report.duplicateNames.length}):`, report.duplicateNames);
}
if (report.missingFields.length > 0) {
  console.error(`\n❌ MISSING FIELDS (${report.missingFields.length}):`, report.missingFields);
}
if (report.invalidValues.length > 0) {
  console.error(`\n❌ INVALID VALUES (${report.invalidValues.length}):`, report.invalidValues);
}
if (report.warnings.length > 0) {
  console.warn(`\n⚠️ WARNINGS (${report.warnings.length}):`, report.warnings);
}
if (report.suspiciousEntries.length > 0) {
  console.warn(`\n⚠️ SUSPICIOUS ENTRIES (${report.suspiciousEntries.length}):`, report.suspiciousEntries.slice(0, 20));
}

console.log(`\n${report.errors.length === 0 && report.missingFields.length === 0 ? '🎉 DATA QUALITY: PASS — safe to use' : '🛑 DATA QUALITY: FAIL — fix errors before using'}`);
console.groupEnd();

printChecklist(hospitals);
report.spotTests = await runSpotTests();

export default report;
