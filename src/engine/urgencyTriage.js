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
  { key: 'persistent_vomiting_diarrhea', severity: 'yellow' },
  { key: 'high_fever_days', severity: 'yellow' },
  { key: 'pregnant_in_labor', severity: 'yellow' },
];

const SYMPTOM_PATTERNS = {
  difficulty_breathing: ['hirap huminga', 'di makahinga', 'cannot breathe', "can't breathe", 'shortness of breath'],
  chest_pain: ['chest pain', 'sakit sa dibdib'],
  loss_of_consciousness: ['loss of consciousness', 'unconscious', 'nahimatay', 'hard to wake', 'di magising'],
  severe_bleeding: ['severe bleeding', 'matinding pagdurugo', 'bleeding a lot', 'sobrang dugo'],
  ongoing_seizure: ['seizure', 'kombulsyon', 'convulsion'],
  one_sided_weakness: ['one sided weakness', 'one-sided weakness', 'face droop', 'slurred speech', 'stroke'],
  persistent_vomiting_diarrhea: ['persistent vomiting', 'persistent diarrhea', 'pagsusuka', 'pagtatae', 'dehydrated', 'dehydration'],
};

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

function inferMarkerKeysFromSymptom(symptom) {
  const normalizedSymptom = normalize(symptom);
  if (!normalizedSymptom) {
    return [];
  }

  return Object.entries(SYMPTOM_PATTERNS)
    .filter(([, patterns]) => patterns.some((pattern) => normalizedSymptom.includes(normalize(pattern))))
    .map(([markerKey]) => markerKey);
}

export function evaluateUrgencyTriage({ symptom = '', duration = '', markerKeys = [] } = {}) {
  const inferredMarkerKeys = inferMarkerKeysFromSymptom(symptom);
  const selectedMarkers = URGENCY_MARKERS.filter((marker) =>
    unique([...markerKeys, ...inferredMarkerKeys]).includes(marker.key),
  );
  const redMarkers = selectedMarkers.filter((marker) => marker.severity === 'red');
  const yellowMarkers = selectedMarkers.filter((marker) => marker.severity === 'yellow');
  const hasSymptom = symptom.trim().length > 0;

  if (redMarkers.length) {
    return {
      level: 'red',
      triggerKeys: unique(redMarkers.map((marker) => marker.key)),
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
      actionKey: 'urgency_result_yellow_action',
      bodyKey: 'urgency_result_yellow_body',
    };
  }

  if (hasSymptom || duration) {
    return {
      level: 'green',
      triggerKeys: ['no_danger_signs_selected'],
      actionKey: 'urgency_result_green_action',
      bodyKey: 'urgency_result_green_body',
    };
  }

  return null;
}
