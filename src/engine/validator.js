import { getCoverage } from './coverage';

function extractAmounts(text) {
  const matches = text.match(/[₱P][\d,]+/g) || [];
  return matches
    .map((match) => parseInt(match.replace(/[₱P,]/g, ''), 10))
    .filter((value) => Number.isFinite(value));
}

export function validateAIResponse(responseText, context) {
  const warnings = [];

  if (!context || !context.conditionId || !context.hospitalLevel) {
    return { valid: true, warnings: [] };
  }

  const coverage = getCoverage(
    context.conditionId,
    context.memberType,
    context.hospitalLevel,
    { variantKey: context.coverageVariantKey || undefined },
  );
  const knownAmount = coverage?.amount;
  if (!knownAmount) {
    return { valid: true, warnings: [] };
  }

  const mentionedAmounts = extractAmounts(responseText);

  for (const amount of mentionedAmounts) {
    const deviation = Math.abs(amount - knownAmount) / knownAmount;
    if (deviation > 0.3 && amount > 1000) {
      warnings.push({
        type: 'AMOUNT_DEVIATION',
        message: `AI mentioned ₱${amount.toLocaleString()} but KoberKo data shows ₱${knownAmount.toLocaleString()} for ${context.conditionId} at ${context.hospitalLevel}`,
        severity: deviation > 0.5 ? 'HIGH' : 'MEDIUM',
      });
    }
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}

export function checkForbiddenPatterns(responseText) {
  const forbidden = [
    {
      pattern: /definitely.*approved|guaranteed.*claim|sure.*maaprubahan/i,
      message: 'AI used absolute approval language - violates HARD REFUSAL RULE 4',
    },
    {
      pattern: /your doctor should|take this medicine|increase your dose/i,
      message: 'AI gave medical advice - violates HARD REFUSAL RULE 3',
    },
  ];

  const violations = forbidden
    .filter((item) => item.pattern.test(responseText))
    .map((item) => item.message);

  return { hasViolations: violations.length > 0, violations };
}
