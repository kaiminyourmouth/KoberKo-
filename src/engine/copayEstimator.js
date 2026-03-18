const ROOM_OPTIONS = ['WARD', 'SEMI_PRIVATE', 'PRIVATE'];
const ROOM_FACTORS = {
  WARD: 0,
  SEMI_PRIVATE: 0.5,
  PRIVATE: 1,
};

const PROCEDURE_LEVELS = ['NONE', 'POSSIBLE', 'LIKELY'];
const PROCEDURE_FACTORS = {
  NONE: 0,
  POSSIBLE: 0.55,
  LIKELY: 1,
};

function parseNumberList(text = '') {
  return [...text.matchAll(/\d[\d,]*/g)].map((match) =>
    Number(match[0].replace(/,/g, '')),
  );
}

export function parsePesoRange(text = '') {
  const values = parseNumberList(text);
  if (!values.length) {
    return null;
  }

  if (values.length === 1) {
    return { min: values[0], max: values[0] };
  }

  return { min: values[0], max: values[1] };
}

export function parseDayRange(text = '') {
  const lowered = text.toLowerCase();
  if (
    lowered.includes('hour') ||
    lowered.includes('oras') ||
    lowered.includes('outpatient') ||
    lowered.includes('visit') ||
    lowered.includes('session')
  ) {
    return null;
  }

  const values = parseNumberList(text);
  if (!values.length) {
    return null;
  }

  if (values.length === 1) {
    return { min: values[0], max: values[0] };
  }

  return { min: values[0], max: values[1] };
}

export function canBuildCopayEstimate(detail, coverage) {
  if (!detail || !coverage) {
    return false;
  }

  if (
    coverage.packageType === 'outpatient_package' ||
    coverage.packageType === 'hemodialysis' ||
    coverage.packageType === 'tb_dots'
  ) {
    return false;
  }

  return Boolean(parsePesoRange(detail.averageTotalBill_en) && parseDayRange(detail.typicalStay_en));
}

export function getCopayEstimatorDefaults(detail, currentRoomType = 'WARD') {
  const billRange = parsePesoRange(detail?.averageTotalBill_en);
  const stayRange = parseDayRange(detail?.typicalStay_en);

  if (!billRange || !stayRange) {
    return null;
  }

  const safeRoomType = ROOM_OPTIONS.includes(currentRoomType) ? currentRoomType : 'WARD';
  const defaultDays = Math.round((stayRange.min + stayRange.max) / 2);

  return {
    roomType: safeRoomType,
    days: defaultDays,
    procedureLevel: 'NONE',
    billRange,
    stayRange,
  };
}

export function buildCopayProjection({
  billRange,
  stayRange,
  roomType,
  days,
  procedureLevel,
  philhealthAmount,
  adjustmentAmount = 0,
}) {
  if (!billRange || !stayRange) {
    return null;
  }

  const staySpan = Math.max(stayRange.max - stayRange.min, 0);
  const normalizedStay =
    staySpan === 0 ? 0.5 : Math.min(Math.max((days - stayRange.min) / staySpan, 0), 1);
  const roomFactor = ROOM_FACTORS[roomType] ?? 0;
  const procedureFactor = PROCEDURE_FACTORS[procedureLevel] ?? 0;

  const projectionScore =
    normalizedStay * 0.45 +
    roomFactor * 0.3 +
    procedureFactor * 0.25;

  const projectedTotalRaw =
    billRange.min + (billRange.max - billRange.min) * Math.min(Math.max(projectionScore, 0), 1);
  const projectedTotal = Math.round(projectedTotalRaw / 100) * 100;
  const philhealthPays = Math.min(Math.max(philhealthAmount ?? 0, 0), projectedTotal);
  const adjustment = Math.min(Math.max(adjustmentAmount, 0), Math.max(projectedTotal - philhealthPays, 0));
  const personalShare = Math.max(projectedTotal - philhealthPays - adjustment, 0);

  return {
    projectedTotal,
    philhealthPays,
    adjustment,
    personalShare,
    projectionScore,
  };
}

export function getProcedureLevelLabelKey(level) {
  if (level === 'LIKELY') return 'copay_estimator_procedure_likely';
  if (level === 'POSSIBLE') return 'copay_estimator_procedure_possible';
  return 'copay_estimator_procedure_none';
}
