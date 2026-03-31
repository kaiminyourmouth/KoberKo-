export const URGENCY_DURATION_OPTIONS = [
  { key: 'under_24h' },
  { key: 'one_to_three_days' },
  { key: 'over_three_days' },
];

export const URGENCY_MARKERS = [
  { key: 'difficulty_breathing', severity: 'red' },
  { key: 'chest_pain', severity: 'red' },
  { key: 'loss_of_consciousness', severity: 'red' },
  { key: 'severe_bleeding', severity: 'red' },
  { key: 'ongoing_seizure', severity: 'red' },
  { key: 'one_sided_weakness', severity: 'red' },
  { key: 'high_fever_lethargy', severity: 'red' },
  { key: 'inability_to_drink_or_pee', severity: 'red' },
  { key: 'new_or_worsening_weakness', severity: 'yellow' },
  { key: 'persistent_vomiting_diarrhea', severity: 'yellow' },
  { key: 'high_fever_days', severity: 'yellow' },
  { key: 'pregnant_in_labor', severity: 'yellow' },
];

const MARKER_PATTERNS = {
  difficulty_breathing: [
    'hirap huminga',
    'di makahinga',
    'hindi makahinga',
    'cannot breathe',
    "can't breathe",
    'shortness of breath',
    'hingal',
    'hinihingal',
    'humahabol ang hininga',
    'gasping',
    'mabilis huminga',
    'wheezing',
    'stridor',
    'blue lips',
    'namumutla ang labi',
  ],
  chest_pain: [
    'chest pain',
    'sakit sa dibdib',
    'pananakit ng dibdib',
    'pressure sa dibdib',
    'paninikip ng dibdib',
    'paninikip sa dibdib',
    'tightness sa dibdib',
  ],
  loss_of_consciousness: [
    'loss of consciousness',
    'unconscious',
    'nahimatay',
    'hard to wake',
    'di magising',
    'hindi magising',
    'not responding',
    'unresponsive',
    'out of it',
    'sobrang lutang',
    'very confused',
    'confused and hard to wake',
  ],
  severe_bleeding: [
    'severe bleeding',
    'matinding pagdurugo',
    'bleeding a lot',
    'sobrang dugo',
    'bleeding nonstop',
    'tuloy tuloy ang dugo',
    'tuloy-tuloy ang dugo',
    'hemorrhage',
  ],
  ongoing_seizure: ['seizure', 'kombulsyon', 'convulsion', 'naninigas at nangingisay'],
  one_sided_weakness: [
    'one sided weakness',
    'one-sided weakness',
    'face droop',
    'slurred speech',
    'stroke',
    'pamamanhid ang kalahati',
    'nanghina ang kalahati',
    'hirap magsalita',
    'tabingi ang mukha',
  ],
  high_fever_lethargy: ['high fever with lethargy', 'mataas na lagnat at sobrang hina'],
  inability_to_drink_or_pee: [
    'cannot drink',
    "can't drink",
    'unable to drink',
    'di makainom',
    'hindi makainom',
    'walang ihi',
    'not urinating',
    'no urine',
    'hindi umiihi',
    'di umiihi',
    'hindi makaihi',
    'di makaihi',
  ],
  new_or_worsening_weakness: [
    'nanghihina',
    'nanlalambot',
    'sobrang hina',
    'weakness',
    'weak',
    'lightheaded',
    'nahihilo',
    'pagkahilo',
    'dizzy',
    'hindi makatayo',
    'di makatayo',
    'hindi makalakad',
    'di makalakad',
    'unsteady',
  ],
  persistent_vomiting_diarrhea: [
    'persistent vomiting',
    'persistent diarrhea',
    'pagsusuka',
    'pagtatae',
    'dehydrated',
    'dehydration',
    'vomiting',
    'diarrhea',
    'suka nang suka',
    'tuloy tuloy ang suka',
  ],
  high_fever_days: ['high fever', 'mataas na lagnat', 'lagnat', 'fever'],
  pregnant_in_labor: ['pregnant', 'buntis', 'labor', 'contraction', 'paghilab', 'water broke', 'panubigan'],
};

