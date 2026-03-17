import { getCoverage } from '../engine/coverage.js';

const TEST_CASES = [
  {
    id: 'T01',
    desc: 'CAP, SSS, Level 2 - primary demo scenario',
    input: { conditionId: 'CAP', memberType: 'SSS', hospitalLevel: 'level2' },
    expect: { amount: 29250, directFiling: true, circular: 'PhilHealth Circular 2024-0037 Annex A' },
  },
  {
    id: 'T02',
    desc: 'NSD, GSIS, Level 3 - maternity',
    input: { conditionId: 'NSD', memberType: 'GSIS', hospitalLevel: 'level3' },
    expect: { amount: 8000, directFiling: true },
  },
  {
    id: 'T03',
    desc: 'CS, VOLUNTARY, Level 2 - cesarean',
    input: { conditionId: 'CS', memberType: 'VOLUNTARY', hospitalLevel: 'level2' },
    expect: { amount: 19000, directFiling: true },
  },
  {
    id: 'T04',
    desc: 'DENGUE, NHTS, Level 2',
    input: { conditionId: 'DENGUE', memberType: 'NHTS', hospitalLevel: 'level2' },
    expect: { amount: 19500, directFiling: true },
  },
  {
    id: 'T05',
    desc: 'HTN, SENIOR, Level 1',
    input: { conditionId: 'HTN', memberType: 'SENIOR', hospitalLevel: 'level1' },
    expect: { amount: 17550, directFiling: true },
  },
  {
    id: 'T06',
    desc: 'UTI - 50% adjusted rate',
    input: { conditionId: 'UTI', memberType: 'SSS', hospitalLevel: 'level2' },
    expect: { amount: 14625 },
  },
  {
    id: 'T07',
    desc: 'AGE - 50% adjusted rate',
    input: { conditionId: 'AGE', memberType: 'SSS', hospitalLevel: 'level2' },
    expect: { amount: 11700 },
  },
  {
    id: 'T08',
    desc: 'CHOLECYSTECTOMY - 50% adjusted rate',
    input: { conditionId: 'CHOLECYSTECTOMY', memberType: 'SSS', hospitalLevel: 'level2' },
    expect: { amount: 60450 },
  },
  {
    id: 'T09',
    desc: 'HEMODIALYSIS - 156 sessions per year',
    input: { conditionId: 'HEMODIALYSIS', memberType: 'SSS', hospitalLevel: 'level2' },
    expect: { amount: 1400, sessionsPerYear: 156 },
  },
  {
    id: 'T10',
    desc: 'AMI - PCI package Level 3',
    input: { conditionId: 'AMI', memberType: 'SSS', hospitalLevel: 'level3' },
    expect: { amount: 524000, directFiling: true },
  },
  {
    id: 'T11',
    desc: 'STROKE - Z-benefit Level 3',
    input: { conditionId: 'STROKE', memberType: 'SSS', hospitalLevel: 'level3' },
    expect: { directFiling: true, packageCategory: 'z_benefit' },
  },
  {
    id: 'T12',
    desc: 'NHTS member - malasakitEligible must be true',
    input: { conditionId: 'CAP', memberType: 'NHTS', hospitalLevel: 'level2' },
    expect: { malasakitEligible: true },
  },
  {
    id: 'T13',
    desc: 'SENIOR member - bonusNote must be present',
    input: { conditionId: 'CAP', memberType: 'SENIOR', hospitalLevel: 'level2' },
    expect: { amount: 29250, hasSeniorNote: true },
  },
  {
    id: 'T14',
    desc: 'PWD member - bonusNote must be present',
    input: { conditionId: 'CAP', memberType: 'PWD', hospitalLevel: 'level2' },
    expect: { amount: 29250, hasPWDNote: true },
  },
  {
    id: 'T15',
    desc: 'CAP Level 3 - same official CAP III rate',
    input: { conditionId: 'CAP', memberType: 'SSS', hospitalLevel: 'level3' },
    expect: { amount: 29250 },
  },
  {
    id: 'T16',
    desc: 'APPENDECTOMY - second case rate eligible',
    input: { conditionId: 'APPENDECTOMY', memberType: 'SSS', hospitalLevel: 'level2' },
    expect: { secondCaseRateEligible: true },
  },
  {
    id: 'T17',
    desc: 'CAP confidence should be verified',
    input: { conditionId: 'CAP', memberType: 'SSS', hospitalLevel: 'level2' },
    expect: { confidence: 'verified' },
  },
  {
    id: 'T18',
    desc: 'CATARACT confidence should be verified',
    input: { conditionId: 'CATARACT', memberType: 'SSS', hospitalLevel: 'level2' },
    expect: { confidence: 'verified' },
  },
  {
    id: 'T19',
    desc: 'NEWBORN package',
    input: { conditionId: 'NEWBORN', memberType: 'SSS', hospitalLevel: 'level2' },
    expect: { amount: 1750, directFiling: true },
  },
  {
    id: 'T20',
    desc: 'Unknown condition - must return null',
    input: { conditionId: 'UNKNOWN_XYZ', memberType: 'SSS', hospitalLevel: 'level2' },
    expect: null,
  },
  {
    id: 'T21',
    desc: 'Leukemia is verified at the official standard-risk pediatric ALL amount',
    input: { conditionId: 'LEUKEMIA', memberType: 'SSS', hospitalLevel: 'level2' },
    expect: { amount: 500000, confidence: 'verified' },
  },
  {
    id: 'T22',
    desc: 'Cervical cancer now uses the verified official base treatment-path amount',
    input: { conditionId: 'CERVICAL_CANCER', memberType: 'SSS', hospitalLevel: 'level2' },
    expect: { amount: 120000, confidence: 'verified' },
  },
  {
    id: 'T23',
    desc: 'Fracture now uses the verified orthopedic implant package baseline',
    input: { conditionId: 'FRACTURE', memberType: 'SSS', hospitalLevel: 'level2' },
    expect: { amount: 140000, confidence: 'verified' },
  },
  {
    id: 'T24',
    desc: 'CAP includes the official CAP IV high-risk variant amount',
    input: { conditionId: 'CAP', memberType: 'SSS', hospitalLevel: 'level2' },
    expect: { hasSubPackageAmount: 90100 },
  },
  {
    id: 'T25',
    desc: 'Dengue includes the official severe dengue variant amount',
    input: { conditionId: 'DENGUE', memberType: 'SSS', hospitalLevel: 'level2' },
    expect: { hasSubPackageAmount: 47000 },
  },
  {
    id: 'T26',
    desc: 'Diabetes includes the official uncomplicated Type 2 diabetes amount',
    input: { conditionId: 'DIABETES', memberType: 'SSS', hospitalLevel: 'level2' },
    expect: { hasSubPackageAmount: 7800 },
  },
  {
    id: 'T27',
    desc: 'Sepsis common admission amount',
    input: { conditionId: 'SEPSIS', memberType: 'SSS', hospitalLevel: 'level2' },
    expect: { amount: 62400, directFiling: true, confidence: 'verified' },
  },
  {
    id: 'T28',
    desc: 'Heart failure common admission amount',
    input: { conditionId: 'HEART_FAILURE', memberType: 'SSS', hospitalLevel: 'level2' },
    expect: { amount: 30615, directFiling: true, confidence: 'verified' },
  },
  {
    id: 'T29',
    desc: 'Pyelonephritis common admission amount',
    input: { conditionId: 'PYELONEPHRITIS', memberType: 'SSS', hospitalLevel: 'level2' },
    expect: { amount: 19500, directFiling: true, confidence: 'verified' },
  },
  {
    id: 'T30',
    desc: 'Acute pancreatitis common admission amount',
    input: { conditionId: 'ACUTE_PANCREATITIS', memberType: 'SSS', hospitalLevel: 'level2' },
    expect: { amount: 24570, directFiling: true, confidence: 'verified' },
  },
  {
    id: 'T31',
    desc: 'Cellulitis common admission amount',
    input: { conditionId: 'CELLULITIS', memberType: 'SSS', hospitalLevel: 'level2' },
    expect: { amount: 18720, directFiling: true, confidence: 'verified' },
  },
  {
    id: 'T32',
    desc: 'Urinary stones common admission amount',
    input: { conditionId: 'URINARY_STONES', memberType: 'SSS', hospitalLevel: 'level2' },
    expect: { amount: 7800, directFiling: true, confidence: 'verified' },
  },
  {
    id: 'T33',
    desc: 'Peptic ulcer with bleeding common admission amount',
    input: { conditionId: 'PEPTIC_ULCER_BLEED', memberType: 'SSS', hospitalLevel: 'level2' },
    expect: { amount: 24960, directFiling: true, confidence: 'verified' },
  },
  {
    id: 'T34',
    desc: 'Febrile convulsion common admission amount',
    input: { conditionId: 'FEBRILE_CONVULSION', memberType: 'SSS', hospitalLevel: 'level2' },
    expect: { amount: 13650, directFiling: true, confidence: 'verified' },
  },
  {
    id: 'T35',
    desc: 'Peritonsillar abscess common admission amount',
    input: { conditionId: 'PERITONSILLAR_ABSCESS', memberType: 'SSS', hospitalLevel: 'level2' },
    expect: { amount: 19500, directFiling: true, confidence: 'verified' },
  },
  {
    id: 'T36',
    desc: 'Tonsillectomy common procedure amount',
    input: { conditionId: 'TONSILLECTOMY', memberType: 'SSS', hospitalLevel: 'level2' },
    expect: { amount: 35100, directFiling: true, confidence: 'verified' },
  },
  {
    id: 'T37',
    desc: 'Dilation and curettage common procedure amount',
    input: { conditionId: 'DILATION_AND_CURETTAGE', memberType: 'SSS', hospitalLevel: 'level2' },
    expect: { amount: 21450, directFiling: true, confidence: 'verified' },
  },
  {
    id: 'T38',
    desc: 'Hemorrhoidectomy common procedure amount',
    input: { conditionId: 'HEMORRHOIDECTOMY', memberType: 'SSS', hospitalLevel: 'level2' },
    expect: { amount: 23634, directFiling: true, confidence: 'verified' },
  },
  {
    id: 'T39',
    desc: 'Thyroidectomy common procedure amount',
    input: { conditionId: 'THYROIDECTOMY', memberType: 'SSS', hospitalLevel: 'level2' },
    expect: { amount: 60450, directFiling: true, confidence: 'verified' },
  },
  {
    id: 'T40',
    desc: 'Myomectomy defaults to the verified abdominal approach amount',
    input: { conditionId: 'MYOMECTOMY', memberType: 'SSS', hospitalLevel: 'level2' },
    expect: { amount: 45435, directFiling: true, confidence: 'verified', hasSubPackageAmount: 35100 },
  },
  {
    id: 'T41',
    desc: 'Abdominal hysterectomy common procedure amount',
    input: { conditionId: 'ABDOMINAL_HYSTERECTOMY', memberType: 'SSS', hospitalLevel: 'level2' },
    expect: { amount: 58500, directFiling: true, confidence: 'verified' },
  },
  {
    id: 'T42',
    desc: 'Outpatient mental health defaults to the verified general annual package',
    input: { conditionId: 'OUTPATIENT_MENTAL_HEALTH', memberType: 'SSS', hospitalLevel: 'level2' },
    expect: { amount: 9000, directFiling: true, confidence: 'verified', hasSubPackageAmount: 16000 },
  },
  {
    id: 'T43',
    desc: 'OHAT defaults to the verified adult general annual package',
    input: { conditionId: 'OHAT', memberType: 'SSS', hospitalLevel: 'level2' },
    expect: { amount: 30000, directFiling: true, confidence: 'verified', hasSubPackageAmount: 39000 },
  },
  {
    id: 'T44',
    desc: 'Animal bite treatment package amount',
    input: { conditionId: 'ANIMAL_BITE_TREATMENT', memberType: 'SSS', hospitalLevel: 'level2' },
    expect: { amount: 5850, directFiling: true, confidence: 'verified' },
  },
];

