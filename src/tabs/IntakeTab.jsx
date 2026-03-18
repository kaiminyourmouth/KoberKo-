import { startTransition, useEffect, useMemo, useState } from 'react';
import Accordion from '../components/Accordion';
import Badge from '../components/Badge';
import BottomSheet from '../components/BottomSheet';
import Card from '../components/Card';
import ReimbursementGuide from '../components/ReimbursementGuide';
import { useToast } from '../components/Toast';
import {
  HOSPITAL_LEVELS,
  HOSPITAL_TYPE_OPTIONS,
  MEMBERSHIP_OPTIONS,
  SAVED_RESULTS_KEY,
  ROOM_TYPE_OPTIONS,
  getHospitalLevelNumber,
  getMembershipLabel,
  getMembershipOptionById,
} from '../constants/options';
import {
  getBenefitById,
  getConditionById,
  getConditionDetail,
  getConditionsBySystem,
  getCoverage,
  getCoverageVariantPrompt,
  getDependentRules,
  getFacilityWorkflowNote,
  getZBBStatus,
  searchConditions,
} from '../engine/coverage';
import {
  URGENCY_DURATION_OPTIONS,
  URGENCY_MARKERS,
  evaluateUrgencyTriage,
} from '../engine/urgencyTriage';
import {
  getCities,
  getCitiesByProvince,
  getHospitalById,
  getHospitalsByCity,
  getHospitalsByProvince,
  getProvinces,
  HOSPITAL_DATA_PROVENANCE,
  searchHospitals,
} from '../engine/hospitalSearch';
import claimDenial from '../data/claim_denial.json';
import { useLanguage } from '../context/LanguageContext';
import { useSearch } from '../context/SearchContext';
import useDebounce from '../hooks/useDebounce';
import { askGroq, identifyConditionFromSymptoms } from '../services/groq';
import { copyText } from '../utils/clipboard';
import { loadDefaultMembership, saveResultToStorage } from '../utils/storage';
import './tabs.css';

const TOTAL_QUESTIONS = 7;
const TOTAL_QUESTIONS_WITH_VARIANT = 8;
const PHYSICIAN_SEARCH_URL = 'https://philhealth.gov.ph/about/phps';
const MEMBER_PORTAL_URL = 'https://memberinquiry.philhealth.gov.ph/member/';
const dependentRules = getDependentRules();

