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

function unique(items) {
  return [...new Set(items)];
}

export function evaluateUrgencyTriage({ symptom = '', duration = '', markerKeys = [] } = {}) {
  const selectedMarkers = URGENCY_MARKERS.filter((marker) => markerKeys.includes(marker.key));
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