export function runAccuracyTests() {
  let passed = 0;
  let failed = 0;
  const failures = [];

  console.group('🧪 KoberKo Accuracy Test Suite');

  for (const test of TEST_CASES) {
    const result = getCoverage(
      test.input.conditionId,
      test.input.memberType,
      test.input.hospitalLevel,
    );

    if (test.expect === null) {
      if (result === null) {
        console.log(`✅ ${test.id}: ${test.desc}`);
        passed += 1;
      } else {
        console.error(`❌ ${test.id}: ${test.desc} - expected null, got result`);
        failed += 1;
        failures.push(test.id);
      }
      continue;
    }

    if (result === null) {
      console.error(`❌ ${test.id}: ${test.desc} - getCoverage returned null`);
      failed += 1;
      failures.push(test.id);
      continue;
    }

    let testPassed = true;
    const fieldFailures = [];

    for (const [key, expected] of Object.entries(test.expect)) {
      if (key === 'hasSeniorNote') {
        const fil = result.membershipNote_fil || '';
        const en = result.membershipNote_en || '';
        const has = Boolean(
          fil.toLowerCase().includes('senior') ||
          en.toLowerCase().includes('senior') ||
          en.includes('20%'),
        );
        if (has !== expected) {
          fieldFailures.push(`hasSeniorNote: expected ${expected}, got ${has}`);
          testPassed = false;
        }
        continue;
      }

      if (key === 'hasPWDNote') {
        const fil = result.membershipNote_fil || '';
        const en = result.membershipNote_en || '';
        const has = Boolean(
          fil.includes('PWD') ||
          en.includes('PWD') ||
          en.includes('20%'),
        );
        if (has !== expected) {
          fieldFailures.push(`hasPWDNote: expected ${expected}, got ${has}`);
          testPassed = false;
        }
        continue;
      }

      if (key === 'hasSubPackageAmount') {
        const has = Array.isArray(result.subPackages)
          && result.subPackages.some((item) => item.amount === expected);
        if (!has) {
          fieldFailures.push(`hasSubPackageAmount: expected to find ${expected}`);
          testPassed = false;
        }
        continue;
      }

      const actual = result[key];
      if (actual !== expected) {
        fieldFailures.push(`${key}: expected ${expected}, got ${actual}`);
        testPassed = false;
      }
    }

    if (testPassed) {
      console.log(`✅ ${test.id}: ${test.desc}`);
      passed += 1;
    } else {
      console.error(`❌ ${test.id}: ${test.desc}`, fieldFailures);
      failed += 1;
      failures.push(test.id);
    }
  }

  console.log(`\nResults: ${passed}/${TEST_CASES.length} passed`);
  if (failures.length > 0) {
    console.error('Failed tests:', failures);
    console.error('⛔ DO NOT RECORD VIDEO until all tests pass.');
  } else {
    console.log('🎉 All tests passed. Safe to record.');
  }

  console.groupEnd();
  return { passed, failed, failures };
}
