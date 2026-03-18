/**
 * KoberKo Coverage Engine
 * src/engine/coverage.js
 *
 * All data is imported statically — zero network calls, works fully offline.
 */

import conditions from '../data/conditions.json';
import benefits   from '../data/benefits.json';
import benefitLimits from '../data/benefit_limits.json';
import conditionDetails from '../data/condition_details.json';
import dependentRules from '../data/dependent_rules.json';
import documents  from '../data/documents.json';
import membershipTypes from '../data/membership_types.json';
import nbbRules from '../data/nbb_rules.json';
import {
  getCoverageVariantConfig,
  getCoverageVariantOption,
} from '../data/package_variants';
import scripts    from '../data/scripts.json';
import zbbHospitals from '../data/zbb_hospitals.json';

// ============================================================
// Helpers
// ============================================================

/**
 * Normalise a string for fuzzy matching:
 * lowercase + strip combining diacritics (accent-insensitive).
 */
function normalise(str = '') {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function tokenize(str = '') {
  return normalise(str)
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function isGovernmentHospital(hospitalType) {
  return hospitalType === 'DOH' || hospitalType === 'LGU';
}

function isPrivateHospital(hospitalType) {
  return hospitalType === 'PRIVATE_ACCREDITED' || hospitalType === 'PRIVATE_NOT_ACCREDITED';
}

function buildBenefitLimits(packageType, benefit = null) {
  const limits = [];

  const includeInpatientDefaults =
    packageType === 'case_rate' ||
    packageType === 'maternity' ||
    packageType === 'dialysis' ||
    packageType === 'hemodialysis' ||
    packageType === 'surgical' ||
    packageType === 'newborn' ||
    packageType === 'z_benefit';

  if (includeInpatientDefaults) {
    limits.push(
      {
        key: 'annualConfinementDays',
        ...benefitLimits.annualConfinementDays,
      },
      {
        key: 'singlePeriodOfConfinement',
        ...benefitLimits.singlePeriodOfConfinement,
      },
    );
  }

  if (packageType === 'dialysis' || packageType === 'hemodialysis') {
    limits.push({
      key: 'hemodialysis',
      ...benefitLimits.hemodialysis,
    });
  }

  if (packageType === 'maternity') {
    limits.push({
      key: 'maternityBenefit',
      ...benefitLimits.maternityBenefit,
    });
  }

  if (benefit?.benefitLimitKeys?.length) {
    benefit.benefitLimitKeys.forEach((key) => {
      if (benefitLimits[key]) {
        limits.push({
          key,
          ...benefitLimits[key],
        });
      }
    });
  }

  return limits;
}

function buildSourceMetadata(conditionId, benefit, variantOption = null) {
  const defaultVariantFil = benefit.packageName_fil ?? conditionId;
  const defaultVariantEn = benefit.packageName_en ?? conditionId;
  const variantUsed_fil =
    variantOption?.variantUsed_fil ?? benefit.variantUsed_fil ?? `Package used: ${defaultVariantFil}`;
  const variantUsed_en =
    variantOption?.variantUsed_en ?? benefit.variantUsed_en ?? `Package used: ${defaultVariantEn}`;
  const sourceDetail_fil =
    variantOption?.sourceDetail_fil ??
    benefit.sourceDetail_fil ??
    `Source used: ${benefit.circular}${benefit.effectiveDate_fil ? `, epektibo ${benefit.effectiveDate_fil}` : ''}.`;
  const sourceDetail_en =
    variantOption?.sourceDetail_en ??
    benefit.sourceDetail_en ??
    `Source used: ${benefit.circular}${benefit.effectiveDate ? `, effective ${benefit.effectiveDate}` : ''}.`;

  return {
    variantUsed_fil,
    variantUsed_en,
    sourceDetail_fil,
    sourceDetail_en,
    lastReviewed: benefit.lastReviewed ?? null,
    packageAccreditationNote_fil: benefit.packageAccreditationNote_fil ?? '',
    packageAccreditationNote_en: benefit.packageAccreditationNote_en ?? '',
  };
}

export function getBenefitLimits(packageType) {
  return buildBenefitLimits(packageType);
}

export function getDependentRules() {
  return dependentRules;
}

export function getDataConfidence(conditionId) {
  const benefit = benefits[conditionId];

  if (!benefit) {
    return {
      confidence: 'needs_check',
      verifiedBy: null,
    };
  }

  return {
    confidence: benefit.confidence ?? 'needs_check',
    verifiedBy: benefit.verifiedBy ?? null,
  };
}

export function getCoverageVariantOptions(conditionId) {
  const config = getCoverageVariantConfig(conditionId);
  return config?.options ?? [];
}

export function getCoverageVariantPrompt(conditionId) {
  return getCoverageVariantConfig(conditionId);
}

export function getFacilityWorkflowNote(result, hospitalType, roomType, hospitalName = '') {
  if (!result) {
    return null;
  }

  const facilityNameFil = hospitalName ? `${hospitalName}` : 'ang ospital';
  const facilityNameEn = hospitalName ? `${hospitalName}` : 'the hospital';

  if (result.packageCategory === 'z_benefit' || result.packageType === 'z_benefit') {
    return {
      title_fil: 'Workflow sa ospital',
      title_en: 'Hospital workflow',
      body_fil:
        `Para sa specialized package na ito, i-confirm sa ${facilityNameFil} at sa PhilHealth coordinator kung contracted health facility sila para sa mismong package bago magsimula ang treatment o pre-authorization.`,
      body_en:
        `For this specialized package, confirm with ${facilityNameEn} and the PhilHealth coordinator that they are a contracted health facility for this exact package before treatment or pre-authorization starts.`,
    };
  }

  if (hospitalType === 'PRIVATE_ACCREDITED' || hospitalType === 'PRIVATE_NOT_ACCREDITED') {
    return {
      title_fil: 'Workflow sa ospital',
      title_en: 'Hospital workflow',
      body_fil:
        'Sa private hospital, kadalasang ibinabawas muna ang PhilHealth package at pagkatapos ay saka papasok ang HMO o natitirang co-pay. Ipa-itemize agad ang bill bago ma-discharge.',
      body_en:
        'In a private hospital, the PhilHealth package is usually deducted first, then any HMO coverage or remaining co-pay is applied. Ask for an itemized bill before discharge.',
    };
  }

  if (hospitalType === 'DOH' || hospitalType === 'LGU') {
    return {
      title_fil: 'Workflow sa ospital',
      title_en: 'Hospital workflow',
      body_fil:
        `Sa government hospital, dalhin agad ang diagnosis, MDR, at valid ID sa admitting o billing desk para ma-file ang tamang package${roomType === 'WARD' ? ' at ma-check kung may zero-billing setup' : ''}.`,
      body_en:
        `In a government hospital, bring the diagnosis, MDR, and valid ID to the admitting or billing desk early so the correct package can be filed${roomType === 'WARD' ? ' and zero-billing eligibility can be checked' : ''}.`,
    };
  }

  if (result.directFiling) {
    return {
      title_fil: 'Workflow sa ospital',
      title_en: 'Hospital workflow',
      body_fil:
        'I-confirm sa admitting o billing bago ma-discharge na direct filing ang package at ang exact variant ang naka-encode sa claim forms at chart.',
      body_en:
        'Before discharge, confirm with admitting or billing that the package is being direct-filed and that the exact variant is encoded in the claim forms and chart.',
    };
  }

  return null;
}

// ============================================================
// getCoverage
// ============================================================

/**
 * Returns the full coverage result for a given condition, membership, and hospital level.
 * Returns null if the condition is not found in the data.
 *
 * @param {string} conditionId   — e.g. 'CAP'
 * @param {string} memberType    — 'SSS' | 'GSIS' | 'VOLUNTARY' | 'NHTS' | 'SENIOR' | 'PWD'
 * @param {string} hospitalLevel — 'level1' | 'level2' | 'level3' | 'level4'
 * @returns {object|null}
 */
export function getCoverage(conditionId, memberType, hospitalLevel, options = {}) {
  const condition = conditions.find((c) => c.id === conditionId);
  if (!condition) return null;

  const benefit = benefits[conditionId];
  if (!benefit) return null;
  const variantOption = options.variantKey
    ? getCoverageVariantOption(conditionId, options.variantKey)
    : null;
  const dataConfidence = getDataConfidence(conditionId);
  const sourceMetadata = buildSourceMetadata(conditionId, benefit, variantOption);

  const script   = scripts[conditionId]  ?? {};
  const docList  = documents[benefit.packageType] ?? [];
  const membershipOverride = benefit.membershipOverrides?.[memberType] ?? null;

  // Numeric amount for this level
  const amount = variantOption?.amount ?? benefit.rates?.[hospitalLevel] ?? 0;

  // Co-pay range
  const copayRange = benefit.copay?.[hospitalLevel] ?? { min: 0, max: 0 };

  // Membership-specific note
  const eligibilityNote_fil =
    membershipOverride?.eligibilityNote_fil ?? benefit.eligibilityNote_fil ?? null;
  const eligibilityNote_en =
    membershipOverride?.eligibilityNote_en ?? benefit.eligibilityNote_en ?? null;
  const bonusNote_fil = membershipOverride?.bonusNote_fil ?? null;
  const bonusNote_en = membershipOverride?.bonusNote_en ?? null;
  const membershipNote_fil = [eligibilityNote_fil, bonusNote_fil].filter(Boolean).join(' ') || null;
  const membershipNote_en = [eligibilityNote_en, bonusNote_en].filter(Boolean).join(' ') || null;

  return {
    // Condition identity
    conditionId,
    conditionName_fil: condition.name_fil,
    conditionName_en:  condition.name_en,

    // Coverage figures
    amount,
    packageName_fil: variantOption?.packageName_fil ?? benefit.packageName_fil,
    packageName_en:  variantOption?.packageName_en ?? benefit.packageName_en,
    packageCategory: benefit.packageCategory,
    directFiling:    benefit.directFiling,
    copayMin:        copayRange.min,
    copayMax:        copayRange.max,

    // Citation
    circular:         variantOption?.circular ?? benefit.circular,
    circularUrl:      variantOption?.circularUrl ?? benefit.circularUrl ?? '',
    effectiveDate:    benefit.effectiveDate,
    effectiveDate_fil: benefit.effectiveDate_fil,
    hospitalFeePercent: benefit.hospitalFeePercent ?? null,
    professionalFeePercent: benefit.professionalFeePercent ?? null,

    // Package type
    packageType: benefit.packageType,

    // Documents (full list for this package type)
    documents: docList,

    // Billing guidance
    billingScript_fil: script.billingScript_fil ?? '',
    billingScript_en:  script.billingScript_en  ?? '',
    redFlags:          script.redFlags          ?? [],

    // Malasakit
    malasakitEligible:
      membershipOverride?.malasakitEligible ??
      script.malasakitEligible ??
      false,
    malasakitNote_fil: script.malasakitNote_fil ?? '',
    malasakitNote_en:  script.malasakitNote_en  ?? '',

    // Membership-specific note
    eligibilityNote_fil,
    eligibilityNote_en,
    bonusNote_fil,
    bonusNote_en,
    membershipNote_fil,
    membershipNote_en,

    reimbursementDeadline_fil: benefit.reimbursementDeadline_fil ?? '',
    reimbursementDeadline_en: benefit.reimbursementDeadline_en ?? '',
    adjustmentNote_fil: benefit.adjustmentNote_fil ?? '',
    adjustmentNote_en: benefit.adjustmentNote_en ?? '',
    secondCaseRateEligible: benefit.secondCaseRateEligible ?? false,
    secondCaseRateNote_fil: benefit.secondCaseRateNote_fil ?? '',
    secondCaseRateNote_en: benefit.secondCaseRateNote_en ?? '',
    requiresPreAuth: benefit.requiresPreAuth ?? condition.requiresPreAuth ?? false,
    preAuthNote_fil: benefit.preAuthNote_fil ?? '',
    preAuthNote_en: benefit.preAuthNote_en ?? '',
    coverageNote_fil: variantOption?.coverageNote_fil ?? benefit.coverageNote_fil ?? '',
    coverageNote_en: variantOption?.coverageNote_en ?? benefit.coverageNote_en ?? '',
    sessionsPerYear: benefit.sessionsPerYear ?? null,
    sessionsPerWeek: benefit.sessionsPerWeek ?? null,
    subPackages: benefit.subPackages ?? [],
    benefitLimits: buildBenefitLimits(benefit.packageType, benefit),
    dataConfidence,
    confidence: dataConfidence.confidence,
    verifiedBy: dataConfidence.verifiedBy,
    selectedVariantKey: variantOption?.key ?? options.variantKey ?? '',
    selectedVariantName_fil: variantOption?.label_fil ?? '',
    selectedVariantName_en: variantOption?.label_en ?? '',
    variantUsed_fil: sourceMetadata.variantUsed_fil,
    variantUsed_en: sourceMetadata.variantUsed_en,
    sourceDetail_fil: sourceMetadata.sourceDetail_fil,
    sourceDetail_en: sourceMetadata.sourceDetail_en,
    lastReviewed: sourceMetadata.lastReviewed,
    packageAccreditationNote_fil: sourceMetadata.packageAccreditationNote_fil,
    packageAccreditationNote_en: sourceMetadata.packageAccreditationNote_en,

    // Data quality flag
    needsVerification: benefit.needsVerification ?? false,
  };
}

export function getZBBStatus(memberType, hospitalType, roomType) {
  const membership = membershipTypes.find((option) => option.id === memberType) ?? null;
  const nbbEligible = Boolean(membership?.nbpEligible);
  const isWard = roomType === 'WARD';
  const isPrivateRoom = roomType === 'PRIVATE';

  if (hospitalType === 'DOH' && isWard) {
    return {
      zbbApplies: true,
      zbbType: 'FULL_ZBB',
      coPayAmount: null,
      explanation_fil: zbbHospitals.policy_fil,
      explanation_en: zbbHospitals.policy_en,
      warning_fil: nbbRules.privateDoctorNote_fil,
      warning_en: nbbRules.privateDoctorNote_en,
    };
  }

  if (isGovernmentHospital(hospitalType) && isWard && nbbEligible) {
    return {
      zbbApplies: true,
      zbbType: 'NBB',
      coPayAmount: null,
      explanation_fil: nbbRules.whatsCovered_fil,
      explanation_en: nbbRules.whatsCovered_en,
      warning_fil: nbbRules.privateDoctorNote_fil,
      warning_en: nbbRules.privateDoctorNote_en,
    };
  }

  if (isWard && nbbEligible) {
    return {
      zbbApplies: true,
      zbbType: 'NBB',
      coPayAmount: null,
      explanation_fil: nbbRules.whereApplies_fil,
      explanation_en: nbbRules.whereApplies_en,
      warning_fil: nbbRules.exception_fil,
      warning_en: nbbRules.exception_en,
    };
  }

  if (isPrivateRoom) {
    return {
      zbbApplies: false,
      zbbType: 'NONE',
      coPayAmount: 0,
      explanation_fil: zbbHospitals.wardNote_fil,
      explanation_en: zbbHospitals.wardNote_en,
      warning_fil: nbbRules.exception_fil,
      warning_en: nbbRules.exception_en,
    };
  }

  if (isPrivateHospital(hospitalType)) {
    return {
      zbbApplies: false,
      zbbType: 'NONE',
      coPayAmount: 0,
      explanation_fil: 'Private hospital ito, kaya regular PhilHealth package at co-pay ang mag-aaplika maliban kung may hiwalay silang NBB arrangement.',
      explanation_en: 'This is a private hospital, so the regular PhilHealth package and co-pay will apply unless they have a separate NBB arrangement.',
      warning_fil: zbbHospitals.wardNote_fil,
      warning_en: zbbHospitals.wardNote_en,
    };
  }

  return {
    zbbApplies: false,
    zbbType: 'NONE',
    coPayAmount: 0,
    explanation_fil: 'Regular na PhilHealth package muna ang gamitin. I-check sa admitting kung government hospital ito at kung ward ang available para sa mas malaking coverage.',
    explanation_en: 'Use the regular PhilHealth package for now. Check with admitting if this is a government hospital and if ward accommodation is available for better coverage.',
    warning_fil: null,
    warning_en: null,
  };
}

// ============================================================
// searchConditions
// ============================================================

/**
 * Search conditions by query string.
 * Searches name_fil, name_en, and searchTerms — accent-insensitive, case-insensitive.
 * Returns [] if query is whitespace only (caller should handle empty input → show all).
 * Returns all conditions if query is an empty string.
 *
 * Results are sorted by relevance:
 *   1. Exact ID match
 *   2. Name starts-with match
 *   3. Name contains match
 *   4. Search term match
 *
 * @param {string} query
 * @param {string} [lang='fil']
 * @returns {Array<object>} — array of condition objects
 */
export function searchConditions(query = '', lang = 'fil') {
  const q = normalise(query.trim());
  const queryTokens = tokenize(query);

  // Empty query → return all conditions
  if (!q) return [...conditions];

  const scored = conditions
    .map((cond) => {
      const id       = normalise(cond.id);
      const nameFil  = normalise(cond.name_fil);
      const nameEn   = normalise(cond.name_en);
      const terms    = (cond.searchTerms ?? []).map(normalise);
      const namePrimary = lang === 'en' ? nameEn : nameFil;
      const detail = conditionDetails[cond.id] ?? null;
      const detailHaystack = normalise([
        detail?.whatIsIt_fil,
        detail?.whatIsIt_en,
        ...(detail?.symptoms_fil ?? []),
        ...(detail?.symptoms_en ?? []),
        ...(detail?.tips_fil ?? []),
        ...(detail?.tips_en ?? []),
        ...(cond.searchTerms ?? []),
      ].filter(Boolean).join(' '));

      let score = 0;

      // Exact ID match
      if (id === q) score = 100;
      // Primary name exact
      else if (namePrimary === q) score = 90;
      // Primary name starts with
      else if (namePrimary.startsWith(q)) score = 80;
      // Secondary name starts with
      else if ((lang === 'en' ? nameFil : nameEn).startsWith(q)) score = 70;
      // Primary name contains
      else if (namePrimary.includes(q)) score = 60;
      // Secondary name contains
      else if ((lang === 'en' ? nameFil : nameEn).includes(q)) score = 50;
      // Search term exact match
      else if (terms.some((t) => t === q)) score = 45;
      // Search term starts-with
      else if (terms.some((t) => t.startsWith(q))) score = 35;
      // Search term contains
      else if (terms.some((t) => t.includes(q))) score = 25;

      if (detailHaystack) {
        if (detailHaystack.includes(q)) {
          score = Math.max(score, 34);
        }

        if (queryTokens.length) {
          const matchedTokens = queryTokens.filter((token) => detailHaystack.includes(token));

          if (matchedTokens.length === queryTokens.length) {
            score = Math.max(score, 30 + matchedTokens.length * 3);
          } else if (matchedTokens.length >= 2) {
            score = Math.max(score, 20 + matchedTokens.length * 3);
          } else if (matchedTokens.length === 1) {
            score = Math.max(score, 16);
          }
        }
      }

      return { condition: cond, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map(({ condition }) => condition);
}

// ============================================================
// getConditionsBySystem
// ============================================================

/**
 * Groups all conditions by body system.
 * Returns an object keyed by the body system label in the requested language.
 *
 * @param {string} [lang='fil']
 * @returns {Record<string, Array<object>>}
 */
export function getConditionsBySystem(lang = 'fil') {
  return conditions.reduce((acc, cond) => {
    const systemKey =
      lang === 'en' ? cond.bodySystem_en : cond.bodySystem_fil;

    if (!acc[systemKey]) {
      acc[systemKey] = [];
    }
    acc[systemKey].push(cond);
    return acc;
  }, {});
}

// ============================================================
// getConditionDetail
// ============================================================

/**
 * Returns the detailed educational content for a condition.
 *
 * @param {string} conditionId
 * @returns {object|null}
 */
export function getConditionDetail(conditionId) {
  return conditionDetails[conditionId] ?? null;
}

/**
 * Returns the benefit/package record for a given condition ID, or null if not found.
 *
 * @param {string} conditionId
 * @returns {object|null}
 */
export function getBenefitById(conditionId) {
  return benefits[conditionId] ?? null;
}

/**
 * Returns the condition object for a given condition ID, or null if not found.
 *
 * @param {string} conditionId — e.g. 'CAP'
 * @returns {object|null}
 */
export function getConditionById(conditionId) {
  return conditions.find((c) => c.id === conditionId) ?? null;
}