const FEVER_CUES = ['high fever', 'mataas na lagnat', 'lagnat', 'fever'];
const LETHARGY_CUES = [
  'matamlay',
  'sobrang hina',
  'sobrang antok',
  'very sleepy',
  'lethargic',
  'listless',
  'hindi makabangon',
  'di makabangon',
  'hard to wake',
  'di magising',
  'hindi magising',
];
const WEAKNESS_CUES = [
  'nanghihina',
  'nanlalambot',
  'mahina',
  'sobrang hina',
  'weakness',
  'weak',
  'nahihilo',
  'pagkahilo',
  'dizzy',
  'lightheaded',
  'unsteady',
  'hindi makatayo',
  'di makatayo',
  'hindi makalakad',
  'di makalakad',
];
const SUDDEN_CUES = ['biglang', 'sudden', 'kanina lang', 'minutes ago', 'just now', 'pagkabigla'];
const SIDE_CUES = [
  'isang side',
  'one side',
  'kalahati',
  'left side',
  'right side',
  'kaliwang',
  'kanang',
  'one arm',
  'one leg',
];
const SPEECH_CUES = [
  'hirap magsalita',
  'slurred speech',
  'speech difficulty',
  'garbled speech',
  'di makasalita',
  'hindi makasalita',
  'cannot speak',
];
const FACE_CUES = ['face droop', 'tabingi ang mukha', 'ngiwi ang mukha', 'drooping face'];
const VOMIT_OR_DIARRHEA_CUES = [
  'pagsusuka',
  'suka',
  'vomit',
  'vomiting',
  'pagtatae',
  'diarrhea',
  'kalibanga',
];
const DRINK_OR_URINE_CUES = [
  'cannot drink',
  "can't drink",
  'unable to drink',
  'di makainom',
  'hindi makainom',
  'walang ihi',
  'not urinating',
  'no urine',
  'hindi umiihi',
  'di umiihi',
  'hindi makaihi',
  'di makaihi',
];
const PREGNANCY_CUES = ['pregnant', 'buntis'];
const LABOR_CUES = ['labor', 'contraction', 'paghilab', 'water broke', 'panubigan'];

function unique(items) {
  return [...new Set(items)];
}

function normalize(value = '') {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function includesAny(haystack, patterns) {
  return patterns.some((pattern) => haystack.includes(normalize(pattern)));
}

function inferUrgencyMarkerKeys(symptom) {
  const normalizedSymptom = normalize(symptom);

  if (!normalizedSymptom) {
    return [];
  }

  const directMatches = Object.entries(MARKER_PATTERNS)
    .filter(([, patterns]) => includesAny(normalizedSymptom, patterns))
    .map(([markerKey]) => markerKey);

  const inferred = [...directMatches];

  // Keep the text parser conservative: only escalate when the wording strongly suggests
  // a WHO/CDC-style danger sign rather than a vague symptom alone.
  if (includesAny(normalizedSymptom, FEVER_CUES) && includesAny(normalizedSymptom, LETHARGY_CUES)) {
    inferred.push('high_fever_lethargy');
  }

  if (
    includesAny(normalizedSymptom, VOMIT_OR_DIARRHEA_CUES)
    && includesAny(normalizedSymptom, DRINK_OR_URINE_CUES)
  ) {
    inferred.push('inability_to_drink_or_pee');
  }

  if (
    includesAny(normalizedSymptom, WEAKNESS_CUES)
    && (
      includesAny(normalizedSymptom, SIDE_CUES)
      || includesAny(normalizedSymptom, SPEECH_CUES)
      || includesAny(normalizedSymptom, FACE_CUES)
    )
  ) {
    inferred.push('one_sided_weakness');
  } else if (
    includesAny(normalizedSymptom, SUDDEN_CUES)
    && includesAny(normalizedSymptom, WEAKNESS_CUES)
  ) {
    inferred.push('new_or_worsening_weakness');
  }

  if (
    includesAny(normalizedSymptom, PREGNANCY_CUES)
    && includesAny(normalizedSymptom, LABOR_CUES)
  ) {
    inferred.push('pregnant_in_labor');
  }

  return unique(inferred);
}

export function getSuggestedUrgencyMarkerKeys(symptom) {
  return inferUrgencyMarkerKeys(symptom);
}

export function evaluateUrgencyTriage({ symptom = '', duration = '', markerKeys = [] } = {}) {
  const inferredMarkerKeys = inferUrgencyMarkerKeys(symptom);
  const allMarkerKeys = unique([...markerKeys, ...inferredMarkerKeys]);
  const selectedMarkers = URGENCY_MARKERS.filter((marker) => allMarkerKeys.includes(marker.key));
  const redMarkers = selectedMarkers.filter((marker) => marker.severity === 'red');
  const yellowMarkers = selectedMarkers.filter((marker) => marker.severity === 'yellow');
  const hasSymptom = symptom.trim().length > 0;

  if (redMarkers.length) {
    return {
      level: 'red',
      triggerKeys: unique(redMarkers.map((marker) => marker.key)),
      inferredMarkerKeys,
      selectedMarkerKeys: unique(markerKeys),
      actionKey: 'urgency_result_red_action',
      bodyKey: 'urgency_result_red_body',
    };
  }

  if (yellowMarkers.length || duration === 'over_three_days') {
    const triggerKeys = unique([
      ...yellowMarkers.map((marker) => marker.key),
      ...(duration === 'over_three_days' ? ['duration_over_three_days'] : []),
    ]);

    return {
      level: 'yellow',
      triggerKeys,
      inferredMarkerKeys,
      selectedMarkerKeys: unique(markerKeys),
      actionKey: 'urgency_result_yellow_action',
      bodyKey: 'urgency_result_yellow_body',
    };
  }

  if (hasSymptom || duration) {
    return {
      level: 'green',
      triggerKeys: ['no_danger_signs_selected'],
      inferredMarkerKeys,
      selectedMarkerKeys: unique(markerKeys),
      actionKey: 'urgency_result_green_action',
      bodyKey: 'urgency_result_green_body',
    };
  }

  return null;
}