const SCENARIOS = [
  { code: 'SCENARIO_AT_BILLING_COUNTER', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, labelKey: 'intake_scenario_billing_label', descKey: 'intake_scenario_billing_desc' },
  { code: 'SCENARIO_DOCTOR_ADMITTED', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>, labelKey: 'intake_scenario_doctor_label', descKey: 'intake_scenario_doctor_desc' },
  { code: 'SCENARIO_ALREADY_ADMITTED', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/><path d="M7.5 14h3"/><path d="M15 14h2.5"/></svg>, labelKey: 'intake_scenario_admitted_label', descKey: 'intake_scenario_admitted_desc' },
  { code: 'SCENARIO_SYMPTOMS_UNKNOWN', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.15 9.25a2.85 2.85 0 1 1 4.7 2.92c-.92.7-1.85 1.18-1.85 2.33"/><path d="M12 17.2h.01"/></svg>, labelKey: 'intake_scenario_symptoms_label', descKey: 'intake_scenario_symptoms_desc' },
  { code: 'SCENARIO_AFTER_DISCHARGE', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>, labelKey: 'intake_scenario_discharge_label', descKey: 'intake_scenario_discharge_desc' },
  { code: 'SCENARIO_PLANNING', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0"/></svg>, labelKey: 'intake_scenario_planning_label', descKey: 'intake_scenario_planning_desc' },
];

const RELATIONSHIPS = [
  { code: 'SELF', labelKey: 'intake_relationship_self', desc_en: 'I am the patient', desc_fil: 'Ako ang pasyente', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8"/></svg> },
  { code: 'SPOUSE', labelKey: 'intake_relationship_spouse', desc_en: 'My husband or wife', desc_fil: 'Asawa ko', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
  { code: 'PARENT', labelKey: 'intake_relationship_parent', desc_en: 'My mother or father', desc_fil: 'Nanay o tatay ko', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m14 10v-2a4 4 0 0 0-3-3.87m-4-12a4 4 0 0 1 0 7.75"/></svg> },
  { code: 'CHILD', labelKey: 'intake_relationship_child', desc_en: 'My son or daughter', desc_fil: 'Anak ko', icon: <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="5.5" r="2.5" fill="currentColor"/><path d="M12 9c-2.1 0-3.5 1.4-3.5 3.4v5.8a1 1 0 0 0 2 0v-4.2l.7-.7 2.3 2.3 2.3-2.3.7.7v4.2a1 1 0 0 0 2 0v-5.8C18.5 10.4 17.1 9 15 9Z" fill="currentColor"/><path d="M10.1 11 6.8 7.8a1.2 1.2 0 0 0-1.7 1.7l3.5 3.4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/><path d="m13.9 11 3.3-3.2a1.2 1.2 0 0 1 1.7 1.7l-3.5 3.4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { code: 'SIBLING', labelKey: 'intake_relationship_sibling', desc_en: 'My brother or sister', desc_fil: 'Kapatid ko', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m14 10v-2a4 4 0 0 0-3-3.87m-4-12a4 4 0 0 1 0 7.75"/></svg> },
  { code: 'OTHER', labelKey: 'intake_relationship_other', desc_en: 'Extended family or other', desc_fil: 'Iba pang kamag-anak', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg> },
];

const MEMBERSHIP_ICONS = {
  SSS: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
  GSIS: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 22V9l9-7 9 7v13M9 22V12h6v10"/></svg>,
  VOLUNTARY: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>,
  OFW: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19.5 2.5S18 2 16.5 3.5L13 7 4.8 5.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>,
  NHTS: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 13c-1.1 0-2 .9-2 2s2 4 2 4 2-2.9 2-4-.9-2-2-2z"/></svg>,
  SPONSORED: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2M12 12v4M8 12v4M16 12v4"/></svg>,
  SENIOR: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="13" cy="4.25" r="2.1" fill="currentColor" stroke="none"/><path d="M12.6 7.1 9.8 10.2"/><path d="M9.8 10.2 8.3 18.7"/><path d="M12.1 9.4 14.9 12.1"/><path d="M14.2 11.5 13.2 18.2"/><path d="M16.8 11.2v7.5"/><path d="M16.8 18.7h1.8"/></svg>,
  LIFETIME: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  PWD: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="14.7" cy="3.8" r="2.2" fill="currentColor"/><path d="M12.2 7.4a2.2 2.2 0 0 1 2.2-2.2h.9a2 2 0 0 1 1.9 1.4l.5 1.5h2.5a1.4 1.4 0 1 1 0 2.8h-4.4l-.7-2.2v4.1l3.9 7.4a1.8 1.8 0 1 1-3.2 1.5L12 15.1H9.8a2.6 2.6 0 0 1-2.6-2.6V9.8a2.4 2.4 0 0 1 .7-1.7l1.8-1.8" fill="currentColor"/><path d="M11.2 12.6a5.6 5.6 0 1 1-5.3 3.8" stroke="var(--color-success)" strokeWidth="2.2" strokeLinecap="round"/><circle cx="8.1" cy="17" r="1.2" fill="var(--color-success)"/></svg>,
  KASAMBAHAY: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>,
};

const CLAIM_OUTCOMES = [
  {
    code: 'NOT_FILED',
    labelKey: 'intake_claim_outcome_not_filed_label',
    descKey: 'intake_claim_outcome_not_filed_desc',
  },
  {
    code: 'DENIED',
    labelKey: 'intake_claim_outcome_denied_label',
    descKey: 'intake_claim_outcome_denied_desc',
  },
  {
    code: 'WAITING',
    labelKey: 'intake_claim_outcome_waiting_label',
    descKey: 'intake_claim_outcome_waiting_desc',
  },
];

function isDependentRelationship(relationship) {
  return Boolean(relationship && relationship !== 'SELF');
}

function buildEligibilityItems(memberType, includeDependentCheck, t) {
  const maybeDependentItem = includeDependentCheck
    ? [
        {
          key: 'dependent',
          checked: false,
          label: t('eligibility_check_dependent'),
        },
      ]
    : [];

  switch (memberType) {
    case 'SSS':
    case 'GSIS':
      return [
        {
          key: 'contribution',
          checked: false,
          label: t('eligibility_check_contribution'),
          hint: t('eligibility_check_contribution_hint'),
          href: MEMBER_PORTAL_URL,
        },
        {
          key: 'employer',
          checked: false,
          label: t('eligibility_check_employer'),
        },
        ...maybeDependentItem,
      ];
    case 'VOLUNTARY':
      return [
        {
          key: 'contribution',
          checked: false,
          label: t('eligibility_check_contribution'),
          hint: t('eligibility_check_contribution_hint'),
          href: MEMBER_PORTAL_URL,
        },
        {
          key: 'active',
          checked: false,
          label: t('eligibility_check_membership_active'),
        },
        ...maybeDependentItem,
      ];
    case 'NHTS':
    case 'SENIOR':
    case 'LIFETIME':
      return [
        {
          key: 'id',
          checked: false,
          label: t('eligibility_check_id'),
        },
        ...maybeDependentItem,
        {
          key: 'no-contribution',
          checked: true,
          label: t('eligibility_check_no_contribution'),
        },
      ];
    case 'OFW':
      return [
        {
          key: 'ofw',
          checked: false,
          label: t('eligibility_check_ofw'),
        },
        ...maybeDependentItem,
      ];
    case 'SPONSORED':
      return [
        {
          key: 'sponsor',
          checked: false,
          label: t('eligibility_check_sponsor_current'),
        },
        ...maybeDependentItem,
        {
          key: 'no-contribution',
          checked: true,
          label: t('eligibility_check_no_contribution'),
        },
      ];
    case 'KASAMBAHAY':
      return [
        {
          key: 'kasambahay',
          checked: false,
          label: t('eligibility_check_employer_registered'),
        },
        ...maybeDependentItem,
      ];
    case 'PWD':
      return [
        {
          key: 'pwd',
          checked: false,
          label: t('eligibility_check_pwd_id'),
        },
        ...maybeDependentItem,
      ];
    default:
      return maybeDependentItem;
  }
}



function buildInitialAnswers(searchState) {
  const intakeContext = searchState.intakeContext ?? {};

  return {
    scenario: intakeContext.scenario ?? '',
    claimOutcome: intakeContext.claimOutcome ?? '',
    patientAge:
      intakeContext.patientAge === null || intakeContext.patientAge === undefined
        ? ''
        : String(intakeContext.patientAge),
    patientRelationship: intakeContext.patientRelationship ?? 'SELF',
    conditionMode:
      intakeContext.symptomDescription && !intakeContext.conditionId ? 'symptoms' : 'diagnosis',
    conditionId: intakeContext.conditionId ?? searchState.conditionId ?? '',
    symptomDescription: intakeContext.symptomDescription ?? '',
    memberType: intakeContext.memberType ?? searchState.memberType ?? loadDefaultMembership(),
    hospitalLevel: intakeContext.hospitalLevel ?? searchState.hospitalLevel ?? '',
    hospitalType: intakeContext.hospitalType ?? searchState.hospitalType ?? '',
    roomType: intakeContext.roomType ?? searchState.roomType ?? '',
    hospitalId: intakeContext.hospitalId ?? searchState.hospitalId ?? '',
    hospitalName: intakeContext.hospitalName ?? '',
    hospitalCity: intakeContext.hospitalCity ?? searchState.hospitalCity ?? '',
    hospitalProvince: intakeContext.hospitalProvince ?? searchState.hospitalProvince ?? '',
    coverageVariantKey: intakeContext.coverageVariantKey ?? searchState.coverageVariantKey ?? '',
  };
}

function formatAmount(amount) {
  if (typeof amount !== 'number') {
    return '0';
  }

  return amount.toLocaleString();
}

function normalizePlaceValue(value = '') {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function mapHospitalTypeToSelection(type) {
  if (type === 'PRIVATE') {
    return 'PRIVATE_ACCREDITED';
  }

  return type || '';
}

function getHospitalTypeLabel(type, t) {
  if (type === 'DOH') return 'DOH';
  if (type === 'LGU') return 'LGU';
  return t('hospital_type_tag_PRIVATE_ACCREDITED');
}

function getRoomTypeLabel(roomType, lang) {
  const option = ROOM_TYPE_OPTIONS.find((item) => item.code === roomType);
  if (!option) {
    return '';
  }

  return lang === 'en' ? option.label_en : option.label_fil;
}



function buildEmergencyScript(lang, conditionName) {
  if (lang === 'en') {
    return conditionName
      ? `Please process PhilHealth direct filing for ${conditionName} now. If this is a covered case, the hospital should not ask us to pay the PhilHealth portion upfront. If there is a problem, please call the PhilHealth coordinator.`
      : 'Please check the PhilHealth coverage for this case now. If this is a covered direct filing case, the hospital should not ask us to pay the PhilHealth portion upfront. Please call the PhilHealth coordinator if needed.';
  }

  return conditionName
    ? `Pakiproseso po ang PhilHealth direct filing para sa ${conditionName} ngayon. Kung covered case ito, hindi dapat ipabayad muna sa amin ang PhilHealth portion. Kung may problema, pakiusap tawagin ang PhilHealth coordinator.`
    : 'Pakicheck po ang PhilHealth coverage para sa kasong ito ngayon. Kung covered direct filing case ito, hindi dapat ipabayad muna sa amin ang PhilHealth portion. Pakitawag ang PhilHealth coordinator kung kailangan.';
}

function buildFallbackGuidance(scenario, lang, context, coverage) {
  const conditionName = context.conditionName || (lang === 'en' ? 'the case' : 'ang kaso');
  const hotline = '(02) 866-225-88';

  const fallbackMap = {
    SCENARIO_DOCTOR_ADMITTED:
      lang === 'en'
        ? `1. Bring the PhilHealth member details, ID, and the doctor's diagnosis for ${conditionName}.\n2. Before admission, ask admitting if the hospital will direct file the PhilHealth package.\n3. Keep copies of the MDR, valid IDs, and any doctor's request. If billing becomes unclear, call PhilHealth at ${hotline}.`
        : `1. Ihanda ang detalye ng PhilHealth member, ID, at diagnosis ng doktor para sa ${conditionName}.\n2. Bago ma-admit, itanong agad sa admitting kung idi-direct file ng ospital ang PhilHealth package.\n3. Magdala ng kopya ng MDR, valid ID, at request ng doktor. Kapag magulo ang billing, tumawag sa PhilHealth hotline ${hotline}.`,
    SCENARIO_ALREADY_ADMITTED:
      lang === 'en'
        ? `1. Go to billing or the PhilHealth desk now and confirm the package amount for ${conditionName}.\n2. Submit missing documents before discharge so direct filing is not delayed.\n3. If the hospital refuses direct filing for a covered case, ask for the PhilHealth coordinator and call ${hotline}.`
        : `1. Pumunta agad sa billing o PhilHealth desk at i-confirm ang package amount para sa ${conditionName}.\n2. Kumpletuhin ang kulang na dokumento bago ma-discharge para hindi maantala ang direct filing.\n3. Kung tumatanggi ang ospital sa direct filing para sa covered case, hingin ang PhilHealth coordinator at tumawag sa ${hotline}.`,
    SCENARIO_AFTER_DISCHARGE:
      lang === 'en'
        ? `1. Gather the OR, itemized SOA, discharge summary, CF1/CF2, and the member's MDR.\n2. File the reimbursement claim within 60 days from discharge.\n3. Keep photocopies of every document and follow up with PhilHealth if there is any delay.`
        : '1. Tipunin ang OR, itemized SOA, discharge summary, CF1/CF2, at MDR ng miyembro.\n2. Ihabol ang reimbursement claim sa loob ng 60 araw mula discharge.\n3. Magtabi ng kopya ng lahat ng dokumento at mag-follow up sa PhilHealth kung may delay.',
    SCENARIO_PLANNING:
      lang === 'en'
        ? `1. Ask the hospital what room type and facility fees may still be outside the package.\n2. Confirm the PhilHealth amount for ${conditionName}${coverage ? `, which is currently ₱${coverage.amount.toLocaleString()}` : ''}.\n3. Bring IDs and PhilHealth member details ahead of time so admission is smoother.`
        : `1. Itanong sa ospital kung anong room type at facility fees ang posibleng hindi kasama sa package.\n2. I-confirm ang PhilHealth amount para sa ${conditionName}${coverage ? `, na kasalukuyang ₱${coverage.amount.toLocaleString()}` : ''}.\n3. Ihanda na ang mga ID at PhilHealth member details para mas mabilis ang admission.`,
    SCENARIO_SYMPTOMS_UNKNOWN:
      lang === 'en'
        ? '1. Use the likely condition matches below as a billing guide only.\n2. Confirm the exact diagnosis with the doctor before relying on the PhilHealth package amount.\n3. Once confirmed, bring the diagnosis, IDs, and membership details to the admitting section.'
        : '1. Gamitin lang muna bilang billing guide ang mga posibleng kondisyon sa ibaba.\n2. I-confirm muna sa doktor ang eksaktong diagnosis bago umasa sa package amount ng PhilHealth.\n3. Kapag confirmed na, dalhin ang diagnosis, mga ID, at membership details sa admitting section.',
  };

  return fallbackMap[scenario] || (lang === 'en' ? 'Verify the package with the hospital and keep your PhilHealth documents ready.' : 'I-verify ang package sa ospital at ihanda ang inyong PhilHealth documents.');
}

function buildGuidancePrompt(lang, context) {
  const isFil = lang !== 'en';

  const scenarioPromptMap = {
    SCENARIO_DOCTOR_ADMITTED: isFil
      ? 'Magbigay ng maikling action steps bago pumasok sa ospital. Isama ang documents, ano ang itatanong sa admitting, at paalala sa direct filing.'
      : 'Give short action steps before going to the hospital. Include documents, what to ask admitting, and a direct filing reminder.',
    SCENARIO_ALREADY_ADMITTED: isFil
      ? 'Magbigay ng maikling action steps habang nasa ospital na. Isama ang billing script, ano ang isusumite sa billing, at sino ang kakausapin kapag may problema.'
      : 'Give short action steps while already in the hospital. Include the billing script, what to submit to billing, and who to talk to when there is a problem.',
    SCENARIO_AFTER_DISCHARGE: isFil
      ? 'Magbigay ng maikling reimbursement steps. Isama ang 60-day deadline at mga pangunahing dokumento.'
      : 'Give short reimbursement steps. Include the 60-day deadline and the main documents needed.',
    SCENARIO_PLANNING: isFil
      ? 'Magbigay ng maikling preparation steps bago ma-admit. Isama ang co-pay expectations at ano ang dapat i-verify sa ospital.'
      : 'Give short preparation steps before admission. Include co-pay expectations and what to verify with the hospital.',
    SCENARIO_SYMPTOMS_UNKNOWN: isFil
      ? 'Magbigay ng maikling guidance habang hindi pa sigurado ang diagnosis. Sabihin na kailangan i-confirm sa doktor at kung ano ang ihahanda habang naghihintay.'
      : 'Give short guidance while the diagnosis is still uncertain. Say that the diagnosis must be confirmed by the doctor and what to prepare while waiting.',
  };

  return scenarioPromptMap[context.scenario] || (isFil ? 'Magbigay ng maikling actionable guidance para sa kasong ito.' : 'Give short actionable guidance for this case.');
}

function buildLikelyConditions(matches, answers) {
  return matches.map((match) => {
    const coverage =
      answers.memberType && answers.hospitalLevel
        ? getCoverage(match.conditionId, answers.memberType, answers.hospitalLevel)
        : null;

    return {
      ...match,
      amount: coverage?.amount ?? null,
      directFiling: coverage?.directFiling ?? null,
    };
  });
}

function buildShareText(lang, intakeResult, answers, t) {
  const coverage = intakeResult.coverage;
  const conditionText = getLocalizedConditionName(intakeResult, lang) || t('intake_result_unknown_condition');
  const statusText = coverage
    ? coverage.directFiling
      ? t('direct_filing_badge')
      : t('reimburse_only_badge')
    : t('intake_result_pending_confirmation');

  if (lang === 'en') {
    return `KoberKo\nCondition: ${conditionText}\nScenario: ${t(intakeResult.headerKey)}\nCoverage: ${coverage ? `₱${coverage.amount.toLocaleString()}` : 'Pending confirmation'}\nStatus: ${statusText}\nHospital level: ${answers.hospitalLevel || 'Not set'}`;
  }

  return `KoberKo\nKondisyon: ${conditionText}\nSitwasyon: ${t(intakeResult.headerKey)}\nCoverage: ${coverage ? `₱${coverage.amount.toLocaleString()}` : 'Hinihintay pa ang kumpirmasyon'}\nStatus: ${statusText}\nAntas ng ospital: ${answers.hospitalLevel || 'Wala pa'}`;
}

function getLocalizedConditionName(result, lang) {
  if (!result) {
    return '';
  }

  if (result.coverage) {
    return lang === 'en' ? result.coverage.conditionName_en : result.coverage.conditionName_fil;
  }

  if (lang === 'en') {
    return result.conditionName_en || result.conditionName || '';
  }

  return result.conditionName_fil || result.conditionName || '';
}

function getLocalizedActionSteps(result, lang) {
  if (!result) {
    return '';
  }

  if (lang === 'en') {
    return result.actionSteps_en || result.actionSteps || '';
  }

  return result.actionSteps_fil || result.actionSteps || '';
}

function getLocalizedBillingScript(result, lang) {
  if (!result) {
    return '';
  }

  if (lang === 'en') {
    return result.billingScript_en || result.billingScript || '';
  }

  return result.billingScript_fil || result.billingScript || '';
}

function getDependentWarnings(relationship, patientAge, lang) {
  const age = patientAge === '' ? null : Number(patientAge);
  const messages = [];
  const parentRule = dependentRules.eligible_dependents.find((rule) => rule.type === 'PARENT');
  const disabledParentRule = dependentRules.eligible_dependents.find(
    (rule) => rule.type === 'PARENT_DISABLED',
  );
  const disabledChildRule = dependentRules.eligible_dependents.find(
    (rule) => rule.type === 'CHILD_DISABLED',
  );

  if (relationship === 'PARENT' && parentRule) {
    messages.push({
      id: 'parent',
      body:
        age !== null && age < 60 && disabledParentRule
          ? lang === 'en'
            ? 'Parent below 60 usually needs their own membership unless the permanent-disability exception applies.'
            : 'Kung mas bata sa 60 ang magulang, karaniwan ay kailangan niya ng sariling membership maliban kung pasok siya sa permanent-disability exception.'
          : lang === 'en'
            ? 'Parent age 60+ may already have Senior Citizen PhilHealth, so that membership may need to be used instead.'
            : 'Kung 60+ ang magulang, maaaring may sarili na siyang Senior Citizen PhilHealth at iyon ang kailangang gamitin.',
    });
  }

  if (relationship === 'CHILD' && age !== null && age >= 21 && disabledChildRule) {
    messages.push({
      id: 'child-disabled',
      body:
        lang === 'en'
          ? 'Child age 21+ usually needs their own membership unless a permanent disability removes the age limit.'
          : 'Kung 21 pataas na ang anak, karaniwan ay kailangan niya ng sariling membership maliban kung may permanent disability na nag-aalis ng age limit.',
    });
  }

  if (relationship === 'SIBLING') {
    messages.push({
      id: 'sibling',
      body:
        lang === 'en'
          ? 'Siblings are not covered as PhilHealth dependents. Coverage must come from their own membership or another eligible member relationship.'
          : 'Hindi covered ang kapatid bilang PhilHealth dependent. Kailangan manggaling ang coverage sa sarili niyang membership o sa ibang eligible na member relationship.',
    });
  }

  if (relationship === 'OTHER') {
    messages.push({
      id: 'other',
      body:
        lang === 'en'
          ? 'Only specific relationships qualify as PhilHealth dependents: spouse, qualified child, disabled child, foster child, or parent aged 60+ with no own coverage.'
          : 'Tanging ilang relasyon lang ang puwedeng dependent sa PhilHealth: asawa, qualified na anak, anak na may kapansanan, foster child, o magulang na 60+ na walang sariling coverage.',
    });
  }

  return messages;
}

function getDependentChecklist(relationship, patientAge, lang, t) {
  if (relationship === 'SELF') {
    return [];
  }

  const age = patientAge === '' ? null : Number(patientAge);
  const items = [t('intake_dependent_mdr_short')];

  if (relationship === 'CHILD' && age !== null && age >= 21) {
    items.unshift(
      lang === 'en'
        ? 'Confirm whether permanent disability applies before using dependent coverage.'
        : 'I-confirm muna kung may permanent disability exception bago gamitin ang dependent coverage.',
    );
  }

  if (relationship === 'PARENT' && age !== null && age < 60) {
    items.unshift(
      lang === 'en'
        ? 'Below 60 usually means own membership is needed unless the disability exception applies.'
        : 'Kung mas bata sa 60, karaniwan ay sariling membership ang kailangan maliban kung pasok sa disability exception.',
    );
  }

  if (relationship === 'PARENT' && age !== null && age >= 60) {
    items.unshift(
      lang === 'en'
        ? 'Check first if the parent should use their own Senior Citizen membership.'
        : 'I-check muna kung dapat sariling Senior Citizen membership ng magulang ang gamitin.',
    );
  }

  return items;
}

function getFamilyCoverageGuidance(relationship, patientAge, lang, t) {
  const age = patientAge === '' ? null : Number(patientAge);
  const messages = [];

  if (relationship === 'SELF' && age !== null && age < 21) {
    messages.push(
      t('intake_family_minor_self_note'),
    );
  }

  if (relationship === 'SPOUSE') {
    messages.push(t('intake_family_spouse_note'));
  }

  if (relationship === 'CHILD') {
    messages.push(
      age !== null && age >= 21
        ? t('intake_family_child_overage_note')
        : t('intake_family_child_note'),
    );
  }

  if (relationship === 'PARENT') {
    messages.push(
      age !== null && age < 60
        ? t('intake_family_parent_under60_note')
        : t('intake_family_parent_senior_note'),
    );
  }

  return messages;
}

function getMembershipQuestionContent(relationship, patientAge, lang, t) {
  const age = patientAge === '' ? null : Number(patientAge);
  const shouldUsePrincipalMemberFraming =
    relationship !== 'SELF' || (age !== null && age < 21);

  return {
    title: shouldUsePrincipalMemberFraming
      ? t('intake_membership_title_principal')
      : t('intake_membership_title'),
    note: shouldUsePrincipalMemberFraming
      ? t('intake_membership_note_principal')
      : t('intake_membership_note'),
    guidance: getFamilyCoverageGuidance(relationship, patientAge, lang, t),
  };
}

function supportsPostResultHospitalComparison(scenario) {
  return (
    scenario === 'SCENARIO_DOCTOR_ADMITTED' ||
    scenario === 'SCENARIO_SYMPTOMS_UNKNOWN' ||
    scenario === 'SCENARIO_PLANNING'
  );
}

function buildAfterDischargeResult(outcome, lang, t) {
  const isEn = lang === 'en';
  const reimbursementItems = [
    {
      key: 'prepare',
      title: t('claim_denial_reimbursement_title'),
      body: t('claim_denial_reimbursement_step_prepare'),
    },
    {
      key: 'deadline',
      title: t('claim_denial_deadline_label'),
      body: t('claim_denial_reimbursement_step_deadline'),
    },
    {
      key: 'followup',
      title: t('claim_denial_follow_up_label'),
      body: t('claim_denial_reimbursement_step_followup'),
    },
  ];
  const waitingTimeline = [
    {
      key: 'processing',
      title: t('claim_denial_waiting_timeline_title'),
      body: t('claim_denial_waiting_step_processing'),
    },
    {
      key: 'followup',
      title: t('claim_denial_follow_up_label'),
      body: t('claim_denial_waiting_step_followup'),
    },
    {
      key: 'copies',
      title: t('claim_denial_keep_copies_label'),
      body: t('claim_denial_waiting_step_keep'),
    },
  ];

  if (outcome === 'DENIED') {
    return {
      scenario: 'SCENARIO_AFTER_DISCHARGE',
      mode: 'after_discharge',
      claimOutcome: outcome,
      headerKey: 'intake_result_header_after_discharge_denied',
      conditionName: '',
      coverage: null,
      zbbStatus: null,
      likelyConditions: [],
      actionSteps: t('claim_denial_denied_next_steps'),
      billingScript: '',
      redFlags: [],
      aiStatus: 'local',
      topDenialReasons: claimDenial.topDenialReasons,
      appealsProcess: claimDenial.appealsProcess,
      reprocessing2025: claimDenial.reprocessing2025,
    };
  }

  if (outcome === 'WAITING') {
    return {
      scenario: 'SCENARIO_AFTER_DISCHARGE',
      mode: 'after_discharge',
      claimOutcome: outcome,
      headerKey: 'intake_result_header_after_discharge_waiting',
      conditionName: '',
      coverage: null,
      zbbStatus: null,
      likelyConditions: [],
      actionSteps: t('claim_denial_waiting_summary'),
      billingScript: '',
      redFlags: [],
      aiStatus: 'local',
      waitingTimeline,
    };
  }

  return {
    scenario: 'SCENARIO_AFTER_DISCHARGE',
    mode: 'after_discharge',
    claimOutcome: 'NOT_FILED',
    headerKey: 'intake_result_header_after_discharge_not_filed',
    conditionName: '',
    coverage: null,
    zbbStatus: null,
    likelyConditions: [],
    actionSteps: t('claim_denial_reimbursement_summary'),
    billingScript: '',
    redFlags: [],
    aiStatus: 'local',
    reimbursementItems,
    reimbursementDeadline: isEn
      ? '60 days from discharge'
      : '60 araw mula sa discharge',
  };
}

export default function IntakeTab({ onTabChange, onOpenChat }) {
  const { lang, t } = useLanguage();
  const { searchState, setSearchState, clearSearch } = useSearch();
  const { showToast, ToastContainer } = useToast();

  const [answers, setAnswers] = useState(() => buildInitialAnswers(searchState));
  const [entryMode, setEntryMode] = useState('scenario');
  const [currentStep, setCurrentStep] = useState(0);
  const [urgencyCheck, setUrgencyCheck] = useState({
    symptom: '',
    duration: '',
    markerKeys: [],
  });
  const [conditionQuery, setConditionQuery] = useState('');
  const [identifiedConditions, setIdentifiedConditions] = useState(
    () => searchState.intakeResult?.likelyConditions ?? [],
  );
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [intakeError, setIntakeError] = useState('');
  const [copyState, setCopyState] = useState(false);
  const [view, setView] = useState(searchState.intakeResult ? 'result' : 'questions');
  const [resultView, setResultView] = useState(searchState.intakeResult ?? null);
  const [actualBillInput, setActualBillInput] = useState('');
  const [finderCity, setFinderCity] = useState('');
  const [compareHospitalQuery, setCompareHospitalQuery] = useState('');
  const [compareHospitalIds, setCompareHospitalIds] = useState([]);
  const [isSavedCurrent, setIsSavedCurrent] = useState(false);
  const [detailConditionId, setDetailConditionId] = useState(null);
  const [selectedDenialReasonIndex, setSelectedDenialReasonIndex] = useState(() =>
    searchState.intakeResult?.claimOutcome === 'DENIED' ? 0 : null,
  );

  const debouncedConditionQuery = useDebounce(conditionQuery, 300);
  const debouncedHospitalName = useDebounce(answers.hospitalName, 250);
  const debouncedHospitalCity = useDebounce(answers.hospitalCity, 250);
  const selectedCondition = answers.conditionId ? getConditionById(answers.conditionId) : null;
  const variantConfig = selectedCondition ? getCoverageVariantPrompt(selectedCondition.id) : null;
  const selectedVariantOption = variantConfig?.options?.find(
    (option) => option.key === answers.coverageVariantKey,
  );
  const detailCondition = detailConditionId ? getConditionById(detailConditionId) : null;
  const detail = detailConditionId ? getConditionDetail(detailConditionId) : null;
  const detailBenefit = detailConditionId ? getBenefitById(detailConditionId) : null;
  const detailPackageType = detailBenefit?.packageType ?? '';
  const detailUsesVisitPatternStats =
    detailPackageType === 'outpatient_package' || detailPackageType === 'hemodialysis';
  const detailShowsEstimateNote = Boolean(detail && detailBenefit && !detailUsesVisitPatternStats);
  const urgencyResult = useMemo(
    () => evaluateUrgencyTriage(urgencyCheck),
    [urgencyCheck],
  );
  const conditionSearchResults =
    debouncedConditionQuery.trim().length >= 2
      ? searchConditions(debouncedConditionQuery, lang)
      : [];

  const bodySystems = useMemo(() => {
    const grouped = getConditionsBySystem('en');

    return Object.entries(grouped).map(([systemKey, systemConditions]) => ({
      key: systemKey,
      label: lang === 'en' ? systemKey : systemConditions[0]?.bodySystem_fil ?? systemKey,
    }));
  }, [lang]);
  const dependentWarnings = useMemo(
    () => getDependentWarnings(answers.patientRelationship, answers.patientAge, lang),
    [answers.patientRelationship, answers.patientAge, lang],
  );
  const dependentChecklist = useMemo(
    () => getDependentChecklist(answers.patientRelationship, answers.patientAge, lang, t),
    [answers.patientRelationship, answers.patientAge, lang, t],
  );
  const familyCoverageGuidance = useMemo(
    () => getFamilyCoverageGuidance(answers.patientRelationship, answers.patientAge, lang, t),
    [answers.patientRelationship, answers.patientAge, lang, t],
  );
  const membershipQuestionContent = useMemo(
    () => getMembershipQuestionContent(answers.patientRelationship, answers.patientAge, lang, t),
    [answers.patientRelationship, answers.patientAge, lang, t],
  );
  const hasValidPatientAge = answers.patientAge !== '' && Number.isFinite(Number(answers.patientAge)) && Number(answers.patientAge) >= 0;
  const hasCoverageDetailStep = Boolean(variantConfig);
  const membershipStep = hasCoverageDetailStep ? 4 : 3;
  const hospitalStep = hasCoverageDetailStep ? 5 : 4;
  const physicianStep = hasCoverageDetailStep ? 6 : 5;
  const confirmationStep = hasCoverageDetailStep ? 7 : 6;
  const questionTotal =
    answers.scenario === 'SCENARIO_AFTER_DISCHARGE'
      ? 2
      : hasCoverageDetailStep
        ? TOTAL_QUESTIONS_WITH_VARIANT
        : TOTAL_QUESTIONS;
  const cityOptions = useMemo(() => getCities(), []);
  const provinceOptions = useMemo(() => getProvinces(), []);
  const intakeCityOptions = useMemo(
    () => (answers.hospitalProvince ? getCitiesByProvince(answers.hospitalProvince) : cityOptions),
    [answers.hospitalProvince, cityOptions],
  );
  const citySuggestions = useMemo(() => {
    const query = normalizePlaceValue(debouncedHospitalCity);
    if (query.length < 2) {
      return [];
    }

    return intakeCityOptions
      .filter((city) => normalizePlaceValue(city).includes(query))
      .slice(0, 8);
  }, [intakeCityOptions, debouncedHospitalCity]);
  const finderCitySuggestions = useMemo(() => {
    const query = normalizePlaceValue(finderCity);
    if (query.length < 2) {
      return [];
    }

    return cityOptions
      .filter((city) => normalizePlaceValue(city).includes(query))
      .slice(0, 8);
  }, [cityOptions, finderCity]);
  const hospitalSuggestions = useMemo(() => {
    if (debouncedHospitalName.trim().length < 2) {
      return [];
    }

    const query = normalizePlaceValue(debouncedHospitalName);

    if (answers.hospitalCity.trim()) {
      const cityMatches = getHospitalsByCity(answers.hospitalCity).filter((hospital) => {
        const matchesProvince =
          !answers.hospitalProvince.trim() ||
          normalizePlaceValue(hospital.province) === normalizePlaceValue(answers.hospitalProvince);
        return (
          matchesProvince &&
          (
            normalizePlaceValue(hospital.name).includes(query) ||
            normalizePlaceValue(hospital.shortName).includes(query) ||
            hospital.searchTerms.some((term) => normalizePlaceValue(term).includes(query))
          )
        );
      });

      return cityMatches.slice(0, 8);
    }

    return searchHospitals(debouncedHospitalName).filter(
      (hospital) =>
        !answers.hospitalProvince.trim() ||
        normalizePlaceValue(hospital.province) === normalizePlaceValue(answers.hospitalProvince),
    );
  }, [answers.hospitalCity, answers.hospitalProvince, debouncedHospitalName]);
  const nearbyFacilityGroups = useMemo(() => {
    const selectedCity = answers.hospitalCity.trim();
    const selectedProvince = answers.hospitalProvince.trim();

    if (!selectedCity && !selectedProvince) {
      return [];
    }

    return [1, 2, 3]
      .map((level) => {
        const cityMatches = selectedCity
          ? getHospitalsByCity(selectedCity, level).filter(
              (hospital) =>
                normalizePlaceValue(hospital.city) === normalizePlaceValue(selectedCity) &&
                (!selectedProvince ||
                  normalizePlaceValue(hospital.province) === normalizePlaceValue(selectedProvince)),
            )
          : [];
        const provinceMatches =
          !cityMatches.length && selectedProvince
            ? getHospitalsByProvince(selectedProvince, level).slice(0, 4)
            : [];
        const facilities = (cityMatches.length ? cityMatches : provinceMatches).slice(0, 4);

        if (!facilities.length) {
          return null;
        }

        return {
          level,
          scope: cityMatches.length ? 'city' : 'province',
          facilities,
        };
      })
      .filter(Boolean);
  }, [answers.hospitalCity, answers.hospitalProvince]);
  const compareHospitalCandidates = useMemo(() => {
    const levelNumber = answers.hospitalLevel ? getHospitalLevelNumber(answers.hospitalLevel) : null;

    if (answers.hospitalCity.trim()) {
      const exactMatches = getHospitalsByCity(answers.hospitalCity, levelNumber).filter(
        (hospital) => normalizePlaceValue(hospital.city) === normalizePlaceValue(answers.hospitalCity),
      );

      if (exactMatches.length) {
        return exactMatches.slice(0, 6);
      }

      return getHospitalsByProvince(answers.hospitalCity, levelNumber).slice(0, 6);
    }

    if (answers.hospitalName.trim().length >= 2) {
      return hospitalSuggestions.slice(0, 6);
    }

    return [];
  }, [answers.hospitalCity, answers.hospitalLevel, answers.hospitalName, hospitalSuggestions]);
  const hasDraft =
    currentStep > 0 ||
    Boolean(answers.scenario) ||
    Boolean(answers.claimOutcome) ||
    Boolean(answers.patientAge) ||
    answers.patientRelationship !== 'SELF' ||
    Boolean(answers.conditionId) ||
    Boolean(answers.symptomDescription.trim()) ||
    Boolean(answers.hospitalLevel) ||
    Boolean(answers.hospitalType) ||
    Boolean(answers.roomType) ||
    Boolean(answers.hospitalName.trim()) ||
    Boolean(answers.coverageVariantKey) ||
    Boolean(resultView);

  useEffect(() => {
    if (!copyState) {
      return undefined;
    }

    const timer = window.setTimeout(() => setCopyState(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  useEffect(() => {
    setActualBillInput('');
  }, [resultView?.coverage?.conditionId, resultView?.coverage?.amount]);

  useEffect(() => {
    setCompareHospitalIds([]);
    setCompareHospitalQuery('');
  }, [finderCity, resultView?.coverage?.conditionId, answers.hospitalLevel]);

  useEffect(() => {
    if (view !== 'result' || !supportsPostResultHospitalComparison(answers.scenario)) {
      return;
    }

    const selectedHospital = answers.hospitalId ? getHospitalById(answers.hospitalId) : null;
    const defaultCity = selectedHospital?.city || answers.hospitalCity.trim();

    if (defaultCity && !finderCity.trim()) {
      setFinderCity(defaultCity);
    }
  }, [
    view,
    answers.scenario,
    answers.hospitalId,
    answers.hospitalCity,
    finderCity,
  ]);

  useEffect(() => {
    if (!resultView?.coverage) {
      setIsSavedCurrent(false);
      return;
    }

    try {
      const savedItems = JSON.parse(localStorage.getItem(SAVED_RESULTS_KEY) || '[]');
      const alreadySaved = savedItems.some(
        (item) =>
          item.conditionId === resultView.coverage.conditionId &&
          item.memberType === answers.memberType &&
          item.hospitalLevel === answers.hospitalLevel,
      );
      setIsSavedCurrent(alreadySaved);
    } catch {
      setIsSavedCurrent(false);
    }
  }, [resultView?.coverage?.conditionId, answers.memberType, answers.hospitalLevel]);

  useEffect(() => {
    if (resultView?.claimOutcome === 'DENIED') {
      setSelectedDenialReasonIndex(0);
      return;
    }

    setSelectedDenialReasonIndex(null);
  }, [resultView]);

  useEffect(() => {
    if (view !== 'result' || resultView?.mode !== 'after_discharge' || !answers.claimOutcome) {
      return;
    }

    const nextResult = buildAfterDischargeResult(answers.claimOutcome, lang, t);
    const context = buildScenarioContext(answers, null, []);
    persistResult(answers, nextResult, context, null);
    setResultView(nextResult);
  }, [answers.claimOutcome, lang, t, view, resultView?.mode]);

  useEffect(() => {
    if (!selectedCondition) {
      if (answers.coverageVariantKey) {
        updateAnswers({ coverageVariantKey: '' });
      }
      return;
    }

    const nextConfig = getCoverageVariantPrompt(selectedCondition.id);
    if (!nextConfig) {
      if (answers.coverageVariantKey) {
        updateAnswers({ coverageVariantKey: '' });
      }
      return;
    }

    const isValid = nextConfig.options.some((option) => option.key === answers.coverageVariantKey);
    if (!isValid) {
      updateAnswers({
        coverageVariantKey: nextConfig.defaultKey || nextConfig.options[0]?.key || '',
      });
    }
  }, [selectedCondition?.id]);

  function updateAnswers(patch) {
    setAnswers((current) => ({ ...current, ...patch }));
  }

  function handleReset() {
    clearSearch();
    setAnswers(buildInitialAnswers({}));
    setCurrentStep(0);
    setEntryMode('scenario');
    setUrgencyCheck({
      symptom: '',
      duration: '',
      markerKeys: [],
    });
    setConditionQuery('');
    setIdentifiedConditions([]);
    setIsIdentifying(false);
    setIsGenerating(false);
    setIntakeError('');
    setCopyState(false);
    setView('questions');
    setResultView(null);
    setSelectedDenialReasonIndex(null);
    setActualBillInput('');
  }

  function buildScenarioContext(baseAnswers, coverage, likelyConditions) {
    const resolvedCondition = coverage
      ? getConditionById(coverage.conditionId)
      : getConditionById(baseAnswers.conditionId);
    const conditionName = resolvedCondition
      ? lang === 'en'
        ? resolvedCondition.name_en
        : resolvedCondition.name_fil
      : '';

    return {
      scenario: baseAnswers.scenario,
      claimOutcome: baseAnswers.claimOutcome ?? '',
      conditionId: coverage?.conditionId ?? baseAnswers.conditionId ?? '',
      conditionName,
      conditionName_fil: resolvedCondition?.name_fil ?? '',
      conditionName_en: resolvedCondition?.name_en ?? '',
      memberType: baseAnswers.memberType,
      hospitalLevel: baseAnswers.hospitalLevel,
      hospitalType: baseAnswers.hospitalType,
      roomType: baseAnswers.roomType,
      hospitalId: baseAnswers.hospitalId,
      hospitalName: baseAnswers.hospitalName.trim(),
      hospitalCity: baseAnswers.hospitalCity.trim(),
      hospitalProvince: baseAnswers.hospitalProvince.trim(),
      coverageVariantKey: baseAnswers.coverageVariantKey || '',
      variantUsed:
        coverage
          ? lang === 'en'
            ? coverage.variantUsed_en
            : coverage.variantUsed_fil
          : '',
      variantUsed_en: coverage?.variantUsed_en ?? '',
      variantUsed_fil: coverage?.variantUsed_fil ?? '',
      patientAge: baseAnswers.patientAge === '' ? null : Number(baseAnswers.patientAge),
      patientRelationship: baseAnswers.patientRelationship,
      symptomDescription: baseAnswers.symptomDescription.trim(),
      coverageAmount: coverage?.amount ?? null,
      directFiling: coverage?.directFiling ?? null,
      circular: coverage?.circular ?? '',
      likelyConditions,
    };
  }

  function buildLocalizedScenarioContext(context, targetLang) {
    return {
      ...context,
      conditionName:
        targetLang === 'en'
          ? context.conditionName_en || context.conditionName || ''
          : context.conditionName_fil || context.conditionName || '',
      variantUsed:
        targetLang === 'en'
          ? context.variantUsed_en || context.variantUsed || ''
          : context.variantUsed_fil || context.variantUsed || '',
    };
  }

  function persistResult(nextAnswers, nextResult, context, coverage) {
    const condition = coverage ? getConditionById(coverage.conditionId) : getConditionById(nextAnswers.conditionId);

    setSearchState((current) => ({
      ...current,
      conditionId: coverage?.conditionId ?? nextAnswers.conditionId ?? null,
      conditionName_fil: coverage?.conditionName_fil ?? condition?.name_fil ?? null,
      conditionName_en: coverage?.conditionName_en ?? condition?.name_en ?? null,
      memberType: nextAnswers.memberType || null,
      hospitalLevel: nextAnswers.hospitalLevel || null,
      hospitalType: nextAnswers.hospitalType || null,
      roomType: nextAnswers.roomType || null,
      hospitalId: nextAnswers.hospitalId || null,
      hospitalName: nextAnswers.hospitalName.trim() || null,
      hospitalCity: nextAnswers.hospitalCity.trim() || null,
      hospitalProvince: nextAnswers.hospitalProvince.trim() || null,
      coverageVariantKey: nextAnswers.coverageVariantKey || null,
      resultSource: 'intake',
      result: coverage ?? null,
      intakeContext: context,
      intakeResult: nextResult,
    }));
  }

  async function handleIdentifyCondition() {
    if (!answers.symptomDescription.trim()) {
      return;
    }

    setIsIdentifying(true);
    setIntakeError('');

    try {
      const matches = await identifyConditionFromSymptoms(answers.symptomDescription, lang);

      startTransition(() => {
        setIdentifiedConditions(buildLikelyConditions(matches, answers));
      });

      if (!matches.length) {
        setIntakeError(t('intake_no_match'));
      }
    } finally {
      setIsIdentifying(false);
    }
  }

  function handleConditionSelect(conditionId) {
    const nextVariantConfig = getCoverageVariantPrompt(conditionId);
    updateAnswers({
      conditionId,
      conditionMode: 'diagnosis',
      coverageVariantKey: nextVariantConfig?.defaultKey || nextVariantConfig?.options?.[0]?.key || '',
    });
    setCurrentStep(3);
    setIntakeError('');
  }

  function handleConditionDetailOpen(conditionId) {
    setDetailConditionId(conditionId);
  }

  function handleConditionDetailClose() {
    setDetailConditionId(null);
  }

  function handleConditionDetailSelect() {
    if (!detailCondition) {
      return;
    }

    handleConditionSelect(detailCondition.id);
    handleConditionDetailClose();
  }

  async function handleGenerate(overrides = {}, options = {}) {
    setIsGenerating(true);
    const nextAnswers = { ...answers, ...overrides };
    const selectedId =
      nextAnswers.conditionId ||
      identifiedConditions[0]?.conditionId ||
      (options.fastEmergency ? searchState.conditionId : '') ||
      '';
    try {
      const coverage =
        selectedId && nextAnswers.memberType && nextAnswers.hospitalLevel
          ? getCoverage(selectedId, nextAnswers.memberType, nextAnswers.hospitalLevel, {
              variantKey: nextAnswers.coverageVariantKey || undefined,
            })
          : options.fastEmergency
            ? searchState.result
            : null;

      const likelyConditions = buildLikelyConditions(identifiedConditions, nextAnswers);
      const scenarioContext = buildScenarioContext(
        { ...nextAnswers, conditionId: selectedId },
        coverage,
        likelyConditions,
      );
      const guidanceEnFallback = buildFallbackGuidance(
        nextAnswers.scenario,
        'en',
        buildLocalizedScenarioContext(scenarioContext, 'en'),
        coverage,
      );
      const guidanceFilFallback = buildFallbackGuidance(
        nextAnswers.scenario,
        'fil',
        buildLocalizedScenarioContext(scenarioContext, 'fil'),
        coverage,
      );
      let guidanceEn = guidanceEnFallback;
      let guidanceFil = guidanceFilFallback;
      let guidance = lang === 'en' ? guidanceEn : guidanceFil;
      let aiStatus = 'fallback';

      if (!options.fastEmergency) {
        const aiResponse = await askGroq(buildGuidancePrompt(lang, scenarioContext), scenarioContext);
        if (aiResponse.message) {
          if (lang === 'en') {
            guidanceEn = aiResponse.message;
          } else {
            guidanceFil = aiResponse.message;
          }
          guidance = aiResponse.message;
          aiStatus = 'groq';
        } else if (aiResponse.error) {
          aiStatus = aiResponse.error;
        }
      }

      const condition = coverage ? getConditionById(coverage.conditionId) : getConditionById(selectedId);
      const conditionNameEn = condition?.name_en ?? '';
      const conditionNameFil = condition?.name_fil ?? '';
      const billingScriptEn = coverage?.billingScript_en?.trim()
        ? coverage.billingScript_en
        : buildEmergencyScript('en', conditionNameEn);
      const billingScriptFil = coverage?.billingScript_fil?.trim()
        ? coverage.billingScript_fil
        : buildEmergencyScript('fil', conditionNameFil);
      const billingScript = lang === 'en' ? billingScriptEn : billingScriptFil;

      const nextResult = {
        scenario: nextAnswers.scenario,
        mode: nextAnswers.scenario === 'SCENARIO_AT_BILLING_COUNTER' ? 'emergency' : 'standard',
        headerKey: `intake_result_header_${nextAnswers.scenario}`,
        conditionName: lang === 'en' ? conditionNameEn : conditionNameFil,
        conditionName_en: conditionNameEn,
        conditionName_fil: conditionNameFil,
        coverage,
        zbbStatus:
          nextAnswers.memberType && nextAnswers.hospitalType && nextAnswers.roomType
            ? getZBBStatus(nextAnswers.memberType, nextAnswers.hospitalType, nextAnswers.roomType)
            : null,
        likelyConditions,
        actionSteps: guidance,
        actionSteps_en: guidanceEn,
        actionSteps_fil: guidanceFil,
        billingScript,
        billingScript_en: billingScriptEn,
        billingScript_fil: billingScriptFil,
        redFlags: coverage?.redFlags ?? [],
        aiStatus,
      };

      persistResult(nextAnswers, nextResult, scenarioContext, coverage);

      startTransition(() => {
        setAnswers((current) => ({ ...current, ...nextAnswers, conditionId: selectedId }));
        setResultView(nextResult);
        setView('result');
      });
    } finally {
      setIsGenerating(false);
    }
  }

  function handleScenarioSelect(scenarioCode) {
    updateAnswers({ scenario: scenarioCode, claimOutcome: '' });
    setIntakeError('');

    if (scenarioCode === 'SCENARIO_AT_BILLING_COUNTER') {
      void handleGenerate({ scenario: scenarioCode }, { fastEmergency: true });
      return;
    }

    setCurrentStep(1);
  }

  function handleClaimOutcomeSelect(claimOutcome) {
    const nextAnswers = { ...answers, claimOutcome };
    const nextResult = buildAfterDischargeResult(claimOutcome, lang, t);
    const context = buildScenarioContext(nextAnswers, null, []);

    persistResult(nextAnswers, nextResult, context, null);
    setAnswers((current) => ({ ...current, claimOutcome }));
    setResultView(nextResult);
    setView('result');
  }

  async function handleCopyScript() {
    const billingScript =
      getLocalizedBillingScript(resultView, lang).trim() ||
      buildEmergencyScript(lang, getLocalizedConditionName(resultView, lang));

    if (!billingScript) {
      return;
    }

    try {
      await copyText(billingScript);
      setCopyState(true);
    } catch {
      showToast(t('copy_failed'), 'warning');
    }
  }

  async function handleShareResult() {
    if (!resultView) {
      return;
    }

    const shareText = buildShareText(lang, resultView, answers, t);

    try {
      if (navigator.share) {
        await navigator.share({ text: shareText });
        return;
      }

      await copyText(shareText);
      showToast(t('share_fallback'), 'primary');
    } catch (error) {
      if (error?.name === 'AbortError') {
        return;
      }

      try {
        await copyText(shareText);
        showToast(t('share_fallback'), 'primary');
      } catch {
        showToast(t('copy_failed'), 'warning');
      }
    }
  }

  function handleSaveResult() {
    if (!resultView?.coverage) {
      return;
    }

    saveResultToStorage({
      id: `${resultView.coverage.conditionId}-${answers.memberType}-${answers.hospitalLevel}-${Date.now()}`,
      conditionId: resultView.coverage.conditionId,
      conditionName_fil: resultView.coverage.conditionName_fil,
      conditionName_en: resultView.coverage.conditionName_en,
      coverageVariantKey: answers.coverageVariantKey || null,
      variantUsed_fil: resultView.coverage.variantUsed_fil ?? '',
      variantUsed_en: resultView.coverage.variantUsed_en ?? '',
      memberType: answers.memberType,
      hospitalLevel: answers.hospitalLevel,
      amount: resultView.coverage.amount,
      directFiling: resultView.coverage.directFiling,
      circular: resultView.coverage.circular,
      savedAt: new Date().toISOString(),
      note: '',
    });

    setIsSavedCurrent(true);
    showToast(t('saved_toast'), 'success');
  }

  function handleLikelyConditionConfirm(candidate) {
    const nextVariantConfig = getCoverageVariantPrompt(candidate.conditionId);
    const nextVariantKey =
      candidate.conditionId === answers.conditionId
        ? answers.coverageVariantKey
        : nextVariantConfig?.defaultKey || nextVariantConfig?.options?.[0]?.key || '';
    const coverage =
      answers.memberType && answers.hospitalLevel
        ? getCoverage(candidate.conditionId, answers.memberType, answers.hospitalLevel, {
            variantKey: nextVariantKey || undefined,
          })
        : null;

    if (!coverage || !resultView) {
      return;
    }

    const nextAnswers = {
      ...answers,
      conditionId: candidate.conditionId,
      coverageVariantKey: nextVariantKey,
    };
    const updatedResult = {
      ...resultView,
      coverage,
      redFlags: coverage.redFlags,
    };
    const condition = getConditionById(candidate.conditionId);
    const context = buildScenarioContext(nextAnswers, coverage, resultView.likelyConditions ?? []);
    const actionStepsEn = buildFallbackGuidance(
      answers.scenario,
      'en',
      buildLocalizedScenarioContext(context, 'en'),
      coverage,
    );
    const actionStepsFil = buildFallbackGuidance(
      answers.scenario,
      'fil',
      buildLocalizedScenarioContext(context, 'fil'),
      coverage,
    );
    const billingScriptEn = coverage.billingScript_en?.trim()
      ? coverage.billingScript_en
      : buildEmergencyScript('en', coverage.conditionName_en || condition?.name_en || '');
    const billingScriptFil = coverage.billingScript_fil?.trim()
      ? coverage.billingScript_fil
      : buildEmergencyScript('fil', coverage.conditionName_fil || condition?.name_fil || '');
    Object.assign(updatedResult, {
      conditionName: lang === 'en' ? coverage.conditionName_en : coverage.conditionName_fil,
      conditionName_en: coverage.conditionName_en || condition?.name_en || '',
      conditionName_fil: coverage.conditionName_fil || condition?.name_fil || '',
      actionSteps: lang === 'en' ? actionStepsEn : actionStepsFil,
      actionSteps_en: actionStepsEn,
      actionSteps_fil: actionStepsFil,
      billingScript: lang === 'en' ? billingScriptEn : billingScriptFil,
      billingScript_en: billingScriptEn,
      billingScript_fil: billingScriptFil,
    });

    persistResult(
      nextAnswers,
      updatedResult,
      context,
      coverage,
    );
    setAnswers((current) => ({ ...current, ...nextAnswers }));
    setResultView(updatedResult);
  }

  const summaryItems = [
    answers.scenario
      ? {
          step: 0,
          label: t('intake_summary_scenario'),
          value: t(SCENARIOS.find((scenario) => scenario.code === answers.scenario)?.labelKey),
        }
      : null,
    answers.patientAge !== '' || answers.patientRelationship !== 'SELF'
      ? {
          step: 1,
          label: t('intake_summary_patient'),
          value:
            answers.patientAge !== ''
              ? t('intake_patient_summary', {
                  age: answers.patientAge,
                  relationship: t(
                    RELATIONSHIPS.find((relationship) => relationship.code === answers.patientRelationship)?.labelKey,
                  ),
                })
              : t(
                  RELATIONSHIPS.find((relationship) => relationship.code === answers.patientRelationship)?.labelKey,
                ),
        }
      : null,
    answers.claimOutcome
      ? {
          step: 1,
          label: t('intake_summary_claim'),
          value: t(
            CLAIM_OUTCOMES.find((outcome) => outcome.code === answers.claimOutcome)?.labelKey,
          ),
        }
      : null,
    answers.conditionId || answers.symptomDescription
      ? {
          step: 2,
          label: t('intake_summary_condition'),
          value: answers.conditionId
            ? [
                lang === 'en'
                  ? getConditionById(answers.conditionId)?.name_en
                  : getConditionById(answers.conditionId)?.name_fil,
                selectedVariantOption
                  ? lang === 'en'
                    ? selectedVariantOption.label_en
                    : selectedVariantOption.label_fil
                  : '',
              ]
                .filter(Boolean)
                .join(' • ')
            : answers.symptomDescription,
        }
      : null,
    answers.memberType && currentStep > 3
      ? {
          step: membershipStep,
          label: t('intake_summary_membership'),
          value: getMembershipLabel(answers.memberType, lang),
        }
      : null,
    answers.hospitalLevel
      ? {
          step: hospitalStep,
          label: t('intake_summary_hospital'),
          value: `${t('level_short', { level: getHospitalLevelNumber(answers.hospitalLevel) })}${answers.hospitalName ? ` • ${answers.hospitalName}` : ''}`,
        }
      : null,
  ].filter(Boolean);

  function goToPreviousQuestion() {
    setCurrentStep((step) => Math.max(0, step - 1));
  }

  function getUrgencyTriggerLabel(triggerKey) {
    if (triggerKey === 'duration_over_three_days' || triggerKey === 'no_danger_signs_selected') {
      return t(`urgency_trigger_${triggerKey}`);
    }

    return t(`urgency_marker_${triggerKey}`);
  }

  function buildUrgencySymptomSeed() {
    if (urgencyCheck.symptom.trim()) {
      return urgencyCheck.symptom.trim();
    }

    if (urgencyCheck.markerKeys.length) {
      return urgencyCheck.markerKeys.map((markerKey) => t(`urgency_marker_${markerKey}`)).join(', ');
    }

    return '';
  }

  function toggleUrgencyMarker(markerKey) {
    setUrgencyCheck((current) => ({
      ...current,
      markerKeys: current.markerKeys.includes(markerKey)
        ? current.markerKeys.filter((key) => key !== markerKey)
        : [...current.markerKeys, markerKey],
    }));
  }

  function handleUseUrgencyForIntake() {
    const symptomSeed = buildUrgencySymptomSeed();
    updateAnswers({
      scenario: 'SCENARIO_SYMPTOMS_UNKNOWN',
      claimOutcome: '',
      conditionMode: 'symptoms',
      symptomDescription: symptomSeed,
    });
    setIntakeError('');
    setEntryMode('scenario');
    setCurrentStep(1);
  }

  function renderQuestionHeader({ current, title, subtitle = '' }) {
    return (
      <div className="intake-question-header">
        <button
          type="button"
          className="summary-back"
          onClick={goToPreviousQuestion}
        >
          ← {t('back')}
        </button>
        <div>
          <div className="intake-progress">
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${(current / questionTotal) * 100}%` }} />
            </div>
            <span className="progress-label">{t('intake_progress', { current, total: questionTotal })}</span>
          </div>
          <h2 className="empty-state__title">{title}</h2>
          {subtitle ? <p className="muted-text">{subtitle}</p> : null}
        </div>
      </div>
    );
  }

  function renderScenarioQuestion() {
    if (entryMode === 'triage') {
      const urgencyVariant =
        urgencyResult?.level === 'red'
          ? 'danger'
          : urgencyResult?.level === 'yellow'
            ? 'warning'
            : 'success';

      return (
        <Card className="intake-question-card">
          <div className="tab-section">
            <button
              type="button"
              className="summary-back"
              onClick={() => setEntryMode('scenario')}
            >
              ← {t('urgency_back_to_intake')}
            </button>

            <div>
              <h2 className="empty-state__title">{t('urgency_title')}</h2>
              <p className="muted-text">{t('urgency_subtitle')}</p>
            </div>

            <label className="tab-section">
              <span className="sheet-list__title">{t('urgency_symptom_label')}</span>
              <textarea
                className="text-area"
                value={urgencyCheck.symptom}
                onChange={(event) =>
                  setUrgencyCheck((current) => ({ ...current, symptom: event.target.value }))
                }
                placeholder={t('urgency_symptom_placeholder')}
              />
              <span className="muted-text">{t('urgency_symptom_help')}</span>
            </label>

            <div className="tab-section">
              <span className="sheet-list__title">{t('urgency_symptom_examples')}</span>
              <div className="chips-row">
                {[
                  'urgency_symptom_example_fever',
                  'urgency_symptom_example_cough',
                  'urgency_symptom_example_vomiting',
                  'urgency_symptom_example_diarrhea',
                ].map((key) => {
                  const label = t(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      className="chip"
                      onClick={() =>
                        setUrgencyCheck((current) => ({
                          ...current,
                          symptom: current.symptom ? current.symptom : label,
                        }))
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="tab-section">
              <span className="sheet-list__title">{t('urgency_duration_label')}</span>
              <div className="chips-row">
                {URGENCY_DURATION_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className={`chip${urgencyCheck.duration === option.key ? ' chip--active' : ''}`}
                    onClick={() =>
                      setUrgencyCheck((current) => ({
                        ...current,
                        duration: current.duration === option.key ? '' : option.key,
                      }))
                    }
                  >
                    {t(`urgency_duration_${option.key}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="tab-section">
              <span className="sheet-list__title">{t('urgency_markers_label')}</span>
              <div className="select-grid urgency-marker-grid">
                {URGENCY_MARKERS.map((marker) => {
                  const isSelected = urgencyCheck.markerKeys.includes(marker.key);
                  return (
                    <button
                      key={marker.key}
                      type="button"
                      className={`select-card urgency-marker-card${isSelected ? ' select-card--selected' : ''}`}
                      onClick={() => toggleUrgencyMarker(marker.key)}
                    >
                      <span className="select-card__title">{t(`urgency_marker_${marker.key}`)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {urgencyResult ? (
              <Card variant={urgencyVariant} className="saved-card urgency-result-card">
                <strong>{t('urgency_result_title')}</strong>
                <p className="saved-card__title">{t(`urgency_result_${urgencyResult.level}_label`)}</p>
                <p>{t(urgencyResult.bodyKey)}</p>
                <p><strong>{t(urgencyResult.actionKey)}</strong></p>
                <div className="tab-section">
                  <span className="sheet-list__title">{t('urgency_triggered_by')}</span>
                  <div className="compact-guidance">
                    {urgencyResult.triggerKeys.map((triggerKey) => (
                      <div key={triggerKey} className="compact-guidance__item">
                        <span className="compact-guidance__dot" aria-hidden="true" />
                        <span>{getUrgencyTriggerLabel(triggerKey)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="muted-text">{t('urgency_source_note')}</p>
              </Card>
            ) : (
              <div className="notice notice--warning">
                {t('urgency_fill_prompt')}
              </div>
            )}

            <div className="actions-row actions-row--compact">
              <button
                type="button"
                className="button button--primary"
                onClick={handleUseUrgencyForIntake}
                disabled={!urgencyResult}
              >
                {t('urgency_use_for_intake')}
              </button>
            </div>
          </div>
        </Card>
      );
    }

    return (
      <Card className="intake-question-card">
        <div className="tab-section">
          <div>
            <div className="intake-progress">
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${(1 / questionTotal) * 100}%` }} />
              </div>
              <span className="progress-label">{t('intake_progress', { current: 1, total: questionTotal })}</span>
            </div>
            <h2 className="empty-state__title">{t('intake_scenario_title')}</h2>
            <p className="muted-text">{t('intake_scenario_subtitle')}</p>
          </div>

          <Card variant="primary" className="urgency-entry-card">
            <div className="urgency-entry-card__header">
              <span className="urgency-entry-card__icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18A2 2 0 0 0 3.53 21h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </span>
              <span className="tag">{t('urgency_entry_badge')}</span>
            </div>
            <div className="tab-section">
              <div>
                <strong>{t('urgency_entry_title')}</strong>
                <p className="muted-text">{t('urgency_entry_body')}</p>
              </div>
              <button
                type="button"
                className="button button--outline"
                onClick={() => setEntryMode('triage')}
              >
                {t('urgency_entry_cta')}
              </button>
            </div>
          </Card>

          <div className="intake-scenario-list">
            {SCENARIOS.map((scenario) => {
              const isEmergency = scenario.code === 'SCENARIO_AT_BILLING_COUNTER';
              const isSelected = answers.scenario === scenario.code;
              const cardClass = [
                'intake-scenario-card',
                isEmergency ? 'intake-scenario-card--emergency' : '',
                isSelected ? 'intake-scenario-card--selected' : '',
              ].filter(Boolean).join(' ');

              return (
                <button
                  key={scenario.code}
                  type="button"
                  className={cardClass}
                  onClick={() => handleScenarioSelect(scenario.code)}
                >
                  <div className="card-icon-wrap">
                    <span className="card-icon" aria-hidden="true">
                      {scenario.icon}
                    </span>
                  </div>
                  <span className="intake-scenario-card__copy">
                    <span className="card-title">{t(scenario.labelKey)}</span>
                    <span className="card-desc muted-text">{t(scenario.descKey)}</span>
                    {isEmergency ? (
                      <span className="intake-scenario-emergency-badge" aria-label="Fast mode">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2L4.5 13.5H11L10 22l9.5-12H13.5L13 2z"/></svg>
                        FAST MODE
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>
    );
  }

  function renderClaimStatusQuestion() {
    return (
      <Card className="intake-question-card">
        <div className="tab-section">
          {renderQuestionHeader({
            current: 2,
            title: t('intake_claim_title'),
            subtitle: t('intake_claim_subtitle'),
          })}

          <div className="select-grid">
            {CLAIM_OUTCOMES.map((outcome) => (
              <button
                key={outcome.code}
                type="button"
                className={`select-card${answers.claimOutcome === outcome.code ? ' select-card--selected' : ''}`}
                onClick={() => handleClaimOutcomeSelect(outcome.code)}
              >
                <span className="select-card__title">{t(outcome.labelKey)}</span>
                <span className="select-card__desc">{t(outcome.descKey)}</span>
              </button>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  function renderPatientQuestion() {
    const patientStepAlerts = [
      ...dependentWarnings.map((warning) => warning.body),
      ...dependentChecklist,
    ].filter((message, index, items) => items.indexOf(message) === index);

    return (
      <Card className="intake-question-card">
        <div className="tab-section">
          {renderQuestionHeader({
            current: 2,
            title: t('intake_patient_title'),
          })}

          <label className="tab-section">
            <span className="sheet-list__title">{t('intake_age_label')}</span>
            <input
              className="search-input"
              type="number"
              min="0"
              max="120"
              placeholder={t('intake_age_placeholder')}
              value={answers.patientAge}
              onChange={(event) => updateAnswers({ patientAge: event.target.value })}
            />
          </label>

          {!hasValidPatientAge ? (
            <div className="notice notice--warning">
              {t('intake_age_required')}
            </div>
          ) : null}

          <div className="relationship-grid">
            {RELATIONSHIPS.map((relationship) => {
              const isSelected = answers.patientRelationship === relationship.code;
              return (
                <button
                  key={relationship.code}
                  type="button"
                  className={`relationship-card${isSelected ? ' selected' : ''}`}
                  onClick={() => updateAnswers({ patientRelationship: relationship.code })}
                >
                  <div className="rel-icon">
                    {relationship.icon}
                  </div>
                  <div className="rel-text">
                    <div className="rel-title">{t(relationship.labelKey)}</div>
                    <div className="rel-desc">{lang === 'en' ? relationship.desc_en : relationship.desc_fil}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {patientStepAlerts.length ? (
            <div className="notice notice--warning">
              <div className="compact-guidance">
                {patientStepAlerts.map((message) => (
                  <div key={message} className="compact-guidance__item">
                    <span className="compact-guidance__dot" aria-hidden="true" />
                    <span>{message}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {answers.patientRelationship === 'SELF' && familyCoverageGuidance.length ? (
            <div className="info-card-advisory">
              <div className="info-card-header">
                <div className="info-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 8v4M12 16h.01"/>
                  </svg>
                </div>
                <h3 className="info-card-title">{t('intake_family_guidance_title')}</h3>
              </div>
              <div className="compact-guidance compact-guidance--muted">
                {familyCoverageGuidance.map((message) => (
                  <div key={message} className="compact-guidance__item">
                    <span className="compact-guidance__dot compact-guidance__dot--blue" aria-hidden="true" />
                    <span className="muted-text">{message}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <p className="muted-text">{t('intake_patient_note')}</p>

          <button
            type="button"
            className={`button button--primary${hasValidPatientAge ? '' : ' button--disabled'}`}
            disabled={!hasValidPatientAge}
            onClick={() => setCurrentStep(2)}
          >
            {t('intake_continue')}
          </button>
        </div>
      </Card>
    );
  }

  function renderConditionQuestion() {
    const diagnosisMode =
      answers.scenario === 'SCENARIO_DOCTOR_ADMITTED' ||
      answers.scenario === 'SCENARIO_ALREADY_ADMITTED' ||
      answers.scenario === 'SCENARIO_AFTER_DISCHARGE';
    // usingSymptoms: true unless user explicitly switched to manual search ('diagnosis' mode)
    // For non-diagnosisMode scenarios, 'diagnosis' still means manual search was chosen
    const usingSymptoms = answers.conditionMode === 'symptoms' || (answers.conditionMode !== 'diagnosis' && !diagnosisMode);

    return (
      <Card className="intake-question-card">
        <div className="tab-section">
          {renderQuestionHeader({
            current: 3,
            title: diagnosisMode ? t('intake_diagnosis_title') : t('intake_symptoms_title'),
          })}

          {diagnosisMode && !usingSymptoms ? (
            <>
              <div className="search-input-wrap">
                <span className="search-input__icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                </span>
                <input
                  className="search-input"
                  value={conditionQuery}
                  onChange={(event) => setConditionQuery(event.target.value)}
                  placeholder={t('search_placeholder')}
                />
              </div>
              <p className="muted-text">{t('smart_search_hint')}</p>

              {conditionSearchResults.length ? (
                <Card className="list-card">
                  {conditionSearchResults.map((condition) => (
                    <div key={condition.id} className="condition-row">
                      <button
                        type="button"
                        className="condition-row__main"
                        onClick={() => handleConditionSelect(condition.id)}
                      >
                        <span className="list-button__title">
                          {lang === 'en' ? condition.name_en : condition.name_fil}
                        </span>
                        <span className="list-button__meta">
                          <span className="tag">
                            {lang === 'en' ? condition.bodySystem_en : condition.bodySystem_fil}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="condition-row__info"
                        onClick={() => handleConditionDetailOpen(condition.id)}
                        aria-label={`${t('more_info')} ${lang === 'en' ? condition.name_en : condition.name_fil}`}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      </button>
                    </div>
                  ))}
                </Card>
              ) : debouncedConditionQuery.trim().length >= 2 ? (
                <div className="notice notice--warning">{t('smart_search_no_results')}</div>
              ) : null}

              <button
                type="button"
                className="intake-link-button"
                onClick={() => updateAnswers({ conditionMode: 'symptoms', conditionId: '' })}
              >
                {t('intake_unknown_diagnosis')}
              </button>
            </>
          ) : (
            <>
              <textarea
                className="text-area"
                value={answers.symptomDescription}
                onChange={(event) => updateAnswers({ symptomDescription: event.target.value, conditionId: '' })}
                placeholder={t('intake_symptoms_placeholder')}
              />

              <div className="chips-row">
                {bodySystems.map((system) => (
                  <button
                    key={system.key}
                    type="button"
                    className="chip"
                    onClick={() =>
                      updateAnswers({
                        symptomDescription: answers.symptomDescription.includes(system.label)
                          ? answers.symptomDescription
                          : `${answers.symptomDescription}${answers.symptomDescription ? ', ' : ''}${system.label}`,
                      })
                    }
                  >
                    {system.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className={`button button--primary${answers.symptomDescription.trim() ? '' : ' button--disabled'}`}
                disabled={!answers.symptomDescription.trim() || isIdentifying}
                onClick={handleIdentifyCondition}
              >
                {isIdentifying ? t('intake_finding_condition') : t('intake_find_condition')}
              </button>

              <button
                type="button"
                className="intake-link-button"
                onClick={() => updateAnswers({ conditionMode: 'diagnosis', symptomDescription: '' })}
              >
                {t('intake_back_to_search')}
              </button>

              <p className="muted-text">{t('intake_identify_disclaimer')}</p>

              {intakeError ? <div className="notice notice--warning">{intakeError}</div> : null}

              {identifiedConditions.length ? (
                <div className="intake-likely-list">
                  {identifiedConditions.map((match) => (
                    <Card key={match.conditionId} className="saved-card intake-likely-card">
                      <div className="list-button__row">
                        <strong>{lang === 'en' ? match.conditionName_en : match.conditionName_fil}</strong>
                        <div className="inline-row">
                          <Badge
                            size="sm"
                            variant={
                              match.confidence === 'high'
                                ? 'success'
                                : match.confidence === 'medium'
                                  ? 'primary'
                                  : 'neutral'
                            }
                          >
                            {t(`intake_confidence_${match.confidence}`)}
                          </Badge>
                          <button
                            type="button"
                            className="condition-row__info"
                            onClick={() => handleConditionDetailOpen(match.conditionId)}
                            aria-label={`${t('more_info')} ${lang === 'en' ? match.conditionName_en : match.conditionName_fil}`}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                          </button>
                        </div>
                      </div>
                      <p className="muted-text">
                        {lang === 'en' ? match.reason_en : match.reason_fil}
                      </p>
                      <button
                        type="button"
                        className="button button--outline button--sm"
                        onClick={() => handleConditionSelect(match.conditionId)}
                      >
                        {t('select_this_condition')}
                      </button>
                    </Card>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>
      </Card>
    );
  }

  function renderCoverageDetailQuestion() {
    if (!variantConfig) {
      return null;
    }

    return (
      <Card className="intake-question-card">
        <div className="tab-section">
          {renderQuestionHeader({
            current: 4,
            title: t('coverage_detail_title'),
            subtitle: lang === 'en' ? variantConfig.note_en : variantConfig.note_fil,
          })}

          <div className="sheet-list__item">
            <span className="sheet-list__title">
              {lang === 'en' ? variantConfig.title_en : variantConfig.title_fil}
            </span>
          </div>

          <div className="select-grid">
            {variantConfig.options.map((option) => (
              <button
                key={option.key}
                type="button"
                className={`select-card${answers.coverageVariantKey === option.key ? ' select-card--selected' : ''}`}
                onClick={() => updateAnswers({ coverageVariantKey: option.key })}
              >
                <span className="select-card__title">
                  {lang === 'en' ? option.label_en : option.label_fil}
                </span>
                <span className="select-card__desc">
                  {lang === 'en' ? option.desc_en : option.desc_fil}
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            className={`button button--primary${answers.coverageVariantKey ? '' : ' button--disabled'}`}
            disabled={!answers.coverageVariantKey}
            onClick={() => setCurrentStep(membershipStep)}
          >
            {t('intake_continue')}
          </button>
        </div>
      </Card>
    );
  }

  function renderMembershipQuestion() {
    return (
      <Card className="intake-question-card">
        <div className="tab-section">
          {renderQuestionHeader({
            current: membershipStep + 1,
            title: membershipQuestionContent.title,
            subtitle: membershipQuestionContent.note,
          })}

          {membershipQuestionContent.guidance.length ? (
            <div className="info-card-advisory">
              <div className="info-card-header">
                <div className="info-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 8v4M12 16h.01"/>
                  </svg>
                </div>
                <h3 className="info-card-title">{t('intake_membership_guidance_title')}</h3>
              </div>
              <div className="sheet-list">
                {membershipQuestionContent.guidance.map((message) => (
                  <div key={message} className="sheet-list__item">
                    <span className="muted-text">{message}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="select-grid">
            {MEMBERSHIP_OPTIONS.map((option) => (
              <button
                key={option.code}
                type="button"
                className={`select-card${answers.memberType === option.code ? ' select-card--selected' : ''}`}
                onClick={() => updateAnswers({ memberType: option.code })}
              >
                <div className="mem-header">
                  <div className="mem-icon-wrap" aria-hidden="true">
                    {MEMBERSHIP_ICONS[option.code]}
                  </div>
                  <div className="mem-text">
                    <span className="mem-title">
                      {lang === 'en' ? option.label_en : option.label_fil}
                    </span>
                    {option.nbpEligible ? (
                      <span className="nbb-badge">NBB ✓</span>
                    ) : null}
                  </div>
                </div>
                <p className="mem-desc">
                  {lang === 'en' ? option.desc_en : option.desc_fil}
                </p>
              </button>
            ))}
          </div>

          <button
            type="button"
            className={`button button--primary${answers.memberType ? '' : ' button--disabled'}`}
            disabled={!answers.memberType}
            onClick={() => setCurrentStep(hospitalStep)}
          >
            {t('intake_continue')}
          </button>
        </div>
      </Card>
    );
  }

  function renderHospitalQuestion() {
    const selectedHospital = answers.hospitalId ? getHospitalById(answers.hospitalId) : null;
    const normalizedHospitalCity = normalizePlaceValue(answers.hospitalCity);
    const recommendedRoute =
      urgencyResult?.level === 'red' ||
      ['SCENARIO_AT_BILLING_COUNTER', 'SCENARIO_DOCTOR_ADMITTED', 'SCENARIO_ALREADY_ADMITTED'].includes(
        answers.scenario,
      )
        ? 'hospital'
        : urgencyResult?.level === 'yellow' || urgencyResult?.level === 'green'
          ? 'contact'
          : '';
    const routeNoteKey =
      urgencyResult?.level === 'red' ||
      ['SCENARIO_AT_BILLING_COUNTER', 'SCENARIO_DOCTOR_ADMITTED', 'SCENARIO_ALREADY_ADMITTED'].includes(
        answers.scenario,
      )
        ? 'hospital_route_red_note'
        : urgencyResult?.level === 'yellow'
          ? 'hospital_route_yellow_note'
          : 'hospital_route_neutral_note';
    const locationScopeLabel =
      answers.hospitalCity && answers.hospitalProvince
        ? t('hospital_locator_scope_city', {
            city: answers.hospitalCity,
            province: answers.hospitalProvince,
          })
        : answers.hospitalCity
          ? t('hospital_locator_scope_city_only', { city: answers.hospitalCity })
          : answers.hospitalProvince
            ? t('hospital_locator_scope_province', { province: answers.hospitalProvince })
            : '';
    const showCitySuggestions =
      citySuggestions.length > 0 &&
      normalizedHospitalCity.length >= 2 &&
      !citySuggestions.some((city) => normalizePlaceValue(city) === normalizedHospitalCity);

    function handleHospitalProvinceChange(value) {
      updateAnswers({
        hospitalProvince: value,
        hospitalCity: '',
        hospitalId: '',
        hospitalName: '',
      });
    }

    function handleHospitalCityChange(value) {
      updateAnswers({
        hospitalCity: value,
        hospitalId: '',
        hospitalName: '',
        hospitalProvince: answers.hospitalProvince,
      });
    }

    function handleHospitalNameChange(value) {
      updateAnswers({
        hospitalName: value,
        hospitalId: '',
        hospitalProvince: answers.hospitalProvince,
      });
    }

    function handleHospitalSelect(hospital) {
      updateAnswers({
        hospitalId: hospital.id,
        hospitalName: hospital.name,
        hospitalCity: hospital.city,
        hospitalProvince: hospital.province,
        hospitalLevel: `level${hospital.level}`,
        hospitalType: mapHospitalTypeToSelection(hospital.type),
      });
    }

    function handleClearCity() {
      updateAnswers({
        hospitalCity: '',
        hospitalId: '',
        hospitalName: '',
      });
    }

    function handleClearHospital() {
      updateAnswers({
        hospitalId: '',
        hospitalName: '',
        hospitalProvince: answers.hospitalProvince,
      });
    }

    function handleClearProvince() {
      updateAnswers({
        hospitalProvince: '',
        hospitalCity: '',
        hospitalId: '',
        hospitalName: '',
      });
    }

    return (
      <Card className="intake-question-card">
        <div className="tab-section">
          {renderQuestionHeader({
            current: hospitalStep + 1,
            title: t('intake_hospital_title'),
          })}

          <label className="tab-section">
            <span className="sheet-list__title">{t('intake_hospital_province')}</span>
            <select
              className="select-input hospital-locator__select"
              value={answers.hospitalProvince}
              onChange={(event) => handleHospitalProvinceChange(event.target.value)}
            >
              <option value="">{t('intake_hospital_province_placeholder')}</option>
              {provinceOptions.map((province) => (
                <option key={province} value={province}>
                  {province}
                </option>
              ))}
            </select>
            {answers.hospitalProvince ? (
              <button
                type="button"
                className="button button--outline button--sm"
                onClick={handleClearProvince}
              >
                {t('clear_province')}
              </button>
            ) : null}
          </label>

          <label className="tab-section">
            <span className="sheet-list__title">{t('intake_hospital_city')}</span>
            <input
              className="search-input"
              value={answers.hospitalCity}
              onChange={(event) => handleHospitalCityChange(event.target.value)}
              placeholder={t('intake_hospital_city_placeholder')}
              list="intake-city-options"
            />
            <datalist id="intake-city-options">
              {intakeCityOptions.slice(0, 100).map((city) => (
                <option key={city} value={city} />
              ))}
            </datalist>
            {answers.hospitalCity ? (
              <button
                type="button"
                className="button button--outline button--sm"
                onClick={handleClearCity}
              >
                {t('clear_city')}
              </button>
            ) : null}
          </label>

          {showCitySuggestions ? (
            <Card className="list-card">
              {citySuggestions.map((city) => (
                <button
                  key={city}
                  type="button"
                  className="list-button"
                  onClick={() => handleHospitalCityChange(city)}
                >
                  <span className="list-button__title">{city}</span>
                </button>
              ))}
            </Card>
          ) : null}

          <Card variant="primary" className="saved-card">
            <div className="list-button__row">
              <strong>{t('hospital_route_title')}</strong>
              {recommendedRoute ? <span className="tag">{t('hospital_route_recommended')}</span> : null}
            </div>
            <p className="muted-text">{t(routeNoteKey)}</p>
            <div className="sheet-list">
              <div className="sheet-list__item care-route-item">
                <span className="sheet-list__title">{t('hospital_route_contact_title')}</span>
                <span className="muted-text">{t('hospital_route_contact_body')}</span>
              </div>
              <div className="sheet-list__item care-route-item">
                <span className="sheet-list__title">{t('hospital_route_facility_title')}</span>
                <span className="muted-text">{t('hospital_route_facility_body')}</span>
              </div>
              <div className="sheet-list__item care-route-item">
                <span className="sheet-list__title">{t('hospital_route_er_title')}</span>
                <span className="muted-text">{t('hospital_route_er_body')}</span>
              </div>
            </div>
          </Card>

          <Card className="saved-card">
            <strong>{t('hospital_locator_title')}</strong>
            {locationScopeLabel ? <p className="muted-text">{locationScopeLabel}</p> : null}
            {nearbyFacilityGroups.length ? (
              <div className="tab-section">
                {nearbyFacilityGroups.map((group) => (
                  <div key={group.level} className="facility-group">
                    <div className="facility-group__header">
                      <div>
                        <strong>{t('level_short', { level: group.level })}</strong>
                        <p className="muted-text">
                          {t(
                            HOSPITAL_LEVELS.find((level) => getHospitalLevelNumber(level.code) === String(group.level))
                              ?.descriptionKey,
                          )}
                        </p>
                      </div>
                      <span className={`tag${group.scope === 'province' ? ' tag--gray' : ''}`}>
                        {group.scope === 'city'
                          ? t('hospital_locator_scope_same_city')
                          : t('hospital_locator_scope_province_fallback')}
                      </span>
                    </div>
                    <Card className="list-card">
                      {group.facilities.map((hospital) => (
                        <button
                          key={hospital.id}
                          type="button"
                          className="list-button"
                          onClick={() => handleHospitalSelect(hospital)}
                        >
                          <div className="list-button__row">
                            <span className="list-button__title">{hospital.name}</span>
                            <span className="list-button__meta">
                              <span className="tag">{`Level ${hospital.level}`}</span>
                              <span className="tag tag--gray">{getHospitalTypeLabel(hospital.type, t)}</span>
                              {hospital.hasMalasakitCenter ? <span className="tag tag--gray">{t('hospital_finder_malasakit')}</span> : null}
                            </span>
                          </div>
                          <span className="muted-text">
                            {hospital.address ? `${hospital.address}, ` : ''}
                            {hospital.city}, {hospital.province}
                          </span>
                        </button>
                      ))}
                    </Card>
                  </div>
                ))}
              </div>
            ) : (
              <div className="notice notice--warning">
                {answers.hospitalProvince || answers.hospitalCity
                  ? t('hospital_locator_none_found')
                  : t('hospital_locator_empty')}
              </div>
            )}
            <p className="muted-text">{t('hospital_finder_provenance')}</p>
          </Card>

          <label className="tab-section">
            <span className="sheet-list__title">{t('intake_hospital_name')}</span>
            <input
              className="search-input"
              value={answers.hospitalName}
              onChange={(event) => handleHospitalNameChange(event.target.value)}
              placeholder={t('intake_hospital_name_placeholder')}
            />
            {(answers.hospitalName || selectedHospital) ? (
              <button
                type="button"
                className="button button--outline button--sm"
                onClick={handleClearHospital}
              >
                {t('clear_hospital')}
              </button>
            ) : null}
          </label>

          {hospitalSuggestions.length ? (
            <Card className="list-card">
              {hospitalSuggestions.slice(0, 8).map((hospital) => (
                <button
                  key={hospital.id}
                  type="button"
                  className="list-button"
                  onClick={() => handleHospitalSelect(hospital)}
                >
                  <div className="list-button__row">
                    <span className="list-button__title">{hospital.name}</span>
                    <span className="list-button__meta">
                      <span className="tag">{`Level ${hospital.level}`}</span>
                      <span className="tag tag--gray">{getHospitalTypeLabel(hospital.type, t)}</span>
                    </span>
                  </div>
                  <span className="muted-text">
                    {hospital.city}, {hospital.province}
                  </span>
                </button>
              ))}
            </Card>
          ) : null}

          {selectedHospital ? (
            <Card variant="success" className="saved-card">
              <strong>
                {t('hospital_selected_summary', {
                  name: selectedHospital.name,
                  level: selectedHospital.level,
                  type: getHospitalTypeLabel(selectedHospital.type, t),
                })}
              </strong>
              {selectedHospital.isDOH ? (
                <p className="muted-text text-success">{t('hospital_selected_doh')}</p>
              ) : null}
              {selectedHospital.hasMalasakitCenter && answers.memberType === 'NHTS' ? (
                <p className="muted-text text-success">{t('hospital_selected_malasakit')}</p>
              ) : null}
              <p className="muted-text">{t('hospital_selected_lock_note')}</p>
            </Card>
          ) : null}

          <div className="picker-panel">
            <div className="inline-row">
              <span className="picker-panel__step" aria-hidden="true">1</span>
              <h3 className="tab-section__title">{t('hospital_level_label')}</h3>
            </div>
            <div className="select-grid">
              {HOSPITAL_LEVELS.map((level) => (
                <button
                  key={level.code}
                  type="button"
                  className={`select-card${answers.hospitalLevel === level.code ? ' select-card--selected' : ''}`}
                  onClick={() => updateAnswers({ hospitalLevel: level.code })}
                  disabled={Boolean(selectedHospital)}
                >
                  <span className="select-card__title">
                    {t('level_short', { level: getHospitalLevelNumber(level.code) })}
                  </span>
                  <span className="select-card__desc">{t(level.descriptionKey)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="picker-panel">
            <div className="inline-row">
              <span className="picker-panel__step" aria-hidden="true">2</span>
              <h3 className="tab-section__title">{t('hospital_type_label')}</h3>
            </div>
            <div className="select-grid">
              {HOSPITAL_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  className={`select-card${answers.hospitalType === option.code ? ' select-card--selected' : ''}`}
                  onClick={() => updateAnswers({ hospitalType: option.code })}
                  disabled={Boolean(selectedHospital)}
                >
                  <span className="select-card__title">{t(option.labelKey)}</span>
                  <span className="select-card__desc">{t(option.descriptionKey)}</span>
                </button>
              ))}
            </div>

            {answers.hospitalType === 'UNKNOWN' ? (
              <div className="notice notice--warning">{t('hospital_type_unknown_tip')}</div>
            ) : null}
          </div>

          <div className="picker-panel">
            <div className="inline-row">
              <span className="picker-panel__step" aria-hidden="true">3</span>
              <h3 className="tab-section__title">{t('room_type_label')}</h3>
            </div>
            <div className="select-grid">
              {ROOM_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  className={`select-card${answers.roomType === option.code ? ' select-card--selected' : ''}`}
                  onClick={() => updateAnswers({ roomType: option.code })}
                >
                  <span className="select-card__title">{t(option.labelKey)}</span>
                  <span className="select-card__desc">{t(option.descriptionKey)}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className={`button button--primary${answers.hospitalLevel && answers.hospitalType && answers.roomType ? '' : ' button--disabled'}`}
            disabled={!answers.hospitalLevel || !answers.hospitalType || !answers.roomType}
            onClick={() => setCurrentStep(physicianStep)}
          >
            {t('intake_continue')}
          </button>
        </div>
      </Card>
    );
  }

  function renderHospitalFinderSection(levelCode) {
    const selectedHospital = answers.hospitalId ? getHospitalById(answers.hospitalId) : null;
    const coverage = resultView?.coverage;
    const selectedTypeLabel = selectedHospital
      ? getHospitalTypeLabel(selectedHospital.type, t)
      : answers.hospitalType
        ? t(`hospital_type_tag_${answers.hospitalType}`)
        : '';
    const packageAccreditationNote = coverage
      ? lang === 'en'
        ? coverage.packageAccreditationNote_en
        : coverage.packageAccreditationNote_fil
      : '';
    const isNonAccredited =
      selectedHospital?.philhealthAccredited === false || answers.hospitalType === 'PRIVATE_NOT_ACCREDITED';

    return (
      <section className="tab-section">
        <Card className="saved-card">
          <h3 className="tab-section__title">{t('hospital_accreditation_title')}</h3>
          <p>
            {isNonAccredited
              ? t('hospital_accreditation_non_accredited_body')
              : selectedHospital
                ? t('hospital_accreditation_yes_selected', { name: selectedHospital.name })
                : answers.hospitalType && answers.hospitalType !== 'UNKNOWN'
                  ? t('hospital_accreditation_yes_typed', { type: selectedTypeLabel })
                  : t('hospital_accreditation_unknown')}
          </p>
          {selectedHospital ? (
            <p className="muted-text">
              {t('hospital_accreditation_selected_meta', {
                level: selectedHospital.level,
                type: selectedTypeLabel,
              })}
            </p>
          ) : answers.hospitalLevel || selectedTypeLabel ? (
            <p className="muted-text">
              {t('hospital_accreditation_context_meta', {
                level: getHospitalLevelNumber(levelCode) || '?',
                type: selectedTypeLabel || t('hospital_type_tag_UNKNOWN'),
              })}
            </p>
          ) : null}
        </Card>

        {isNonAccredited ? (
          <Card variant="warning" className="saved-card">
            <p>{t('hospital_accreditation_emergency_exception')}</p>
          </Card>
        ) : null}

        {packageAccreditationNote ? (
          <Card variant="warning" className="saved-card">
            <strong>{t('package_accreditation_title')}</strong>
            <p>{packageAccreditationNote}</p>
          </Card>
        ) : null}
      </section>
    );
  }

  function renderPhysicianInfoQuestion() {
    return (
      <Card className="intake-question-card">
        <div className="tab-section">
          {renderQuestionHeader({
            current: physicianStep + 1,
            title: t('intake_physician_title'),
          })}

          <div className="info-card-advisory">
            <div className="info-card-header">
              <div className="info-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 8v4M12 16h.01"/>
                </svg>
              </div>
              <h3 className="info-card-title">{t('intake_physician_title')}</h3>
            </div>

            <div className="info-key-fact">
              <span className="fact-label">30%</span>
              <span className="fact-desc">
                {lang === 'en'
                  ? 'of case rate = professional fee, covered only if doctor is PhilHealth-accredited'
                  : 'ng case rate = professional fee, sakop lang kung PhilHealth-accredited ang doktor'}
              </span>
            </div>

            <div className="info-comparison">
              <div className="comparison-row good">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span>
                  {lang === 'en'
                    ? 'Accredited doctor → professional fee covered'
                    : 'Accredited na doktor → professional fee covered'}
                </span>
              </div>
              <div className="comparison-row bad">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                <span>
                  {lang === 'en'
                    ? 'Not accredited → patient pays professional fee'
                    : 'Hindi accredited → pasyente nagbabayad ng professional fee'}
                </span>
              </div>
            </div>

            <a
              href={PHYSICIAN_SEARCH_URL}
              target="_blank"
              rel="noreferrer"
              className="info-card-link"
            >
              {lang === 'en' ? 'Check physician accreditation' : 'I-check ang accreditation ng doktor'}{' '}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
          </div>

          <button
            type="button"
            className="button button--outline"
            onClick={() => setCurrentStep(confirmationStep)}
          >
            {t('intake_physician_skip')}
          </button>
        </div>
      </Card>
    );
  }

  function renderConfirmationQuestion() {
    return (
      <Card className="intake-question-card">
        <div className="tab-section">
          {renderQuestionHeader({
            current: confirmationStep + 1,
            title: t('intake_confirm_title'),
          })}

          <div className="sheet-list">
            <button type="button" className="intake-summary-row" onClick={() => setCurrentStep(0)}>
              <span className="intake-summary-row__label">{t('intake_summary_scenario')}</span>
              <strong>{t(SCENARIOS.find((scenario) => scenario.code === answers.scenario)?.labelKey)}</strong>
            </button>
            <button type="button" className="intake-summary-row" onClick={() => setCurrentStep(1)}>
              <span className="intake-summary-row__label">{t('intake_summary_patient')}</span>
              <strong>
                {answers.patientAge !== ''
                  ? t('intake_patient_summary', {
                      age: answers.patientAge,
                      relationship: t(
                        RELATIONSHIPS.find((relationship) => relationship.code === answers.patientRelationship)?.labelKey,
                      ),
                    })
                  : t(
                      RELATIONSHIPS.find((relationship) => relationship.code === answers.patientRelationship)?.labelKey,
                    )}
              </strong>
            </button>
            <button type="button" className="intake-summary-row" onClick={() => setCurrentStep(2)}>
              <span className="intake-summary-row__label">{t('intake_summary_condition')}</span>
              <strong>
                {selectedCondition
                  ? [
                      lang === 'en'
                        ? selectedCondition.name_en
                        : selectedCondition.name_fil,
                      selectedVariantOption
                        ? lang === 'en'
                          ? selectedVariantOption.label_en
                          : selectedVariantOption.label_fil
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' • ')
                  : answers.symptomDescription}
              </strong>
            </button>
            {hasCoverageDetailStep ? (
              <button type="button" className="intake-summary-row" onClick={() => setCurrentStep(3)}>
                <span className="intake-summary-row__label">{t('coverage_detail_title')}</span>
                <strong>
                  {selectedVariantOption
                    ? lang === 'en'
                      ? selectedVariantOption.label_en
                      : selectedVariantOption.label_fil
                    : t('intake_result_pending_confirmation')}
                </strong>
              </button>
            ) : null}
            <button type="button" className="intake-summary-row" onClick={() => setCurrentStep(membershipStep)}>
              <span className="intake-summary-row__label">{t('intake_summary_membership')}</span>
              <strong>{getMembershipLabel(answers.memberType, lang)}</strong>
            </button>
            <button type="button" className="intake-summary-row" onClick={() => setCurrentStep(hospitalStep)}>
              <span className="intake-summary-row__label">{t('intake_summary_hospital')}</span>
              <strong>
                {t('level_short', { level: getHospitalLevelNumber(answers.hospitalLevel) })}
                {answers.hospitalType ? ` • ${t(`hospital_type_tag_${answers.hospitalType}`)}` : ''}
                {answers.roomType ? ` • ${t(`room_type_tag_${answers.roomType}`)}` : ''}
                {answers.hospitalName ? ` • ${answers.hospitalName}` : ''}
              </strong>
            </button>
            <button type="button" className="intake-summary-row" onClick={() => setCurrentStep(physicianStep)}>
              <span className="intake-summary-row__label">{t('intake_physician_title')}</span>
              <strong>{t('intake_physician_summary')}</strong>
            </button>
          </div>

          <button
            type="button"
            className={`button button--primary${isGenerating ? ' button--disabled' : ''}`}
            disabled={isGenerating}
            onClick={() => void handleGenerate()}
          >
            {isGenerating ? t('intake_generating') : t('intake_generate')}
          </button>
        </div>
      </Card>
    );
  }

  function renderQuestionContent() {
    if (currentStep === 0) return renderScenarioQuestion();
    if (answers.scenario === 'SCENARIO_AFTER_DISCHARGE') return renderClaimStatusQuestion();
    if (currentStep === 1) return renderPatientQuestion();
    if (currentStep === 2) return renderConditionQuestion();
    if (currentStep === 3 && hasCoverageDetailStep) return renderCoverageDetailQuestion();
    if (currentStep === membershipStep) return renderMembershipQuestion();
    if (currentStep === hospitalStep) return renderHospitalQuestion();
    if (currentStep === physicianStep) return renderPhysicianInfoQuestion();
    return renderConfirmationQuestion();
  }

  function renderConfidenceBadge(result) {
    const confidence = result?.dataConfidence?.confidence ?? result?.confidence ?? 'needs_check';
    const verifiedBy = result?.dataConfidence?.verifiedBy ?? result?.verifiedBy ?? null;

    if (confidence === 'verified') {
      return (
        <div className="hero-card__confidence">
          <Badge
            variant="success"
            size="sm"
            title={verifiedBy ? t('data_confidence_verified_detail', { source: verifiedBy }) : ''}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            {t('data_confidence_verified')}
          </Badge>
        </div>
      );
    }

    if (confidence === 'estimated') {
      return (
        <div className="hero-card__confidence">
          <Badge variant="warning" size="sm">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {t('data_confidence_estimated')}
          </Badge>
        </div>
      );
    }

    return (
      <div className="hero-card__confidence">
        <Badge variant="danger" size="sm">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          {t('data_confidence_needs_check')}
        </Badge>
      </div>
    );
  }

  function renderConfidenceNotice(result) {
    const confidence = result?.dataConfidence?.confidence ?? result?.confidence ?? 'needs_check';
    const verifiedBy = result?.dataConfidence?.verifiedBy ?? result?.verifiedBy ?? null;

    if (confidence === 'verified') {
      return verifiedBy ? (
        <p className="muted-text">{t('data_confidence_verified_detail', { source: verifiedBy })}</p>
      ) : null;
    }

    if (confidence === 'estimated') {
      return (
        <Card variant="warning" className="saved-card">
          <strong>{t('data_confidence_estimated_title')}</strong>
          <p>{t('data_confidence_estimated_body')}</p>
        </Card>
      );
    }

    return (
      <Card variant="warning" className="saved-card">
        <strong>{t('data_confidence_needs_check_title')}</strong>
        <p>{t('data_confidence_needs_check_body')}</p>
      </Card>
    );
  }

  function renderCoverageVariants(result) {
    if (!result?.subPackages?.length) {
      return null;
    }

    return (
      <Card className="saved-card">
        <strong>{t('coverage_variants_title')}</strong>
        <p className="muted-text">{t('coverage_variants_note')}</p>
        <div className="tab-section" style={{ gap: '10px' }}>
          {result.subPackages.map((item) => (
            <div key={`${item.name_en}-${item.amount}`} className="list-button">
              <div className="list-button__row">
                <span className="list-button__title">
                  {lang === 'en' ? item.name_en : item.name_fil}
                </span>
                <span className="saved-card__amount">₱{formatAmount(item.amount)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  function renderSourceUsedCard(result) {
    if (!result) {
      return null;
    }

    const variantUsed = lang === 'en' ? result.variantUsed_en : result.variantUsed_fil;
    const sourceDetail = lang === 'en' ? result.sourceDetail_en : result.sourceDetail_fil;

    return (
      <Card className="saved-card">
        <strong>{t('source_used_title')}</strong>
        <div className="sheet-list">
          <div className="sheet-list__item">
            <span className="sheet-list__title">{t('source_used_label')}</span>
            <span className="muted-text">
              {result.circularUrl ? (
                <a href={result.circularUrl} target="_blank" rel="noreferrer">
                  {result.circular}
                </a>
              ) : (
                result.circular
              )}
            </span>
          </div>
          {variantUsed ? (
            <div className="sheet-list__item">
              <span className="sheet-list__title">{t('source_variant_label')}</span>
              <span className="muted-text">{variantUsed}</span>
            </div>
          ) : null}
          {sourceDetail ? (
            <div className="sheet-list__item">
              <span className="muted-text">{sourceDetail}</span>
            </div>
          ) : null}
          {result.lastReviewed ? (
            <div className="sheet-list__item">
              <span className="sheet-list__title">{t('source_last_reviewed_label')}</span>
              <span className="muted-text">{result.lastReviewed}</span>
            </div>
          ) : null}
        </div>
      </Card>
    );
  }

  function toggleCompareHospital(hospitalId) {
    setCompareHospitalIds((current) => {
      if (current.includes(hospitalId)) {
        return current.filter((id) => id !== hospitalId);
      }

      if (current.length >= 2) {
        return [current[1], hospitalId];
      }

      return [...current, hospitalId];
    });
  }

  function renderResultStatusCard(result) {
    if (!result) {
      return null;
    }

    const selectedHospital = answers.hospitalId ? getHospitalById(answers.hospitalId) : null;
    const contextParts = [];

    if (result.selectedVariantName_en || result.selectedVariantName_fil) {
      contextParts.push(lang === 'en' ? result.selectedVariantName_en : result.selectedVariantName_fil);
    }

    contextParts.push(t('level_short', { level: getHospitalLevelNumber(answers.hospitalLevel) }));

    if (selectedHospital) {
      contextParts.push(selectedHospital.name);
    } else if (answers.hospitalType) {
      contextParts.push(getHospitalTypeLabel(answers.hospitalType, t));
    }

    if (answers.roomType) {
      contextParts.push(getRoomTypeLabel(answers.roomType, lang));
    }

    if (answers.memberType) {
      contextParts.push(getMembershipLabel(answers.memberType, lang));
    }

    return (
      <Card className="saved-card">
        <strong>{t('result_status_title')}</strong>
        <p className="muted-text">{t('result_status_body', { context: contextParts.filter(Boolean).join(' • ') })}</p>
      </Card>
    );
  }

  function renderBringChecklistCard(result) {
    if (!result?.documents?.length) {
      return null;
    }

    const quickItems = result.documents.filter((item) => item.critical);
    const visibleItems = (quickItems.length ? quickItems : result.documents).slice(0, 5);

    return (
      <section className="tab-section">
        <Accordion title={t('bring_checklist_title')}>
          <div className="sheet-list">
            <p className="muted-text">{t('bring_checklist_sub')}</p>
            {visibleItems.map((item) => (
              <div key={`${item.order}-${item.label_en}`} className="sheet-list__item">
                <div className="list-button__row">
                  <span>{lang === 'en' ? item.label_en : item.label_fil}</span>
                  {item.critical ? (
                    <Badge variant="danger" size="sm">{t('required')}</Badge>
                  ) : null}
                </div>
              </div>
            ))}
            <button
              type="button"
              className="button button--outline button--sm"
              onClick={() => onTabChange(2)}
            >
              {t('bring_checklist_open_guide')}
            </button>
          </div>
        </Accordion>
      </section>
    );
  }

  function renderCoverageSection(coverage, zbbStatus) {
    if (!coverage) {
      return (
        <Card variant="warning" className="saved-card">
          <strong>{t('intake_result_pending_confirmation')}</strong>
          <p className="muted-text">{t('intake_result_pending_confirmation_sub')}</p>
        </Card>
      );
    }

    const selectedHospital = answers.hospitalId ? getHospitalById(answers.hospitalId) : null;
    const facilityWorkflowNote = getFacilityWorkflowNote(
      coverage,
      answers.hospitalType,
      answers.roomType,
      selectedHospital?.name || answers.hospitalName.trim(),
    );
    const actualBillAmount = Number(actualBillInput);
    const hasActualBill = Number.isFinite(actualBillAmount) && actualBillAmount > 0;
    const displayedAmount =
      hasActualBill && actualBillAmount < coverage.amount
        ? actualBillAmount
        : coverage.amount;
    const exactCopay =
      hasActualBill && !zbbStatus?.zbbApplies
        ? Math.max(actualBillAmount - displayedAmount, 0)
        : null;

    const showActualBillInput =
      answers.scenario === 'SCENARIO_ALREADY_ADMITTED' ||
      resultView?.mode === 'emergency';

    return (
      <>
        {zbbStatus ? (
          <div className={`zbb-banner${zbbStatus.zbbApplies ? ' zbb-banner--success' : ''}`}>
            <div className="zbb-banner__content">
              <strong className="zbb-card__title">
                {zbbStatus.zbbType === 'FULL_ZBB'
                  ? t('zbb_full_banner')
                  : zbbStatus.zbbType === 'NBB'
                    ? t('zbb_nbb_banner')
                    : answers.roomType === 'PRIVATE'
                      ? t('zbb_private_room_warning')
                      : t('zbb_regular_banner')}
              </strong>
              <p>{lang === 'en' ? zbbStatus.explanation_en : zbbStatus.explanation_fil}</p>
              {(lang === 'en' ? zbbStatus.warning_en : zbbStatus.warning_fil) ? (
                <p className="muted-text">
                  {lang === 'en' ? zbbStatus.warning_en : zbbStatus.warning_fil}
                </p>
              ) : null}
              {selectedHospital?.isDOH && answers.roomType === 'WARD' ? (
                <p className="muted-text text-success">
                  {t('hospital_context_doh_confirm', { name: selectedHospital.name })}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="amount-hero-card">
          <span className="hero-card__label">{t('philhealth_pays')}</span>
          <div className="hero-card__amount-row">
            <div className="hero-card__amount">
              <span className="currency">₱</span>{formatAmount(displayedAmount)}
            </div>
            {renderConfidenceBadge(coverage)}
          </div>
          <p className="hero-card__package">
            {lang === 'en' ? coverage.packageName_en : coverage.packageName_fil}
          </p>
          <p className="muted-text">
            {t('lesser_of_note', { amount: formatAmount(coverage.amount) })}
          </p>
        </div>

        {renderConfidenceNotice(coverage)}

        <div className="tab-section">
          <div className={`df-badge ${coverage.directFiling ? 'df-badge--yes' : 'df-badge--no'}`}>
            <span className="df-badge__icon" aria-hidden="true">
              {coverage.directFiling ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              )}
            </span>
            <span className="df-badge__text">
              {coverage.directFiling ? t('direct_filing_badge') : t('reimburse_only_badge')}
            </span>
          </div>
          <p className="muted-text">{coverage.directFiling ? t('direct_filing_explanation') : t('reimburse_explanation')}</p>
        </div>

        {coverage.requiresPreAuth ? (
          <Card variant="warning" className="saved-card">
            <strong>{t('preauth_title')}</strong>
            <p>{t('preauth_body_intro')}</p>
            <p>{lang === 'en' ? coverage.preAuthNote_en : coverage.preAuthNote_fil}</p>
            <p className="muted-text">{t('preauth_emergency_note')}</p>
          </Card>
        ) : null}

        {(lang === 'en' ? coverage.coverageNote_en : coverage.coverageNote_fil) ? (
          <Card className="saved-card">
            <strong>{t('coverage_note_title')}</strong>
            <p>{lang === 'en' ? coverage.coverageNote_en : coverage.coverageNote_fil}</p>
          </Card>
        ) : null}

        {renderCoverageVariants(coverage)}

        {renderSourceUsedCard(coverage)}

        {facilityWorkflowNote ? (
          <Card className="saved-card">
            <strong>{lang === 'en' ? facilityWorkflowNote.title_en : facilityWorkflowNote.title_fil}</strong>
            <p>{lang === 'en' ? facilityWorkflowNote.body_en : facilityWorkflowNote.body_fil}</p>
          </Card>
        ) : null}

        {!zbbStatus?.zbbApplies ? (
          <Card className="saved-card">
            <div className="list-button__row">
              <span className="sheet-list__title">{t('your_copay')}</span>
              <span className="saved-card__amount">
                {exactCopay !== null
                  ? `₱${formatAmount(exactCopay)}`
                  : `₱${formatAmount(coverage.copayMin)} - ₱${formatAmount(coverage.copayMax)}`}
              </span>
            </div>
            <p className="muted-text">
              {hasActualBill && actualBillAmount < coverage.amount
                ? t('actual_bill_lower_note')
                : t('copay_note')}
            </p>
            {(answers.memberType === 'SSS' || answers.memberType === 'GSIS') ? (
              <p className="muted-text">{t('hmo_copay_note')}</p>
            ) : null}
          </Card>
        ) : null}

        {showActualBillInput ? (
          <label className="tab-section">
            <span className="sheet-list__title">{t('actual_bill_input_label')}</span>
            <input
              className="search-input"
              type="number"
              min="0"
              inputMode="numeric"
              placeholder={t('actual_bill_input_placeholder')}
              value={actualBillInput}
              onChange={(event) => setActualBillInput(event.target.value)}
            />
          </label>
        ) : null}
      </>
    );
  }

  function renderResultView() {
    if (!resultView) {
      return null;
    }

    const coverage = resultView.coverage;
    const zbbStatus =
      resultView.zbbStatus ||
      (answers.memberType && answers.hospitalType && answers.roomType
        ? getZBBStatus(answers.memberType, answers.hospitalType, answers.roomType)
        : null);
    const membershipOption = getMembershipOptionById(answers.memberType);
    const membershipNote = coverage
      ? lang === 'en'
        ? coverage.membershipNote_en
        : coverage.membershipNote_fil
      : null;
    const effectiveDate = coverage
      ? lang === 'en'
        ? coverage.effectiveDate
        : coverage.effectiveDate_fil
      : '';
    const dualBenefitNote = membershipOption
      ? lang === 'en'
        ? membershipOption.discountNote_en
        : membershipOption.discountNote_fil
      : '';
    const dualBenefitTitle =
      answers.memberType === 'SENIOR'
        ? t('dual_benefit_senior_title')
        : answers.memberType === 'PWD'
          ? t('dual_benefit_pwd_title')
          : '';
    const selectedHospital = answers.hospitalId ? getHospitalById(answers.hospitalId) : null;
    const liveScenarioContext = buildScenarioContext(
      {
        ...answers,
        conditionId: coverage?.conditionId ?? answers.conditionId,
      },
      coverage,
      resultView.likelyConditions ?? [],
    );
    const localizedActionSteps =
      resultView.mode === 'after_discharge'
        ? getLocalizedActionSteps(
            buildAfterDischargeResult(
              answers.claimOutcome || resultView.claimOutcome || 'NOT_FILED',
              lang,
              t,
            ),
            lang,
          )
        : buildFallbackGuidance(
            resultView.scenario,
            lang,
            buildLocalizedScenarioContext(liveScenarioContext, lang),
            coverage,
          );
    const localizedBillingScript =
      getLocalizedBillingScript(resultView, lang).trim() ||
      buildEmergencyScript(lang, getLocalizedConditionName(resultView, lang));
    const eligibilityItems = buildEligibilityItems(
      answers.memberType,
      isDependentRelationship(answers.patientRelationship),
      t,
    );
    const selectedDenialReason =
      resultView.claimOutcome === 'DENIED' && selectedDenialReasonIndex !== null
        ? resultView.topDenialReasons?.[selectedDenialReasonIndex] ?? null
        : null;

    if (resultView.mode === 'after_discharge') {
      return (
        <div className="tab-screen intake-tab intake-tab--result">
          <div className="summary-bar summary-bar--end">
            <button
              type="button"
              className="button button--outline button--sm"
              onClick={handleReset}
            >
              {t('start_over')}
            </button>
          </div>

          <section className="tab-section">
            <h2 className="empty-state__title">{t(resultView.headerKey)}</h2>
            <p className="muted-text">{t('claim_denial_after_discharge_sub')}</p>
          </section>

          <ReimbursementGuide deadlineText={resultView.reimbursementDeadline} />

          {resultView.claimOutcome === 'WAITING' ? (
            <>
              <Card className="saved-card">
                <strong>{t('claim_denial_waiting_title')}</strong>
                <p>{t('claim_denial_waiting_body')}</p>
              </Card>
              <Card className="saved-card">
                <h3 className="tab-section__title">{t('claim_denial_waiting_timeline_title')}</h3>
                <div className="sheet-list">
                  {resultView.waitingTimeline?.map((item) => (
                    <div key={item.key} className="sheet-list__item">
                      <span className="sheet-list__title">{item.title}</span>
                      <span className="muted-text">{item.body}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          ) : null}

          {resultView.claimOutcome === 'DENIED' ? (
            <>
              <section className="tab-section">
                <h3 className="tab-section__title">{t('claim_denial_reason_title')}</h3>
                <p className="muted-text">{t('claim_denial_reason_sub')}</p>
                <div className="select-grid">
                  {resultView.topDenialReasons?.map((reason, index) => (
                    <button
                      key={`${reason.reason_en}-${index}`}
                      type="button"
                      className={`select-card${selectedDenialReasonIndex === index ? ' select-card--selected' : ''}`}
                      onClick={() => setSelectedDenialReasonIndex(index)}
                    >
                      <span className="select-card__title">
                        {lang === 'en' ? reason.reason_en : reason.reason_fil}
                      </span>
                      <span className="select-card__desc">{t('claim_denial_reason_prompt')}</span>
                    </button>
                  ))}
                </div>
              </section>

              {selectedDenialReason ? (
                <Card className="saved-card">
                  <div className="list-button__row">
                    <strong>
                      {lang === 'en'
                        ? selectedDenialReason.reason_en
                        : selectedDenialReason.reason_fil}
                    </strong>
                    <Badge
                      size="sm"
                      variant={selectedDenialReason.canAppeal ? 'success' : 'warning'}
                    >
                      {selectedDenialReason.canAppeal
                        ? t('claim_denial_can_appeal')
                        : t('claim_denial_cannot_appeal')}
                    </Badge>
                  </div>
                  <div className="sheet-list">
                    <div className="sheet-list__item">
                      <span className="sheet-list__title">{t('claim_denial_how_to_avoid')}</span>
                      <span className="muted-text">
                        {lang === 'en'
                          ? selectedDenialReason.howToAvoid_en
                          : selectedDenialReason.howToAvoid_fil}
                      </span>
                    </div>
                    {(lang === 'en'
                      ? selectedDenialReason.appealNote_en
                      : selectedDenialReason.appealNote_fil) ? (
                      <div className="sheet-list__item">
                        <span className="sheet-list__title">{t('claim_denial_appeal_note')}</span>
                        <span className="muted-text">
                          {lang === 'en'
                            ? selectedDenialReason.appealNote_en
                            : selectedDenialReason.appealNote_fil}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </Card>
              ) : null}

              <Card className="saved-card">
                <h3 className="tab-section__title">{t('claim_denial_appeals_title')}</h3>
                <div className="sheet-list">
                  {Object.entries(resultView.appealsProcess ?? {}).map(([stepKey, step]) => (
                    <div key={stepKey} className="sheet-list__item">
                      <span className="sheet-list__title">
                        {lang === 'en' ? step.title_en : step.title_fil}
                      </span>
                      <span className="muted-text">
                        {t('claim_denial_deadline_label')}: {lang === 'en' ? step.deadline_en : step.deadline_fil}
                      </span>
                      {step.where_en || step.where_fil ? (
                        <span className="muted-text">
                          {t('claim_denial_where_label')}: {lang === 'en' ? step.where_en : step.where_fil}
                        </span>
                      ) : null}
                      {step.docs_en || step.docs_fil ? (
                        <span className="muted-text">
                          {t('claim_denial_docs_label')}: {(lang === 'en' ? step.docs_en : step.docs_fil).join(', ')}
                        </span>
                      ) : null}
                      {step.fee_en || step.fee_fil ? (
                        <span className="muted-text">
                          {t('claim_denial_fee_label')}: {lang === 'en' ? step.fee_en : step.fee_fil}
                        </span>
                      ) : null}
                      {step.note_en || step.note_fil ? (
                        <span className="muted-text">
                          {lang === 'en' ? step.note_en : step.note_fil}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </Card>

              <Card variant="warning" className="saved-card">
                <strong>{t('claim_denial_reprocessing_banner')}</strong>
                <div className="sheet-list">
                  <span>{lang === 'en' ? resultView.reprocessing2025?.title_en : resultView.reprocessing2025?.title_fil}</span>
                  <span className="muted-text">
                    {lang === 'en'
                      ? resultView.reprocessing2025?.description_en
                      : resultView.reprocessing2025?.description_fil}
                  </span>
                  <span className="muted-text">
                    {lang === 'en'
                      ? resultView.reprocessing2025?.whoIsAffected_en
                      : resultView.reprocessing2025?.whoIsAffected_fil}
                  </span>
                  <span className="muted-text">
                    {lang === 'en'
                      ? resultView.reprocessing2025?.whatToDo_en
                      : resultView.reprocessing2025?.whatToDo_fil}
                  </span>
                </div>
              </Card>
            </>
          ) : null}

          <Card className="next-steps-card">
            <h3 className="tab-section__title">{t('intake_result_next_steps')}</h3>
            <ol className="steps-list">
              {localizedActionSteps
                .split('\n')
                .map((step) => step.trim())
                .filter(Boolean)
                .map((step, idx) => (
                <li key={idx} className="steps-list__item">
                  <span className="steps-list__number">{idx + 1}</span>
                  <span className="steps-list__text">{step.replace(/^\d+\.\s*/, '')}</span>
                </li>
              ))}
            </ol>
          </Card>

          <div className="actions-row">
            <button
              type="button"
              className="button button--primary"
              onClick={() => void handleShareResult()}
            >
              {t('share')}
            </button>
          </div>

          <button
            type="button"
            className="button button--outline"
            onClick={onOpenChat}
          >
            {t('intake_chat_action')}
          </button>
        </div>
      );
    }

    return (
      <div className="tab-screen intake-tab intake-tab--result">
        <div className="summary-bar summary-bar--end">
          <button
            type="button"
            className="button button--outline button--sm"
            onClick={handleReset}
          >
            {t('start_over')}
          </button>
        </div>

        {resultView.mode === 'emergency' ? (
          <Card variant="warning" className="intake-emergency-header">
            <strong>{t('intake_emergency_mode_title')}</strong>
            <p>{t('intake_emergency_mode_sub')}</p>
          </Card>
        ) : null}

        <section className="tab-section">
          <h2 className="empty-state__title">{t(resultView.headerKey)}</h2>
          <p className="muted-text">
            {resultView.aiStatus === 'groq' ? t('intake_result_ai_contextual') : t('intake_result_ai_fallback')}
          </p>
        </section>

        {coverage ? (
          <div className="summary-tags">
            <span className="tag tag--gray">
              {lang === 'en' ? coverage.conditionName_en : coverage.conditionName_fil}
            </span>
            {coverage.selectedVariantName_en || coverage.selectedVariantName_fil ? (
              <span className="tag tag--gray">
                {lang === 'en' ? coverage.selectedVariantName_en : coverage.selectedVariantName_fil}
              </span>
            ) : null}
            <span className="tag tag--gray">{t('level_short', { level: getHospitalLevelNumber(answers.hospitalLevel) })}</span>
            <span className="tag tag--gray">{getMembershipLabel(answers.memberType, lang)}</span>
            {selectedHospital ? (
              <span className="tag tag--gray">
                {`${selectedHospital.name} • ${t('level_short', { level: selectedHospital.level })} • ${getHospitalTypeLabel(selectedHospital.type, t)}`}
              </span>
            ) : null}
          </div>
        ) : null}

        {renderResultStatusCard(coverage)}

        {resultView.mode === 'standard' ? renderCoverageSection(coverage, zbbStatus) : null}

        {resultView.mode === 'standard' ? renderHospitalFinderSection(answers.hospitalLevel) : null}
        {resultView.mode === 'standard' ? renderBringChecklistCard(coverage) : null}

        {resultView.mode === 'emergency' && coverage ? (
          <>
            {renderCoverageSection(coverage, zbbStatus)}
            {renderHospitalFinderSection(answers.hospitalLevel)}
            {renderBringChecklistCard(coverage)}

            {resultView.redFlags.length ? (
              <Card className="saved-card">
                <h3 className="tab-section__title">{t('red_flags_title')}</h3>
                <div className="flag-list">
                  {resultView.redFlags.map((flag, index) => (
                    <div key={`${flag.wrongStatement_en}-${index}`} className="flag-item">
                      <div className="red-flag-wrong">
                        <span className="muted-text" style={{display:'flex',alignItems:'center',gap:'4px'}}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          {t('red_flag_wrong') || 'Avoid saying'}
                        </span>
                        <p>{lang === 'en' ? flag.wrongStatement_en : flag.wrongStatement_fil}</p>
                      </div>
                      <div className="red-flag-correct">
                        <span className="muted-text" style={{display:'flex',alignItems:'center',gap:'4px'}}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                          {t('correct_response')}
                        </span>
                        <p>{lang === 'en' ? flag.correctResponse_en : flag.correctResponse_fil}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}
          </>
        ) : null}

        {dualBenefitNote ? (
          <Card
            variant={answers.memberType === 'SENIOR' ? 'warning' : 'primary'}
            className="saved-card"
          >
            <strong>{dualBenefitTitle}</strong>
            <p>{dualBenefitNote}</p>
          </Card>
        ) : null}

        {membershipNote ? (
          <Card
            variant={
              answers.memberType === 'NHTS'
                ? 'success'
                : answers.memberType === 'SENIOR'
                  ? 'warning'
                  : answers.memberType === 'PWD'
                    ? 'primary'
                    : 'default'
            }
            className="saved-card"
          >
            <strong>{membershipNote}</strong>
          </Card>
        ) : null}

        {coverage?.malasakitEligible && answers.memberType === 'NHTS' ? (
          <Card variant="success" className="saved-card">
            <strong>{t('malasakit_title')}</strong>
            <p>{lang === 'en' ? coverage.malasakitNote_en : coverage.malasakitNote_fil}</p>
            {selectedHospital?.hasMalasakitCenter ? (
              <p className="muted-text text-success">
                {t('hospital_malasakit_confirm', { name: selectedHospital.name })}
              </p>
            ) : null}
          </Card>
        ) : null}

        {eligibilityItems.length ? (
          <section className="tab-section">
            <Accordion title={t('eligibility_check_title')}>
              <div className="eligibility-checklist">
                {eligibilityItems.map((item) => (
                  <div key={item.key} className="eligibility-checklist__item">
                    <span
                      className={`eligibility-checklist__icon${item.checked ? ' eligibility-checklist__icon--checked' : ''}`}
                      aria-hidden="true"
                    >
                      {item.checked ? '✓' : '□'}
                    </span>
                    <div className="eligibility-checklist__copy">
                      <span>{item.label}</span>
                      {item.hint ? (
                        item.href ? (
                          <a href={item.href} target="_blank" rel="noreferrer">
                            {item.hint}
                          </a>
                        ) : (
                          <span className="muted-text">{item.hint}</span>
                        )
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </Accordion>
          </section>
        ) : null}

        {(answers.memberType === 'SSS' || answers.memberType === 'GSIS') && membershipOption?.contributionCheckUrl ? (
          <div className="warning-card">
            <div className="warning-card-header">
              <div className="warning-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <span className="warning-card-title">{t('contribution_check_title')}</span>
            </div>
            <div className="warning-card-body">
              <p style={{ fontSize: '13px', color: '#78350F', marginBottom: '10px' }}>{t('contribution_check_intro')}</p>
              <div className="warning-steps">
                <div className="warning-step">
                  <span className="warning-step-num">1</span>
                  <span>{t('contribution_check_step_1')}</span>
                </div>
                <div className="warning-step">
                  <span className="warning-step-num">2</span>
                  <span>{t('contribution_check_step_2')}</span>
                </div>
                <div className="warning-step">
                  <span className="warning-step-num">3</span>
                  <span>{t('contribution_check_step_3')}</span>
                </div>
                <div className="warning-step">
                  <span className="warning-step-num">4</span>
                  <span>{t('contribution_check_step_4')}</span>
                </div>
              </div>
              <a
                href={membershipOption.contributionCheckUrl}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '13px', color: '#1B4FD8', display: 'block', marginTop: '10px' }}
              >
                {membershipOption.contributionCheckUrl}
              </a>
              <p className="muted-text" style={{ fontSize: '12px', marginTop: '8px' }}>{t('contribution_check_denied')}</p>
            </div>
          </div>
        ) : null}

        <section className="tab-section">
          <Accordion title={t('physician_note_title')}>
            <div className="sheet-list">
              <p className="muted-text">{t('physician_note_intro')}</p>
              <p className="muted-text">{t('physician_note_pf')}</p>
              <a href={PHYSICIAN_SEARCH_URL} target="_blank" rel="noreferrer">
                {t('physician_note_link_label')}
              </a>
            </div>
          </Accordion>
        </section>

        {coverage?.benefitLimits?.length ? (
          <section className="tab-section">
            <Accordion title={t('benefit_limits_title')}>
              <div className="sheet-list">
                {coverage.benefitLimits.map((limit) => (
                  <div key={limit.key} className="sheet-list__item">
                    <span className="sheet-list__title">{t(`benefit_limit_${limit.key}`)}</span>
                    <span className="muted-text">
                      {lang === 'en' ? limit.description_en : limit.description_fil}
                    </span>
                    {(lang === 'en' ? limit.warningNote_en : limit.warningNote_fil) ? (
                      <span className="muted-text">
                        {lang === 'en' ? limit.warningNote_en : limit.warningNote_fil}
                      </span>
                    ) : null}
                  </div>
                ))}
                <a
                  className="muted-text"
                  href={MEMBER_PORTAL_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('benefit_limits_online')}
                </a>
              </div>
            </Accordion>
          </section>
        ) : null}

        {coverage?.secondCaseRateEligible ? (
          <section className="tab-section">
            <Accordion title={t('second_case_rate_title')}>
              <p className="muted-text">{t('second_case_rate_body')}</p>
            </Accordion>
          </section>
        ) : null}

        {coverage ? (
          <p className="muted-text">
            {t('based_on')}{' '}
            {coverage.circularUrl ? (
              <a href={coverage.circularUrl} target="_blank" rel="noreferrer">
                {coverage.circular}
              </a>
            ) : (
              coverage.circular
            )}
            {effectiveDate ? `, ${t('effective')} ${effectiveDate}` : ''}
          </p>
        ) : null}

        <Card className={`billing-script-card${resultView.mode === 'emergency' ? ' intake-script-card--emergency' : ''}`}>
          <div className="billing-script-header">
            <div className="billing-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <span className="billing-script-title">{t('say_this_to_billing')}</span>
          </div>
          <p className="script-card__text">{localizedBillingScript}</p>
          <div className="actions-row">
            <button
              type="button"
              className="button button--outline"
              onClick={() => void handleCopyScript()}
            >
              {copyState ? `${t('copied')} ✓` : t('copy')}
            </button>
            <button
              type="button"
              className="button button--primary"
              onClick={() => void handleShareResult()}
            >
              {t('share')}
            </button>
          </div>
        </Card>

        {resultView.mode === 'standard' && answers.scenario === 'SCENARIO_SYMPTOMS_UNKNOWN' && resultView.likelyConditions?.length ? (
          <section className="tab-section">
            <h3 className="tab-section__title">{t('intake_result_likely_conditions')}</h3>
            <div className="intake-likely-list">
              {resultView.likelyConditions.map((candidate) => (
                <Card key={candidate.conditionId} className="saved-card intake-likely-card">
                  <div className="list-button__row">
                    <strong>{lang === 'en' ? candidate.conditionName_en : candidate.conditionName_fil}</strong>
                    <Badge size="sm" variant="primary">
                      {t(`intake_confidence_${candidate.confidence}`)}
                    </Badge>
                  </div>
                  {candidate.amount ? (
                    <p className="saved-card__amount">₱{candidate.amount.toLocaleString()}</p>
                  ) : null}
                  <p className="muted-text">
                    {lang === 'en' ? candidate.reason_en : candidate.reason_fil}
                  </p>
                  <button
                    type="button"
                    className="button button--outline button--sm"
                    onClick={() => handleLikelyConditionConfirm(candidate)}
                  >
                    {t('intake_confirm_condition')}
                  </button>
                </Card>
              ))}
            </div>
          </section>
        ) : null}

        <Card className="next-steps-card">
          <h3 className="tab-section__title">{t('intake_result_next_steps')}</h3>
          <ol className="steps-list">
            {localizedActionSteps
              .split('\n')
              .map((step) => step.trim())
              .filter(Boolean)
              .map((step, idx) => (
              <li key={idx} className="steps-list__item">
                <span className="steps-list__number">{idx + 1}</span>
                <span className="steps-list__text">{step.replace(/^\d+\.\s*/, '')}</span>
              </li>
            ))}
          </ol>
        </Card>

        <div className="actions-row">
          <button
            type="button"
            className="button button--outline"
            onClick={handleSaveResult}
            disabled={!coverage || isSavedCurrent}
          >
            {isSavedCurrent ? t('saved_status') : t('save')}
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={() => void handleShareResult()}
          >
            {t('share')}
          </button>
        </div>

        <button
          type="button"
          className="button button--outline"
          onClick={onOpenChat}
        >
          {t('intake_chat_action')}
        </button>

        {coverage ? (
          <button
            type="button"
            className="button button--outline"
            onClick={() => onTabChange(2)}
          >
            {t('see_guide')}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <ToastContainer />
      <BottomSheet
        isOpen={Boolean(detailCondition && (detail || detailBenefit))}
        onClose={handleConditionDetailClose}
        title={detailCondition ? (lang === 'en' ? detailCondition.name_en : detailCondition.name_fil) : ''}
      >
        {detailCondition && detail ? (
          <div className="condition-detail">
            {detailCondition.icd10 ? (
              <section className="condition-detail__section">
                <Card className="condition-detail__code-card">
                  <div className="condition-detail__code-row">
                    <div className="condition-detail__code-copy">
                      <span className="condition-detail__stat-label">{t('icd10_code')}</span>
                      <strong>{detailCondition.icd10}</strong>
                      {detailCondition.icd10_description ? (
                        <span className="muted-text">{detailCondition.icd10_description}</span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="helper-button"
                      onClick={() => void copyText(detailCondition.icd10)}
                      aria-label={`${t('copy')} ${detailCondition.icd10}`}
                    >
                      ⧉
                    </button>
                  </div>
                  <p className="muted-text">{t('icd10_note')}</p>
                </Card>
              </section>
            ) : null}

            <section className="condition-detail__section">
              <h3 className="tab-section__title">{t('symptoms')}</h3>
              <div className="chips-row condition-detail__symptoms">
                {(lang === 'en' ? detail.symptoms_en : detail.symptoms_fil).map((symptom) => (
                  <span key={symptom} className="tag condition-detail__symptom-tag">
                    {symptom}
                  </span>
                ))}
              </div>
            </section>

            <section className="condition-detail__section">
              <h3 className="tab-section__title">{t('what_is_it')}</h3>
              <p className="muted-text">
                {lang === 'en' ? detail.whatIsIt_en : detail.whatIsIt_fil}
              </p>
            </section>

            <section className="condition-detail__stats">
              <Card className="condition-detail__stat-card">
                <span className="condition-detail__stat-label">
                  {detailUsesVisitPatternStats ? t('typical_visit_pattern') : t('estimated_stay')}
                </span>
                <strong>{lang === 'en' ? detail.typicalStay_en : detail.typicalStay_fil}</strong>
              </Card>
              <Card className="condition-detail__stat-card">
                <span className="condition-detail__stat-label">
                  {detailUsesVisitPatternStats ? t('official_package_amount') : t('estimated_total_bill')}
                </span>
                <strong>{lang === 'en' ? detail.averageTotalBill_en : detail.averageTotalBill_fil}</strong>
              </Card>
            </section>

            {detailShowsEstimateNote ? (
              <p className="muted-text">{t('condition_detail_estimate_note')}</p>
            ) : null}

            <section className="condition-detail__section">
              <h3 className="tab-section__title">{t('when_to_go')}</h3>
              <Card className="condition-detail__compare-card">
                <div className="condition-detail__compare-row">
                  <span className="condition-detail__compare-label">{t('level_short', { level: 2 })}</span>
                  <p>{lang === 'en' ? detail.whenToGoLevel2_en : detail.whenToGoLevel2_fil}</p>
                </div>
                <div className="condition-detail__compare-row">
                  <span className="condition-detail__compare-label">{t('level_short', { level: 3 })}+</span>
                  <p>{lang === 'en' ? detail.whenToGoLevel3_en : detail.whenToGoLevel3_fil}</p>
                </div>
              </Card>
            </section>

            <section className="condition-detail__section">
              <h3 className="tab-section__title">{t('tips')}</h3>
              <div className="condition-detail__tips">
                {(lang === 'en' ? detail.tips_en : detail.tips_fil).map((tip) => (
                  <div key={tip} className="condition-detail__tip">
                    <span aria-hidden="true" style={{ color: 'var(--color-warning)' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    </span>
                    <p>{tip}</p>
                  </div>
                ))}
              </div>
            </section>

            <Card variant="warning" className="condition-detail__severity-card">
              <span className="condition-detail__stat-label">{t('severity_note')}</span>
              <p>{lang === 'en' ? detail.severityNote_en : detail.severityNote_fil}</p>
            </Card>

            <button
              type="button"
              className="button button--primary"
              onClick={handleConditionDetailSelect}
            >
              {t('select_this_condition')}
            </button>
          </div>
        ) : detailCondition && detailBenefit ? (
          <div className="condition-detail">
            <Card className="saved-card">
              <strong>{t('condition_detail_package_only_title')}</strong>
              <p>{t('condition_detail_package_only_body')}</p>
            </Card>

            {(lang === 'en' ? detailBenefit.coverageNote_en : detailBenefit.coverageNote_fil) ? (
              <Card className="saved-card">
                <strong>{t('coverage_note_title')}</strong>
                <p>{lang === 'en' ? detailBenefit.coverageNote_en : detailBenefit.coverageNote_fil}</p>
              </Card>
            ) : null}

            {detailBenefit.requiresPreAuth ? (
              <Card variant="warning" className="saved-card">
                <strong>{t('preauth_title')}</strong>
                <p>{lang === 'en' ? detailBenefit.preAuthNote_en : detailBenefit.preAuthNote_fil}</p>
              </Card>
            ) : null}

            {renderCoverageVariants(detailBenefit)}
            {renderSourceUsedCard(detailBenefit)}

            {(lang === 'en'
              ? detailBenefit.packageAccreditationNote_en
              : detailBenefit.packageAccreditationNote_fil) ? (
              <Card variant="warning" className="saved-card">
                <strong>{t('package_accreditation_title')}</strong>
                <p>
                  {lang === 'en'
                    ? detailBenefit.packageAccreditationNote_en
                    : detailBenefit.packageAccreditationNote_fil}
                </p>
              </Card>
            ) : null}

            <button
              type="button"
              className="button button--primary"
              onClick={handleConditionDetailSelect}
            >
              {t('select_this_condition')}
            </button>
          </div>
        ) : null}
      </BottomSheet>
      {view === 'result' ? (
        renderResultView()
      ) : (
        <div className="tab-screen intake-tab">
          {currentStep > 0 && summaryItems.length ? (
            <div className="summary-strip">
              {summaryItems.map((item) => (
                <button
                  key={`${item.step}-${item.label}`}
                  type="button"
                  className="summary-strip__item"
                  onClick={() => setCurrentStep(item.step)}
                >
                  <span className="summary-strip__label">{item.label}</span>
                  <span className="summary-strip__value">{item.value}</span>
                </button>
              ))}
            </div>
          ) : null}

          {renderQuestionContent()}
        </div>
      )}
    </>
  );
}
