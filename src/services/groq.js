import { pickLocale } from '../utils/localize';
import conditions from '../data/conditions.json';
import conditionDetails from '../data/condition_details.json';
import benefits from '../data/benefits.json';
import philhealthSources from '../data/philhealth_sources.json';
import financialAssistance from '../data/financial_assistance.json';
import documentsData from '../data/documents.json';
import claimDenialData from '../data/claim_denial.json';
import reimbursementData from '../data/reimbursement.json';
import billingScripts from '../data/scripts.json';
import medicines from '../data/medicines.json';
import konsultaData from '../data/konsulta.json';
import rhuServices from '../data/rhu_services.json';
import { getCoverage, getZBBStatus } from '../engine/coverage';
import { evaluateUrgencyTriage } from '../engine/urgencyTriage';
import { checkForbiddenPatterns, validateAIResponse } from '../engine/validator';

const GROQ_PROXY_URL = '/api/groq/chat';
const GROQ_STATUS_URL = '/api/groq/status';
const MODEL = 'llama-3.3-70b-versatile';
let groqStatusCache = null;
let groqStatusPromise = null;

const KNOWLEDGE_BASE = `## MEMBERSHIP TYPES AND SPECIAL RULES

EMPLOYED (SSS/GSIS):
- Requires 3 months contributions in last 6 months
- CRITICAL: Employer must be current on remittance. If employer hasn't remitted, claim may be denied even if salary was deducted.
- How to check: memberinquiry.philhealth.gov.ph/member/ -> Contribution History
- If denied due to employer fault: file complaint with PhilHealth; employer is liable, not the member

VOLUNTARY/SELF-EMPLOYED:
- Requires 3 months contributions in last 6 months
- Most common denial reason: lapsed voluntary contributions
- Must check MDR before admission

OFW:
- Fixed annual contribution
- Dependents in PH can claim on member's behalf
- Member can claim if physically present in PH

NHTS/INDIGENT/4Ps:
- No contribution required - fully government subsidized
- Entitled to No Balance Billing (NBB) at ALL government hospitals
- Should go to Malasakit Center immediately upon admission for potential zero copay

SPONSORED (LGU-subsidized):
- No contribution required from member
- Entitled to NBB at government hospitals

SENIOR CITIZENS (60+):
- Automatic lifetime coverage under RA 10645
- No contribution required
- DUAL BENEFIT: 20% senior citizen discount (RA 9994) ON TOP of PhilHealth case rate
- Both apply simultaneously - always mention both when senior is the patient

LIFETIME MEMBERS (120+ months):
- No further contributions required
- Entitled to NBB at government hospitals
- Must show Lifetime Member ID at admitting

PWD:
- 20% discount on medicines and services (RA 10754) ON TOP of PhilHealth
- Both apply simultaneously

KASAMBAHAY:
- Employer pays contribution
- Entitled to NBB at government hospitals

## ZERO BALANCE BILLING (ZBB) - 2025 POLICY (MOST IMPORTANT UPDATE)

DOH HOSPITALS + WARD ACCOMMODATION:
- ALL PhilHealth members pay ZERO out-of-pocket
- Covers EVERYTHING: operations, medicines, laboratory, professional fees
- No need to be indigent - this applies to ALL members
- 87 DOH-retained hospitals nationwide
- CRITICAL CONDITION: Must be in WARD (shared room) accommodation
- If patient upgrades to private room: regular PhilHealth with co-pay applies

NO BALANCE BILLING (NBB) - GOVERNMENT HOSPITALS:
- Applies to: Indigent, Sponsored, Senior Citizens, Lifetime Members, Kasambahay
- At ALL accredited government hospitals (not just DOH)
- Zero out-of-pocket for covered services
- Exception: if patient requests private doctor or private room, charges may apply

PRIVATE HOSPITALS:
- ZBB does NOT apply
- NBB applies only if the private hospital voluntarily joined the NBB program
- Regular PhilHealth case rate with co-pay is the norm

## CASE RATES (2025 - VERIFIED SELECTED EXAMPLES)
- CAP III / moderate-risk pneumonia: PHP 29,250
- Dengue without warning signs / with warning signs: PHP 19,500
- Hypertension: PHP 17,550
- Appendectomy: PHP 46,800
- Cholecystectomy: PHP 60,450
- CS: PHP 19,000 (Level 1-2), PHP 21,900 (Level 3-4)
- NSD: PHP 6,500 (Level 1-2), PHP 8,000 (Level 3-4)
- PhilHealth pays the LESSER of: (a) the published case rate, or (b) the actual hospital bill. If a patient's total bill is PHP 10,000 but the case rate is PHP 29,250, PhilHealth pays PHP 10,000. Always clarify this when citing coverage amounts.

AMI (Heart Attack) - MAJOR 2024 UPDATE:
- PCI (Coronary Angioplasty): PHP 524,000 (increased from PHP 30,300 in December 2024)
- Fibrinolysis: PHP 133,500
- Emergency Medical Services + Transfer: PHP 21,900
- Cardiac Rehabilitation: PHP 66,140
- Correct package depends on actual treatment performed

BREAST CANCER - Z-Benefit:
- Up to PHP 1.4 million (expanded 2024)
- Requires pre-authorization (hospital applies, takes 7 working days)
- Emergency: hospital has 72 hours to apply retroactively

SPECIALIZED PACKAGE ACCREDITATION:
- General PhilHealth accreditation does NOT always mean a hospital is contracted for every Z-benefit or specialty package
- For Z-benefits, transplant, and other specialty workflows: always verify that the facility is a current contracted health facility for that exact package
- If unsure, tell the user to ask the hospital's PhilHealth coordinator before admission

## BENEFIT LIMITS
- Former 45-day annual confinement limit: already lifted under PhilHealth Circular 2025-0007
- Former Single Period of Confinement rule: no longer in effect for acute-condition readmissions under PhilHealth Circular 2025-0015, effective October 1, 2024
- Hemodialysis: 156 sessions per year maximum (updated July 1, 2024 under Circular 2024-0014)
- Maternity: 1 claim per year

## KONSULTA PACKAGE (OUTPATIENT - ALL MEMBERS)
- All active PhilHealth members entitled to FREE outpatient services at accredited Konsulta providers
- Services: primary care consultations, 14 selected lab tests (CBC, urinalysis, FBS, chest X-ray, ECG, lipid profile, creatinine, SGPT, uric acid, stool exam, sputum AFB, pap smear, pregnancy test, HIV screening)
- Medicines: 53 generic medicines covered (hypertension, diabetes, cholesterol, asthma, UTI, pain/fever, skin)
- Dental (NEW 2025, Circular 2024-0034): up to PHP 1,000/year - oral screening, cleaning, fluoride, pit sealants, emergency extraction
- How to access: register with accredited Konsulta provider -> get ATC -> present at every visit
- Find provider: philhealth.gov.ph/konsulta
- This is SEPARATE from hospitalization benefits - outpatient only
- Capitation rate: PHP 1,700/year paid to provider (member pays nothing at government providers)

## DEPENDENT ELIGIBILITY
- Legal spouse: covered
- Children under 21: covered (legitimate or illegitimate)
- Disabled children: covered with NO age limit
- Foster children: NOW covered (Circular 2024-0031)
- Parents 60+: covered if dependent on member
- Siblings: NOT covered
- CRITICAL: Dependents must be listed in member's MDR before claiming. Can be updated at hospital in emergencies.
- DEPENDENT MDR REGISTRATION: Dependents must be listed in the member's PhilHealth MDR before admission for claims to be approved. In emergencies, the MDR can be updated at the hospital before discharge. The hospital's PhilHealth coordinator can assist with on-site MDR updates.

## PHYSICIAN ACCREDITATION
- Professional fee (30% of case rate) is covered ONLY if physician is PhilHealth-accredited
- If not accredited: PhilHealth pays 70% (hospital fee) only; patient pays 30% professional fee out of pocket
- Recommended: ask if your assigned doctor is PhilHealth-accredited at admitting
- Check physician accreditation: philhealth.gov.ph/about/phps

## DIRECT FILING VS REIMBURSEMENT
- If the condition has a case rate AND the hospital is PhilHealth-accredited: hospital MUST process direct filing.
- Patient pays only the co-pay (total bill minus PhilHealth amount).
- If hospital says "bayad muna, i-reimburse na lang" for a direct filing case: this is a violation.
- Patient should: ask for the PhilHealth coordinator, cite the circular number, and if refused, call PhilHealth hotline (02) 866-225-88.
- Non-accredited hospitals: no direct filing, patient pays full amount and can reimburse.
- Reimbursement deadline: 60 DAYS from discharge - missing this forfeits the claim
- Can file online: memberinquiry.philhealth.gov.ph/member/

## HMO + PHILHEALTH (COMMON QUESTION)
Many employed Filipinos have both PhilHealth and an HMO from their employer.
They work TOGETHER, not separately:
1. PhilHealth pays its case rate FIRST (direct filing)
2. HMO tops up the remaining balance (co-pay) up to HMO limits
3. Patient pays any remaining balance after both PhilHealth and HMO apply

So: Total Bill -> minus PhilHealth case rate -> minus HMO coverage -> patient pays remainder

Example: PHP 50,000 bill for CAP III / moderate-risk pneumonia
- PhilHealth pays PHP 29,250 (direct filing)
- HMO covers PHP 25,000 (up to their limit)
- Patient pays the remaining balance after both PhilHealth and HMO apply

IMPORTANT: Always use PhilHealth even if you have HMO. They are complementary.
If HMO says "we'll handle everything, don't use PhilHealth" - insist on using both.
The hospital processes PhilHealth first, then HMO.

For reimbursement cases: PhilHealth reimburses to member; HMO reimburses separately per their process.

## EPHILHEALTH PORTAL (memberinquiry.philhealth.gov.ph/member/)
What members can do online:
1. Check contribution history - see if 3-month requirement is met
2. Print MDR (Member Data Record) - needed for hospital admission
3. Update dependents - add spouse, children, parents to MDR
4. File reimbursement claim online - for out-of-pocket cases
5. Check claim status - track filed claims
6. Pay contributions - for voluntary members

How to access:
- URL: memberinquiry.philhealth.gov.ph/member/
- Login: PhilHealth number + password (register if first time)
- Mobile-friendly - can be accessed on phone

Common issues:
- "Account not found": use PhilHealth ID number, not SSS/GSIS number
- Contribution not posted: employer may not have remitted; contact HR
- Can't update dependents online: go to nearest PhilHealth office with supporting documents

Always mention this URL when user needs to check contributions, print MDR, or file online reimbursement.

## CLAIM DENIALS AND APPEALS
- Common denial reasons: hospital not accredited, 3-month contribution rule not met, dependent not listed in MDR, incomplete documents, late reimbursement filing, duplicate claim, no case rate, employer failed to remit
- If claim is denied, first step is a Motion for Reconsideration (MR) within 60 days from the denial notice at the PhilHealth Regional Office covering the hospital
- If MR is denied, appeal to PARD within 15 days
- If PARD denies, appeal to the PhilHealth Board within 15 days
- 2025 update: PhilHealth is reprocessing 1.1 million denied claims from January 1, 2018 to December 31, 2024 that were denied due to late filing; hospitals have a 6-month resubmission window
- If employer failed to remit contributions, employer is liable - not the member

## GUARANTEE LETTERS (BANNED AS OF 2026)
- Guarantee letters from PhilHealth are now PROHIBITED under the 2026 General Appropriations Act
- Hospitals CANNOT require guarantee letters as a prerequisite for PhilHealth-covered treatment
- If a hospital asks for a guarantee letter: inform them it is now illegal, cite the GAA 2026
- Patient's rights: demand immediate treatment with PhilHealth coverage based on MDR + claim forms only
- If hospital insists: call PhilHealth hotline (02) 866-225-88 immediately

## MALASAKIT CENTER
- Available at most DOH-retained hospitals and major LGU hospitals
- For indigent/NHTS patients: combines PhilHealth + PCSO + DSWD + DOH funds
- Goal: ZERO out-of-pocket for indigent patients
- Go there FIRST upon admission, before going to billing
- No guarantee letters needed (prohibited under 2026 budget law)

## BILLING VIOLATIONS - RED FLAGS
1. "Bayad muna, i-reimburse na lang" for direct filing cases = VIOLATION
2. Charging PhilHealth portion to NBB-eligible patient in government hospital = VIOLATION
3. Charging any amount to patient in DOH hospital ward = VIOLATION (ZBB policy)
4. Physician not PhilHealth-accredited but billing professional fee to PhilHealth = VIOLATION
5. Refusing to accept PhilHealth documents at accredited hospital = VIOLATION
6. Adding unauthorized charges beyond the itemized SOA = CHECK CAREFULLY

## YOUR BEHAVIOR
1. Always respond in the same language the user writes in (Filipino, English, Taglish, or Cebuano/Bisaya)
2. Be SPECIFIC - give exact peso amounts, not vague "PhilHealth will cover a portion"
3. For stressed users at a billing counter: skip pleasantries, give the script immediately
4. Always mention ZBB when user is at a DOH hospital in ward accommodation
5. Always mention the dual benefit (PhilHealth + senior discount / PhilHealth + PWD discount) when applicable
6. For NBB-eligible members in government hospitals: remind them they should pay ZERO
7. For any billing violation: be assertive, give exact words to say, give PhilHealth hotline (02) 866-225-88
8. Remind users to verify amounts with hospital - rates can change
9. No medical advice - redirect to doctor for medical decisions
10. Mention memberinquiry.philhealth.gov.ph/member/ for contribution checks and online reimbursement`;

const CHAT_SYSTEM_PROMPT = `You are KoberKo's AI companion for healthcare navigation in the Philippines.

Follow these rules exactly:
1. Reply in the exact language style of the user's most recent message only: English, Filipino, Cebuano/Bisaya, or Taglish. Never switch languages unless the user switches first.
2. Sound calm, warm, and human. You are a knowledgeable Filipino companion, not a hotline, memo, or robot.
3. If the user's message sounds stressed, afraid, or frustrated, start with one short sentence of emotional acknowledgment before the practical answer.
4. Stay strictly within KoberKo scope: PhilHealth benefits, hospital admission and billing guidance, urgency triage, RHU/primary care, Konsulta, medicines, financial assistance, documents, reimbursement, and claim denial.
5. If the message is outside that scope, redirect warmly and offer help within scope.
6. Use KoberKo local dataset blocks as the only factual source. Do not use outside memory, training knowledge, or online facts.
7. If the dataset block does not contain a specific amount, rule, or source, say that clearly and tell the user to verify with PhilHealth or the hospital.
8. Never invent PhilHealth amounts, coverage rules, package details, policy updates, or source citations.
9. Never diagnose a disease. For symptom questions, guide toward urgency triage or the Intake symptom flow instead.
10. If Intake context exists, use it in every relevant answer. Do not ask the user to repeat details already present in context.
11. If no Intake context exists and the question is situation-specific, billing-specific, coverage-specific, or document-specific, tell the user to start with Intake first so you can answer accurately.
12. Keep replies short and scannable. No bullet dumps unless the user truly needs a step list. Lead with what to do now.
13. Every factual claim must cite the KoberKo dataset source in the same sentence or immediately after it. If no explicit source is stored, say that KoberKo's current dataset has no exact citation for that point and advise verification.
14. If you use jargon or abbreviations like NBB, ZBB, MDR, NHTS, case rate, or direct filing, explain them briefly in plain language the first time you mention them.
15. If the user asks about billing disputes, overcharging, or what to say at the billing counter, proactively surface the billing script or the next billing line to say.
16. If the user mentions affordability problems, immediately explain Malasakit Center, PCSO MAP, and DSWD AICS using the supplied dataset.
17. If the user says the claim was denied, help them identify the most likely denial reason from the supplied dataset and give the next concrete step.
18. Membership-aware answers are mandatory when membership is known.
19. For sensitive topics involving coverage amounts, PhilHealth rules, or patient-rights guidance, end with a one-line verification reminder.
20. End every reply with one clear next-step question or follow-up offer.

Formatting rules:
- Maximum 3 short paragraphs.
- No markdown headings.
- No bullets unless a short numbered list is genuinely needed.
- Mention the source naturally, not as a footnote dump.
- If the user wrote in Filipino, use po/opo naturally.
- If the user wrote in Cebuano/Bisaya, keep the whole reply in natural conversational Cebuano/Bisaya.`;

const SYMPTOM_MATCH_SYSTEM_PROMPT = `You map symptom text to the closest KoberKo-covered condition IDs.

Rules:
- Return JSON only.
- Do not diagnose.
- Choose only from the provided condition IDs.
- Keep reasons short and non-diagnostic.`;

export function hasGroqApiKey() {
  return groqStatusCache === true;
}

export async function getGroqStatus(forceRefresh = false) {
  if (!forceRefresh && groqStatusCache !== null) {
    return groqStatusCache;
  }

  if (!forceRefresh && groqStatusPromise) {
    return groqStatusPromise;
  }

  groqStatusPromise = (async () => {
    try {
      const response = await fetch(GROQ_STATUS_URL, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        groqStatusCache = false;
        return false;
      }

      const payload = await response.json();
      groqStatusCache = Boolean(payload?.configured);
      return groqStatusCache;
    } catch {
      groqStatusCache = false;
      return false;
    } finally {
      groqStatusPromise = null;
    }
  })();

  return groqStatusPromise;
}

function normalize(text = '') {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function localizeFromProfile(profile, entry, fieldBase) {
  if (!entry) {
    return '';
  }

  return pickLocale(
    entry[`${fieldBase}_en`] ?? entry[fieldBase],
    entry[`${fieldBase}_fil`] ?? entry[fieldBase],
    entry[`${fieldBase}_ceb`] ?? entry[fieldBase],
    profile?.lang || 'fil',
  );
}

function getBenefitEntry(conditionId) {
  return conditionId ? benefits[conditionId] ?? null : null;
}

function getSourceEntryForCondition(conditionId, circular = '') {
  const sources = Array.isArray(philhealthSources?.sources) ? philhealthSources.sources : [];
  return sources.find((source) => source.circular === circular)
    || sources.find((source) => Array.isArray(source.conditionsAffected) && source.conditionsAffected.includes(conditionId))
    || null;
}

function getScriptEntry(conditionId) {
  return conditionId ? billingScripts[conditionId] ?? null : null;
}

function getChecklistItems(coverage) {
  const key = coverage?.packageCategory || coverage?.packageType;
  return key && documentsData[key] ? documentsData[key] : [];
}

function normalizeLanguageInput(text = '') {
  return ` ${normalize(text).replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
}

function scoreLanguageSignals(text, signals = []) {
  return signals.reduce((total, signal) => {
    const phrase = typeof signal === 'string' ? signal : signal.term;
    const weight = typeof signal === 'string' ? 1 : signal.weight;
    return total + (text.includes(` ${phrase} `) ? weight : 0);
  }, 0);
}

function detectLanguageProfile(userMessage = '', history = []) {
  const message = typeof userMessage === 'string' ? userMessage : '';
  const normalized = normalizeLanguageInput(message);

  if (!normalized.trim()) {
    return { lang: 'fil', style: 'fil' };
  }

  const englishSignals = [
    { term: 'how', weight: 2 }, { term: 'what', weight: 2 }, { term: 'where', weight: 2 },
    { term: 'when', weight: 2 }, { term: 'why', weight: 2 }, { term: 'can i', weight: 3 },
    { term: 'can we', weight: 3 }, { term: 'need', weight: 2 }, { term: 'billing', weight: 2 },
    { term: 'documents', weight: 2 }, { term: 'coverage', weight: 2 }, { term: 'claim', weight: 2 },
    { term: 'hospital', weight: 1 }, { term: 'please', weight: 1 }, { term: 'help', weight: 1 },
    { term: 'our', weight: 1 }, { term: 'case', weight: 1 }, { term: 'direct filing', weight: 2 },
  ];
  const filipinoSignals = [
    { term: 'paano', weight: 3 }, { term: 'ano', weight: 2 }, { term: 'saan', weight: 2 },
    { term: 'kailan', weight: 2 }, { term: 'bakit', weight: 2 }, { term: 'magkano', weight: 3 },
    { term: 'pwede', weight: 2 }, { term: 'po', weight: 2 }, { term: 'opo', weight: 2 },
    { term: 'namin', weight: 2 }, { term: 'kami', weight: 1 }, { term: 'bill', weight: 1 },
    { term: 'singil', weight: 2 }, { term: 'ospital', weight: 2 }, { term: 'gagawin', weight: 2 },
  ];
  const cebuanoSignals = [
    { term: 'unsa', weight: 3 }, { term: 'giunsa', weight: 4 }, { term: 'unsaon', weight: 4 },
    { term: 'ngano', weight: 3 }, { term: 'kanus a', weight: 3 }, { term: 'pilay', weight: 4 },
    { term: 'mahimo ba', weight: 4 }, { term: 'tabang', weight: 2 }, { term: 'bayran', weight: 3 },
    { term: 'karon', weight: 2 }, { term: 'dili', weight: 2 }, { term: 'naa', weight: 2 },
    { term: 'kahibalo', weight: 2 }, { term: 'aduna', weight: 2 }, { term: 'imong', weight: 2 },
    { term: 'amo', weight: 1 }, { term: 'namo', weight: 2 }, { term: 'susiha', weight: 2 },
  ];

  const englishScore = scoreLanguageSignals(normalized, englishSignals);
  const filipinoScore = scoreLanguageSignals(normalized, filipinoSignals);
  const cebuanoScore = scoreLanguageSignals(normalized, cebuanoSignals);

  if (cebuanoScore > englishScore && cebuanoScore > filipinoScore) {
    return { lang: 'ceb', style: 'ceb' };
  }

  if (filipinoScore > 0 && englishScore > 0) {
    return { lang: 'fil', style: 'taglish' };
  }

  if (englishScore > filipinoScore) {
    return { lang: 'en', style: 'en' };
  }

  if (filipinoScore > 0) {
    return { lang: 'fil', style: 'fil' };
  }

  for (let index = history.length - 1; index >= 0; index -= 1) {
    const item = history[index];
    if (item?.role !== 'user') {
      continue;
    }
    return detectLanguageProfile(item.content || '', []);
  }

  return { lang: 'fil', style: 'fil' };
}

function detectReplyLanguage(userMessage = '', history = []) {
  return detectLanguageProfile(userMessage, history).lang;
}

function hasAnyTerm(text = '', terms = []) {
  const normalized = normalize(text);
  return terms.some((term) => normalized.includes(normalize(term)));
}

function isClearlyOutOfScope(userMessage = '') {
  const normalized = normalize(userMessage);
  const outOfScopeTerms = [
    'boyfriend', 'girlfriend', 'relationship', 'zodiac', 'horoscope', 'capital of',
    'movie', 'lyrics', 'homework answer', 'recipe', 'sports score', 'weather',
  ];
  return outOfScopeTerms.some((term) => normalized.includes(term));
}

function detectStress(userMessage = '') {
  return hasAnyTerm(userMessage, [
    'hindi ko na alam', 'sobrang mahal', 'tinanggihan kami', 'na-deny', 'di ko na alam',
    'nakakastress', 'nakaka-stress', 'natatakot', 'takot', 'di kaya', 'hindi kaya',
    'dili na nako', 'mahal kaayo', 'gibalibaran', 'nahadlok', 'lisod kaayo',
    'we are scared', 'too expensive', 'we cannot afford', 'denied us',
  ]);
}

function detectIntent(userMessage = '', context = null) {
  const normalized = normalize(userMessage);

  if (hasAnyTerm(normalized, [
    'where do you get your information',
    'where do you get your data',
    'where does this come from',
    'from philhealth data',
    'from philhealth or what',
    'source',
    'citation',
    'saan galing',
    'pinanggalingan',
    'san galing',
    'gikan asa',
    'asa gikan',
    'diin gikan',
  ])) {
    return 'source';
  }
  if (hasAnyTerm(normalized, [
    "i'll start with intake",
    'i will start with intake',
    'start with intake',
    'start with the intake',
    'mag intake muna',
    'mag-intake muna',
    'intake muna',
    'sige intake muna',
    'sugdan nako ang intake',
    'mag sugod ko sa intake',
  ])) {
    return 'intake_start';
  }
  if (hasAnyTerm(normalized, ['malasakit', 'pcso', 'dswd', 'aics', 'cannot afford', 'cant afford', 'di kaya', 'hindi kaya', 'hindi na namin kaya', 'dili kaya', 'sobrang mahal', 'remaining bill', 'natitirang bill'])) {
    return 'financial_help';
  }
  if (hasAnyTerm(normalized, ['claim denied', 'na deny', 'na-deny', 'denied claim', 'motion for reconsideration', 'pard', 'appeal'])) {
    return 'claim_denied';
  }
  if (hasAnyTerm(normalized, ['reimburse', 'reimbursement', '60 days', 'official receipt', 'soa', 'discharge summary']) && !hasAnyTerm(normalized, ['malasakit', 'pcso', 'dswd'])) {
    return 'reimbursement';
  }
  if (hasAnyTerm(normalized, ['billing', 'overcharge', 'overcharged', 'singil', 'bayad muna', 'direct filing', 'billing counter', 'what do i say', 'unsay isulti', 'script'])) {
    return 'billing';
  }
  if (hasAnyTerm(normalized, ['documents', 'documento', 'mga dokumento', 'cf1', 'cf2', 'mdr', 'statement of account', 'soa', 'official receipt'])) {
    return 'documents';
  }
  if (hasAnyTerm(normalized, ['konsulta'])) {
    return 'konsulta';
  }
  if (hasAnyTerm(normalized, ['rhu', 'health center', 'barangay health station', 'bhs', 'primary care'])) {
    return 'rhu';
  }
  if (hasAnyTerm(normalized, ['medicine', 'gamot', 'tambal', 'generic', 'prescription', 'reseta'])) {
    return 'medicine';
  }
  if (hasAnyTerm(normalized, ['symptom', 'lagnat', 'hilanat', 'ubo', 'sipon', 'hirap huminga', 'difficulty breathing', 'chest pain', 'nanghihina', 'weakness'])) {
    return 'urgency';
  }
  if (hasAnyTerm(normalized, ['eligible', 'eligibility', 'kwalipikado', 'contribution', 'hulog', 'membership'])) {
    return context ? 'eligibility' : 'context_required';
  }
  if (hasAnyTerm(normalized, ['coverage', 'magkano', 'amount', 'how much', 'case rate', 'copay', 'co-pay', 'philhealth pays', 'benefit'])) {
    return context ? 'coverage' : 'context_required';
  }

  return 'general';
}

function needsIntakeContext(intent) {
  return ['context_required', 'coverage', 'billing', 'documents', 'eligibility'].includes(intent);
}

function buildEmotionalLead(profile) {
  if (profile.lang === 'ceb') {
    return 'Lisod gyud ni nga sitwasyon. Tabangan tika.';
  }
  if (profile.lang === 'en') {
    return "That sounds really stressful. I'll help you through it.";
  }
  if (profile.style === 'taglish') {
    return 'Nakaka-stress talaga ito. Tulungan kita.';
  }
  return 'Nakakastress talaga ito. Tulungan ko po kayo.';
}

function buildContextInjection(context) {
  if (!context) {
    return '';
  }

  const lines = [
    context.scenario ? `Scenario: ${context.scenario}` : '',
    context.claimOutcome ? `Claim outcome: ${context.claimOutcome}` : '',
    context.conditionName ? `Condition: ${context.conditionName}` : '',
    context.conditionId ? `Condition ID: ${context.conditionId}` : '',
    context.memberType ? `Member type: ${context.memberType}` : '',
    context.hospitalLevel ? `Hospital level: ${context.hospitalLevel}` : '',
    context.hospitalType ? `Hospital type: ${context.hospitalType}` : '',
    context.roomType ? `Room type: ${context.roomType}` : '',
    context.hospitalName ? `Hospital name: ${context.hospitalName}` : '',
    context.patientAge !== '' && context.patientAge !== null && context.patientAge !== undefined
      ? `Patient age: ${context.patientAge}`
      : '',
    context.patientRelationship ? `Patient relationship: ${context.patientRelationship}` : '',
    context.coverageAmount ? `Coverage amount: PHP ${context.coverageAmount}` : '',
    typeof context.directFiling === 'boolean'
      ? `Direct filing: ${context.directFiling ? 'Yes' : 'No'}`
      : '',
    context.circular ? `Circular: ${context.circular}` : '',
    context.variantUsed ? `Variant used: ${context.variantUsed}` : '',
    context.symptomDescription ? `Symptoms or free-text context: ${context.symptomDescription}` : '',
  ].filter(Boolean);

  if (!lines.length) {
    return '';
  }

  return `Current KoberKo context:\n${lines.map((line) => `- ${line}`).join('\n')}`;
}

function buildGroundedMessage(userMessage, context, profile, datasetBlock = '') {
  if (!context || !context.conditionId || !context.memberType || !context.hospitalLevel) {
    return datasetBlock ? `${datasetBlock}\n\nUser message: ${userMessage}` : userMessage;
  }

  const coverage = getCoverage(
    context.conditionId,
    context.memberType,
    context.hospitalLevel,
    { variantKey: context.coverageVariantKey || undefined },
  );
  const benefit = getBenefitEntry(context.conditionId);
  const source = getSourceEntryForCondition(context.conditionId, coverage?.circular || benefit?.circular || '');

  const lines = [
    '[KOBERKO CASE DATA]',
    `Condition ID: ${context.conditionId}`,
    `Condition name: ${context.conditionName || coverage?.conditionName_en || benefit?.packageName_en || 'Unknown'}`,
    `Membership: ${context.memberType}`,
    `Hospital level: ${context.hospitalLevel}`,
    `Hospital type: ${context.hospitalType || 'UNKNOWN'}`,
    `Room type: ${context.roomType || 'UNKNOWN'}`,
    coverage ? `PhilHealth amount: PHP ${coverage.amount.toLocaleString()}` : 'PhilHealth amount: no exact amount resolved from context',
    coverage ? `Direct filing: ${coverage.directFiling ? 'YES' : 'NO'}` : '',
    coverage?.variantUsed_en ? `Package variant: ${coverage.variantUsed_en}` : '',
    source?.circular ? `Source: ${source.circular}${source.title ? ` — ${source.title}` : ''}` : benefit?.circular ? `Source: ${benefit.circular}` : 'Source: no exact citation stored for this case data',
    coverage?.coverageNote_en ? `Coverage note: ${localizeFromProfile(profile, coverage, 'coverageNote')}` : '',
    benefit?.membershipOverrides?.[context.memberType]?.eligibilityNote_en
      ? `Membership note: ${localizeFromProfile(profile, benefit.membershipOverrides[context.memberType], 'eligibilityNote')}`
      : '',
    '[END KOBERKO CASE DATA]',
  ].filter(Boolean);

  const sections = [lines.join('\n')];
  if (datasetBlock) {
    sections.push(datasetBlock);
  }
  sections.push(`User message: ${userMessage}`);
  return sections.join('\n\n');
}

function extractCurrencyAmount(text = '') {
  const match = text.replace(/,/g, '').match(/(\d{1,7})(?:\.\d{1,2})?/);
  return match ? Number(match[1]) : null;
}

function isAffirmative(text = '') {
  const normalized = normalize(text).trim();
  return ['yes', 'oo', 'opo', 'sige', 'yes i wanna know', 'yes, i wanna know'].includes(normalized);
}

function buildAuthoritativeFacts(context, userMessage, profile) {
  const derivedCondition = context?.conditionId
    ? conditions.find((condition) => condition.id === context.conditionId)
    : null;
  const conditionId = derivedCondition?.id ?? context?.conditionId ?? '';
  const memberType = context?.memberType ?? '';
  const hospitalLevel = context?.hospitalLevel ?? '';
  const hospitalType = context?.hospitalType ?? '';
  const roomType = context?.roomType ?? '';

  const coverage = conditionId && memberType && hospitalLevel
    ? getCoverage(conditionId, memberType, hospitalLevel, {
        variantKey: context?.coverageVariantKey || undefined,
      })
    : null;
  const zbbStatus = memberType && hospitalType && roomType
    ? getZBBStatus(memberType, hospitalType, roomType)
    : null;

  const lines = [];

  if (derivedCondition) {
    lines.push(`Resolved condition: ${derivedCondition.name_en} (${derivedCondition.id})`);
  }

  if (coverage) {
    lines.push(`Authoritative KoberKo amount: PHP ${coverage.amount}`);
    lines.push(`Authoritative package name: ${coverage.packageName_en}`);
    lines.push(`Authoritative package category: ${coverage.packageCategory}`);
    lines.push(`Authoritative direct filing: ${coverage.directFiling ? 'Yes' : 'No'}`);
    lines.push(`Authoritative circular: ${coverage.circular}`);
    if (coverage.variantUsed_en) {
      lines.push(`Authoritative variant used: ${coverage.variantUsed_en}`);
    }
    if (coverage.lastReviewed) {
      lines.push(`Authoritative last reviewed: ${coverage.lastReviewed}`);
    }
    if (coverage.effectiveDate) {
      lines.push(`Authoritative effective date: ${coverage.effectiveDate}`);
    }
    lines.push(`Authoritative co-pay range: PHP ${coverage.copayMin} to PHP ${coverage.copayMax}`);
    const source = getSourceEntryForCondition(conditionId, coverage.circular);
    if (source?.title) {
      lines.push(`Authoritative source title: ${source.title}`);
    }
    if (source?.url) {
      lines.push(`Authoritative source URL: ${source.url}`);
    }
    if (coverage.requiresPreAuth) {
      lines.push('Authoritative pre-authorization required: Yes');
    }
  } else if (derivedCondition) {
    lines.push('Authoritative note: KoberKo has a matching condition, but member type or hospital level is missing, so do not invent an exact amount.');
  }

  if (zbbStatus) {
    lines.push(`Authoritative ZBB/NBB status: ${zbbStatus.zbbType}`);
    lines.push(`Authoritative patient payment status: ${zbbStatus.zbbApplies ? 'Zero out-of-pocket may apply' : 'Regular PhilHealth co-pay rules apply'}`);
  }

  if (!lines.length) {
    return '';
  }

  return `Authoritative KoberKo facts - these override memory and guesses:\n${lines.map((line) => `- ${line}`).join('\n')}`;
}

function buildRecentConversationFocus(history = []) {
  const recent = history
    .slice(-4)
    .filter((item) => item && typeof item.content === 'string')
    .map((item) => `${item.role === 'assistant' ? 'Assistant' : 'User'}: ${item.content.trim()}`)
    .filter((line) => line.length > 0);

  if (!recent.length) {
    return '';
  }

  return `Recent conversation focus:\n${recent.join('\n')}`;
}

function buildSourceLine(profile, sources = [], options = {}) {
  const cleaned = [...new Set(sources.filter(Boolean))];
  if (!cleaned.length) {
    if (options.allowDatasetOnly) {
      if (profile.lang === 'ceb') {
        return "Ang kasamtangang dataset sa KoberKo walay eksaktong source citation para ani nga bahin, busa palihog i-verify kini direkta sa PhilHealth o sa imong ospital.";
      }
      if (profile.lang === 'en') {
        return "KoberKo's current dataset does not store an exact source citation for this point, so please verify it directly with PhilHealth or your hospital.";
      }
      return profile.style === 'taglish'
        ? "Walang exact source citation na naka-store sa current KoberKo dataset para sa part na ito, kaya paki-verify pa rin direkta sa PhilHealth o sa ospital."
        : 'Wala pong eksaktong source citation na naka-store sa current KoberKo dataset para sa part na ito, kaya paki-verify pa rin ito direkta sa PhilHealth o sa ospital.';
    }
    return '';
  }

  const joined = cleaned.join('; ');
  if (profile.lang === 'ceb') {
    return `Base kini sa datos sa KoberKo nga gikuha gikan sa ${joined}.`;
  }
  if (profile.lang === 'en') {
    return `This is based on KoberKo data sourced from ${joined}.`;
  }
  return profile.style === 'taglish'
    ? `Batay ito sa datos ng KoberKo na kinuha mula sa ${joined}.`
    : `Batay po ito sa datos ng KoberKo na kinuha mula sa ${joined}.`;
}

function buildVerificationReminder(profile) {
  if (profile.lang === 'ceb') {
    return 'Para sa pinakatukmang impormasyon, i-verify kini sa opisyal nga PhilHealth portal o sa pinakaduol nga PhilHealth office.';
  }
  if (profile.lang === 'en') {
    return 'For the most accurate information, verify this with the official PhilHealth portal or the nearest PhilHealth office.';
  }
  return 'Para sa pinaka-tumpak na impormasyon, i-verify ito sa opisyal na PhilHealth portal o sa pinakamalapit na PhilHealth office.';
}

function buildNextStepOffer(profile, intent, context = null) {
  const hasContext = Boolean(context?.conditionId);
  if (intent === 'intake_start') {
    if (profile.lang === 'ceb') return 'Ablihi ang Intake ug pilia ang concern nga pinakaduol sa inyong sitwasyon, dayon balik diri kung humana na ka.';
    if (profile.lang === 'en') return 'Open Intake, choose the concern closest to your situation, then come back here when you’re done.';
    return profile.style === 'taglish'
      ? 'Buksan mo ang Intake, piliin ang concern na pinaka-fit sa situation ninyo, tapos balik ka rito pag tapos na.'
      : 'Buksan n’yo po ang Intake, piliin ang concern na pinakaangkop sa sitwasyon ninyo, tapos bumalik po kayo rito kapag tapos na.';
  }
  if (intent === 'source') {
    if (profile.lang === 'ceb') return 'Gusto ba nimo nga ipakita nako unsang bahin sa imong pangutana ang gikan sa PhilHealth circular ug unsa ang general KoberKo guidance lang?';
    if (profile.lang === 'en') return 'Do you want me to show which part of an answer comes from a PhilHealth circular and which part is KoberKo guidance?';
    return profile.style === 'taglish'
      ? 'Gusto mo bang ipakita ko kung aling part ng sagot ang galing sa PhilHealth circular at alin ang KoberKo guidance lang?'
      : 'Gusto n’yo po bang ipakita ko kung aling bahagi ng sagot ang galing sa PhilHealth circular at alin ang KoberKo guidance lang?';
  }
  if (intent === 'billing') {
    if (profile.lang === 'ceb') return 'Gusto ba nimo nga ipakita nako dayon ang billing script para sa inyong sitwasyon?';
    if (profile.lang === 'en') return 'Do you want me to show the billing script for your situation now?';
    return profile.style === 'taglish'
      ? 'Gusto mo bang ipakita ko agad ang billing script para sa sitwasyon ninyo?'
      : 'Gusto n’yo po bang ipakita ko agad ang billing script para sa sitwasyon ninyo?';
  }
  if (intent === 'documents') {
    if (profile.lang === 'ceb') return 'Gusto ba nimo nga ipakita nako ang mubo nga checklist sa mga dokumento?';
    if (profile.lang === 'en') return 'Do you want me to show the short document checklist?';
    return profile.style === 'taglish'
      ? 'Gusto mo bang ipakita ko ang short document checklist?'
      : 'Gusto n’yo po bang ipakita ko ang maikling checklist ng mga dokumento?';
  }
  if (intent === 'financial_help') {
    if (profile.lang === 'ceb') return 'Gusto ba nimo nga i-lista nako dayon ang unang mga dokumentong dad-on para sa tabang pinansyal?';
    if (profile.lang === 'en') return 'Do you want me to list the first documents to bring for financial help?';
    return profile.style === 'taglish'
      ? 'Gusto mo bang ilista ko agad ang first documents na dadalhin para sa financial help?'
      : 'Gusto n’yo po bang ilista ko agad ang unang mga dokumentong dadalhin para sa financial help?';
  }
  if (intent === 'claim_denied') {
    if (profile.lang === 'ceb') return 'Gusto ba nimo nga tabangan tika sa pag-ila kung unsang denial reason ang pinakaduol sa inyong kaso?';
    if (profile.lang === 'en') return 'Do you want me to help narrow down which denial reason fits your case best?';
    return profile.style === 'taglish'
      ? 'Gusto mo bang tulungan kitang i-narrow down kung aling denial reason ang pinaka-fit sa case ninyo?'
      : 'Gusto n’yo po bang tulungan ko kayong tukuyin kung aling denial reason ang pinakaangkop sa kaso ninyo?';
  }
  if (intent === 'reimbursement') {
    if (profile.lang === 'ceb') return 'Gusto ba nimo nga ipakita nako ang sunod nga reimbursement steps sa mubo nga lista?';
    if (profile.lang === 'en') return 'Do you want me to show the reimbursement steps in a short list?';
    return profile.style === 'taglish'
      ? 'Gusto mo bang ipakita ko ang reimbursement steps sa short list?'
      : 'Gusto n’yo po bang ipakita ko ang reimbursement steps sa maikling listahan?';
  }
  if (intent === 'konsulta') {
    if (profile.lang === 'ceb') return 'Gusto ba nimo nga ipakita nako unsaon pag-access sa Konsulta ug asa mangita og provider?';
    if (profile.lang === 'en') return 'Do you want me to show how to access Konsulta and how to find a provider?';
    return profile.style === 'taglish'
      ? 'Gusto mo bang ipakita ko kung paano mag-access ng Konsulta at paano maghanap ng provider?'
      : 'Gusto n’yo po bang ipakita ko kung paano i-access ang Konsulta at paano maghanap ng provider?';
  }
  if (intent === 'medicine') {
    if (profile.lang === 'ceb') return 'Gusto ba nimo nga tan-awon nato kung naa ni sa RHU o Konsulta list?';
    if (profile.lang === 'en') return 'Do you want me to check whether this is usually accessible through RHU or Konsulta?';
    return profile.style === 'taglish'
      ? 'Gusto mo bang i-check ko kung usually available ito sa RHU o Konsulta?'
      : 'Gusto n’yo po bang i-check ko kung karaniwang available ito sa RHU o Konsulta?';
  }
  if (!hasContext) {
    if (profile.lang === 'ceb') return 'Gusto ba nimo nga sugdan nato ang hustong agianan sa Intake una?';
    if (profile.lang === 'en') return 'Do you want to start with Intake first so I can help more accurately?';
    return profile.style === 'taglish'
      ? 'Gusto mo bang mag-Intake muna para mas accurate ang maibigay ko?'
      : 'Gusto n’yo po bang magsimula muna sa Intake para mas tumpak ang maibigay ko?';
  }

  if (profile.lang === 'ceb') return 'Gusto ba nimo nga ako nang ipakita ang pinakasunod nga praktikal nga lakang para sa inyong sitwasyon?';
  if (profile.lang === 'en') return 'Do you want me to show the most practical next step for your situation?';
  return profile.style === 'taglish'
    ? 'Gusto mo bang ipakita ko ang pinaka-practical na next step para sa sitwasyon ninyo?'
    : 'Gusto n’yo po bang ipakita ko ang pinaka-praktikal na susunod na hakbang para sa sitwasyon ninyo?';
}

function finalizeReply(text, { profile, intent = 'general', sources = [], sensitive = false, allowDatasetOnly = false, forceEmotion = false, context = null } = {}) {
  const parts = [];
  if (text?.trim()) {
    parts.push(text.trim());
  }
  if (forceEmotion) {
    parts.unshift(buildEmotionalLead(profile));
  }

  const sourceLine = buildSourceLine(profile, sources, { allowDatasetOnly });
  if (sourceLine) {
    parts.push(sourceLine);
  }
  if (sensitive) {
    parts.push(buildVerificationReminder(profile));
  }
  parts.push(buildNextStepOffer(profile, intent, context));
  return parts.filter(Boolean).join('\n\n');
}

function buildIntakeFirstReply(profile, intent) {
  if (profile.lang === 'ceb') {
    return finalizeReply(
      'Aron matabangan tika sa mas tukma nga paagi, sugdi una ang Intake tab ug ibutang didto ang inyong sitwasyon. Human ana, balik diri ug mas espesipiko na ang akong tubag para sa billing, coverage, o mga dokumento.',
      { profile, intent, sensitive: false, allowDatasetOnly: false, context: null, forceEmotion: false },
    );
  }
  if (profile.lang === 'en') {
    return finalizeReply(
      'To help you accurately, please start with the Intake tab first and enter your situation there. After that, come back here and I can answer more specifically about billing, coverage, or documents.',
      { profile, intent, sensitive: false, allowDatasetOnly: false, context: null, forceEmotion: false },
    );
  }
  const body = profile.style === 'taglish'
    ? 'Para matulungan kita nang mas accurate, subukan mo muna ang Intake tab at ilagay ang sitwasyon ninyo doon. Pagbalik mo rito, mas specific na ang maibibigay ko tungkol sa billing, coverage, o documents.'
    : 'Para matulungan ko po kayo nang mas tumpak, subukan n’yo muna ang Intake tab at ilagay ang sitwasyon ninyo doon. Pagbalik n’yo rito, mas espesipiko na ang maibibigay ko tungkol sa billing, coverage, o mga dokumento.';
  return finalizeReply(body, { profile, intent, sensitive: false, context: null });
}

function buildIntakeStartReply(profile) {
  if (profile.lang === 'ceb') {
    return finalizeReply(
      'Maayo na. Sugdi lang ang Intake una aron makahatag ko og mas tukmang tubag base sa inyong tinuod nga sitwasyon.',
      { profile, intent: 'intake_start', sensitive: false, context: null },
    );
  }
  if (profile.lang === 'en') {
    return finalizeReply(
      'That’s the right first step. Start with Intake first so I can give you a more accurate answer based on your actual situation.',
      { profile, intent: 'intake_start', sensitive: false, context: null },
    );
  }
  const body = profile.style === 'taglish'
    ? 'Tama iyon. Mag-Intake muna para mas accurate ang maibigay ko base sa actual na sitwasyon ninyo.'
    : 'Tama po iyon. Magsimula po muna sa Intake para mas tumpak ang maibigay ko base sa aktuwal na sitwasyon ninyo.';
  return finalizeReply(body, { profile, intent: 'intake_start', sensitive: false, context: null });
}

function buildSourceTrustReply(profile) {
  if (profile.lang === 'ceb') {
    return finalizeReply(
      'Ang KoberKo naggamit sa iyang lokal nga dataset, dili sa online lookup. Kana nga dataset gihimo gikan sa official PhilHealth circulars, DOH issuances, ug ubang government sources nga naka-store sa app. Kung naa ang eksaktong source sa dataset, among isulti dayon; kung wala, klaro namong isulti nga i-verify pa nimo sa PhilHealth o sa ospital.',
      { profile, intent: 'source', sensitive: false, context: null },
    );
  }
  if (profile.lang === 'en') {
    return finalizeReply(
      'KoberKo uses its own local dataset, not live online lookup. That dataset was built from official PhilHealth circulars, DOH issuances, and other government sources stored in the app. If the exact source is in the dataset, I should surface it directly; if not, I should clearly tell you to verify with PhilHealth or the hospital.',
      { profile, intent: 'source', sensitive: false, context: null },
    );
  }
  const body = profile.style === 'taglish'
    ? 'KoberKo uses its own local dataset, hindi online lookup. Galing iyon sa official PhilHealth circulars, DOH issuances, at iba pang government sources na naka-store sa app. Kapag may exact source sa dataset, dapat sabihin ko iyon diretso; kapag wala, sasabihin ko ring kailangan pa ring mag-verify sa PhilHealth o sa ospital.'
    : 'Ang KoberKo po ay gumagamit ng sarili nitong local dataset, hindi online lookup. Kinuha iyon mula sa official PhilHealth circulars, DOH issuances, at iba pang government sources na naka-store sa app. Kapag may exact source sa dataset, dapat ko pong sabihin iyon diretso; kapag wala, sasabihin ko rin pong kailangan pa ring mag-verify sa PhilHealth o sa ospital.';
  return finalizeReply(body, { profile, intent: 'source', sensitive: false, context: null });
}

function buildOutOfScopeReply(profile) {
  if (profile.lang === 'ceb') {
    return finalizeReply('Makatabang ko sa healthcare navigation sa Pilipinas lang — sama sa PhilHealth, billing sa ospital, reimbursement, RHU, Konsulta, tambal, ug tabang pinansyal.', { profile, intent: 'general', context: null });
  }
  if (profile.lang === 'en') {
    return finalizeReply('I can help only with healthcare navigation in the Philippines — like PhilHealth, hospital billing, reimbursement, RHU care, Konsulta, medicines, and financial assistance.', { profile, intent: 'general', context: null });
  }
  const body = profile.style === 'taglish'
    ? 'Ang matutulungan ko lang ay healthcare navigation sa Pilipinas — tulad ng PhilHealth, hospital billing, reimbursement, RHU care, Konsulta, medicines, at financial assistance.'
    : 'Ang matutulungan ko lang po ay healthcare navigation sa Pilipinas — tulad ng PhilHealth, hospital billing, reimbursement, RHU care, Konsulta, medicines, at financial assistance.';
  return finalizeReply(body, { profile, intent: 'general', context: null });
}

function findLatestAmountInHistory(history = []) {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const amount = extractCurrencyAmount(history[index]?.content ?? '');
    if (amount !== null) {
      return amount;
    }
  }

  return null;
}

function buildBillingReply(profile, context) {
  const scriptEntry = getScriptEntry(context?.conditionId);
  const coverage = context?.conditionId && context?.memberType && context?.hospitalLevel
    ? getCoverage(context.conditionId, context.memberType, context.hospitalLevel, {
        variantKey: context.coverageVariantKey || undefined,
      })
    : null;
  if (!scriptEntry || !coverage) {
    return null;
  }

  const script = localizeFromProfile(profile, scriptEntry, 'billingScript');
  const firstRedFlag = Array.isArray(scriptEntry.redFlags) ? scriptEntry.redFlags[0] : null;
  const source = getSourceEntryForCondition(context.conditionId, coverage.circular);
  const intro = profile.lang === 'ceb'
    ? `Kung naa na mo sa billing, mao ni ang unang isulti: "${script}"`
    : profile.lang === 'en'
      ? `If you are already at billing, say this first: "${script}"`
      : profile.style === 'taglish'
        ? `Kung nasa billing na kayo, ito ang unang sabihin: "${script}"`
        : `Kung nasa billing na po kayo, ito ang unang sabihin: "${script}"`;
  const redFlagLine = firstRedFlag
    ? profile.lang === 'ceb'
      ? `Kung moingon sila og "${localizeFromProfile(profile, firstRedFlag, 'wrongStatement')}", mas luwas nga tubag ang: "${localizeFromProfile(profile, firstRedFlag, 'correctResponse')}"`
      : profile.lang === 'en'
        ? `If they say "${localizeFromProfile(profile, firstRedFlag, 'wrongStatement')}", a safer reply is: "${localizeFromProfile(profile, firstRedFlag, 'correctResponse')}"`
        : profile.style === 'taglish'
          ? `Kung sabihin nila na "${localizeFromProfile(profile, firstRedFlag, 'wrongStatement')}", mas safe na sagot ito: "${localizeFromProfile(profile, firstRedFlag, 'correctResponse')}"`
          : `Kung sabihin po nila na "${localizeFromProfile(profile, firstRedFlag, 'wrongStatement')}", ito po ang mas ligtas na sagot: "${localizeFromProfile(profile, firstRedFlag, 'correctResponse')}"`
    : '';

  return finalizeReply(
    [intro, redFlagLine].filter(Boolean).join(' '),
    {
      profile,
      intent: 'billing',
      sources: [source?.circular || coverage.circular].filter(Boolean),
      sensitive: true,
      context,
    },
  );
}

function buildDocumentsReply(profile, context) {
  const coverage = context?.conditionId && context?.memberType && context?.hospitalLevel
    ? getCoverage(context.conditionId, context.memberType, context.hospitalLevel, {
        variantKey: context.coverageVariantKey || undefined,
      })
    : null;
  const checklist = getChecklistItems(coverage).slice(0, 4);
  if (!coverage || !checklist.length) {
    return null;
  }

  const items = checklist.map((item) => localizeFromProfile(profile, item, 'label')).join('; ');
  const source = getSourceEntryForCondition(context.conditionId, coverage.circular);
  const body = profile.lang === 'ceb'
    ? `Para sa inyong kasamtangang sitwasyon, mao ni ang unang mga dokumentong andamon: ${items}. Ang MDR nagpasabot og Member Data Record, ug ang CF1/CF2 mao ang PhilHealth claim forms.`
    : profile.lang === 'en'
      ? `For your current case, start with these documents: ${items}. MDR means Member Data Record, while CF1 and CF2 are PhilHealth claim forms.`
      : profile.style === 'taglish'
        ? `Para sa current situation ninyo, ito ang unang documents na dapat ihanda: ${items}. Ang MDR ay Member Data Record, at ang CF1/CF2 ang PhilHealth claim forms.`
        : `Para po sa kasalukuyang sitwasyon ninyo, ito po ang unang mga dokumentong dapat ihanda: ${items}. Ang MDR ay Member Data Record, at ang CF1/CF2 ang mga PhilHealth claim form.`;

  return finalizeReply(body, {
    profile,
    intent: 'documents',
    sources: [source?.circular || coverage.circular].filter(Boolean),
    sensitive: true,
    allowDatasetOnly: true,
    context,
  });
}

function buildFinancialHelpReply(profile, stressed = false) {
  const programs = Array.isArray(financialAssistance.programs) ? financialAssistance.programs : [];
  if (!programs.length) {
    return null;
  }

  const pickProgram = (key) => programs.find((item) => item.key === key);
  const malasakit = pickProgram('malasakit');
  const pcso = pickProgram('pcso');
  const dswd = pickProgram('dswd');
  const body = profile.lang === 'ceb'
    ? `${localizeFromProfile(profile, malasakit, 'title')}: ${localizeFromProfile(profile, malasakit, 'summary')} ${localizeFromProfile(profile, malasakit, 'best_for')} ${localizeFromProfile(profile, pcso, 'title')}: ${localizeFromProfile(profile, pcso, 'summary')} ${localizeFromProfile(profile, dswd, 'title')}: ${localizeFromProfile(profile, dswd, 'summary')}`
    : profile.lang === 'en'
      ? `${localizeFromProfile(profile, malasakit, 'title')}: ${localizeFromProfile(profile, malasakit, 'summary')} ${localizeFromProfile(profile, malasakit, 'best_for')} ${localizeFromProfile(profile, pcso, 'title')}: ${localizeFromProfile(profile, pcso, 'summary')} ${localizeFromProfile(profile, dswd, 'title')}: ${localizeFromProfile(profile, dswd, 'summary')}`
      : `${localizeFromProfile(profile, malasakit, 'title')}: ${localizeFromProfile(profile, malasakit, 'summary')} ${localizeFromProfile(profile, malasakit, 'best_for')} ${localizeFromProfile(profile, pcso, 'title')}: ${localizeFromProfile(profile, pcso, 'summary')} ${localizeFromProfile(profile, dswd, 'title')}: ${localizeFromProfile(profile, dswd, 'summary')}`;

  const sources = [
    malasakit?.source_label_en || malasakit?.source_label_fil,
    pcso?.source_label_en || pcso?.source_label_fil,
    dswd?.source_label_en || dswd?.source_label_fil,
  ];

  return finalizeReply(body, {
    profile,
    intent: 'financial_help',
    sources,
    sensitive: true,
    forceEmotion: stressed,
    context: null,
  });
}

function buildClaimDeniedReply(profile, stressed = false) {
  const reasons = Array.isArray(claimDenialData.topDenialReasons) ? claimDenialData.topDenialReasons.slice(0, 3) : [];
  if (!reasons.length) {
    return null;
  }

  const reasonText = reasons.map((item) => localizeFromProfile(profile, item, 'reason')).join('; ');
  const nextStep = localizeFromProfile(profile, claimDenialData.appealsProcess?.step1 || {}, 'title');
  const deadline = localizeFromProfile(profile, claimDenialData.appealsProcess?.step1 || {}, 'deadline');
  const body = profile.lang === 'ceb'
    ? `Kung gibalibaran ang claim, ang kasagarang hinungdan mao kini: ${reasonText}. Ang unang konkretong lakang mao ang ${nextStep} sulod sa ${deadline}.`
    : profile.lang === 'en'
      ? `If the claim was denied, the most common reasons are: ${reasonText}. The first concrete step is ${nextStep} within ${deadline}.`
      : profile.style === 'taglish'
        ? `Kapag na-deny ang claim, ito ang pinaka-common reasons: ${reasonText}. Ang unang concrete step ay ${nextStep} within ${deadline}.`
        : `Kapag na-deny po ang claim, ito po ang mga pinakakaraniwang dahilan: ${reasonText}. Ang unang konkretong hakbang ay ang ${nextStep} sa loob ng ${deadline}.`;

  return finalizeReply(body, {
    profile,
    intent: 'claim_denied',
    sources: [],
    sensitive: true,
    allowDatasetOnly: true,
    forceEmotion: stressed,
    context: null,
  });
}

function buildReimbursementReply(profile) {
  const steps = Array.isArray(reimbursementData.steps) ? reimbursementData.steps.slice(0, 3) : [];
  if (!steps.length) {
    return null;
  }

  const body = profile.lang === 'ceb'
    ? `Para sa reimbursement, sugdi sa ${localizeFromProfile(profile, steps[0], 'title')}, dayon ${localizeFromProfile(profile, steps[1], 'title')}, ug human ana ${localizeFromProfile(profile, steps[2], 'title')}. Ang deadline mao ang 60 ka adlaw gikan sa discharge.`
    : profile.lang === 'en'
      ? `For reimbursement, start with ${localizeFromProfile(profile, steps[0], 'title')}, then ${localizeFromProfile(profile, steps[1], 'title')}, and after that ${localizeFromProfile(profile, steps[2], 'title')}. The deadline is 60 days from discharge.`
      : profile.style === 'taglish'
        ? `Para sa reimbursement, magsimula sa ${localizeFromProfile(profile, steps[0], 'title')}, then ${localizeFromProfile(profile, steps[1], 'title')}, at pagkatapos ${localizeFromProfile(profile, steps[2], 'title')}. Ang deadline ay 60 days from discharge.`
        : `Para po sa reimbursement, magsimula po sa ${localizeFromProfile(profile, steps[0], 'title')}, pagkatapos ${localizeFromProfile(profile, steps[1], 'title')}, at saka ${localizeFromProfile(profile, steps[2], 'title')}. Ang deadline po ay 60 araw mula sa discharge.`;

  return finalizeReply(body, {
    profile,
    intent: 'reimbursement',
    sources: [],
    sensitive: true,
    allowDatasetOnly: true,
    context: null,
  });
}

function buildKonsultaReply(profile) {
  const body = profile.lang === 'ceb'
    ? `${konsultaData.title_ceb}: ${konsultaData.tagline_ceb} ${konsultaData.howToAccess_ceb} Source sa KoberKo dataset: ${konsultaData.circular}.`
    : profile.lang === 'en'
      ? `${konsultaData.title_en}: ${konsultaData.tagline_en} ${konsultaData.howToAccess_en} Source in KoberKo data: ${konsultaData.circular}.`
      : profile.style === 'taglish'
        ? `${konsultaData.title_fil}: ${konsultaData.tagline_fil} ${konsultaData.howToAccess_fil} Source sa KoberKo data: ${konsultaData.circular}.`
        : `${konsultaData.title_fil}: ${konsultaData.tagline_fil} ${konsultaData.howToAccess_fil} Source po sa KoberKo data: ${konsultaData.circular}.`;

  return finalizeReply(body, {
    profile,
    intent: 'konsulta',
    sources: [konsultaData.circular],
    sensitive: true,
    context: null,
  });
}

function buildMedicineReply(userMessage, profile) {
  const normalized = normalize(userMessage);
  const medicine = medicines.find((item) =>
    item.aliases?.some((alias) => normalized.includes(normalize(alias)))
      || normalized.includes(normalize(item.genericName)),
  );
  if (!medicine) {
    return null;
  }

  const body = profile.lang === 'ceb'
    ? `${medicine.genericName} ${medicine.strength} ${medicine.dosageForm}: ${medicine.useFor_ceb} ${medicine.officialPrice_ceb} ${medicine.publicAccess_ceb}`
    : profile.lang === 'en'
      ? `${medicine.genericName} ${medicine.strength} ${medicine.dosageForm}: ${medicine.useFor_en} ${medicine.officialPrice_en} ${medicine.publicAccess_en}`
      : profile.style === 'taglish'
        ? `${medicine.genericName} ${medicine.strength} ${medicine.dosageForm}: ${medicine.useFor_fil} ${medicine.officialPrice_fil} ${medicine.publicAccess_fil}`
        : `${medicine.genericName} ${medicine.strength} ${medicine.dosageForm}: ${medicine.useFor_fil} ${medicine.officialPrice_fil} ${medicine.publicAccess_fil}`;

  return finalizeReply(body, {
    profile,
    intent: 'medicine',
    sources: [],
    sensitive: true,
    allowDatasetOnly: true,
    context: null,
  });
}

function buildUrgencyReply(userMessage, profile, stressed = false) {
  const triage = evaluateUrgencyTriage({ symptom: userMessage });
  if (!triage) {
    return null;
  }

  const body = triage.level === 'red'
    ? profile.lang === 'ceb'
      ? 'Base sa imong gisulti, mas luwas nga moadto dayon sa ospital karon kaysa maghulat pa.'
      : profile.lang === 'en'
        ? 'From what you described, it is safer to go to a hospital now rather than wait.'
        : profile.style === 'taglish'
          ? 'Base sa sinabi mo, mas safe na mag-hospital na ngayon kaysa maghintay pa.'
          : 'Base po sa sinabi ninyo, mas ligtas pong mag-ospital na ngayon kaysa maghintay pa.'
    : triage.level === 'yellow'
      ? profile.lang === 'ceb'
        ? 'Base sa imong gisulti, kinahanglan kini matan-aw karon sa RHU, health center, o clinician.'
        : profile.lang === 'en'
          ? 'From what you described, this should be checked today at an RHU, health center, or by a clinician.'
          : profile.style === 'taglish'
            ? 'Base sa sinabi mo, dapat itong mapatingnan today sa RHU, health center, o clinician.'
            : 'Base po sa sinabi ninyo, kailangan po itong mapatingnan today sa RHU, health center, o clinician.'
      : profile.lang === 'ceb'
        ? 'Sa karon, wala koy klarong nakitang dagkong timailhan sa peligro, pero bantayi gyud pag-ayo ang pasyente.'
        : profile.lang === 'en'
          ? 'Right now, there is no clear major danger sign from what you described, but the patient should still be watched closely.'
          : profile.style === 'taglish'
            ? 'Sa ngayon, wala pang clear major danger sign base sa sinabi mo, pero bantayan pa rin nang mabuti ang pasyente.'
            : 'Sa ngayon po, wala pang malinaw na major danger sign base sa sinabi ninyo, pero bantayan pa rin po nang mabuti ang pasyente.';

  return finalizeReply(body, {
    profile,
    intent: 'urgency',
    sources: [],
    sensitive: true,
    allowDatasetOnly: true,
    forceEmotion: stressed,
    context: null,
  });
}

function buildGeneralDatasetReply(intent, userMessage, profile, context = null) {
  const stressed = detectStress(userMessage);
  if (intent === 'intake_start') {
    return buildIntakeStartReply(profile);
  }
  if (intent === 'source') {
    return buildSourceTrustReply(profile);
  }
  if (intent === 'financial_help') {
    return buildFinancialHelpReply(profile, stressed);
  }
  if (intent === 'claim_denied') {
    return buildClaimDeniedReply(profile, stressed);
  }
  if (intent === 'reimbursement') {
    return buildReimbursementReply(profile);
  }
  if (intent === 'konsulta') {
    return buildKonsultaReply(profile);
  }
  if (intent === 'medicine') {
    return buildMedicineReply(userMessage, profile);
  }
  if (intent === 'urgency') {
    return buildUrgencyReply(userMessage, profile, stressed);
  }
  if (intent === 'billing' && context) {
    return buildBillingReply(profile, context);
  }
  if (intent === 'documents' && context) {
    return buildDocumentsReply(profile, context);
  }
  return null;
}

function buildCostBreakdownReply(userMessage, context, history = []) {
  if (!context?.conditionId || !context?.memberType || !context?.hospitalLevel) {
    return null;
  }

  const currentText = userMessage.trim();
  const latestAssistantText = history
    .slice()
    .reverse()
    .find((item) => item.role === 'assistant')?.content ?? '';
  const breakdownIntent =
    hasAnyTerm(currentText, [
      'break it down',
      'breakdown',
      'explain',
      'details',
      'copay',
      'co-pay',
      'out of pocket',
      'out-of-pocket',
      'total bill',
      'babayaran',
      'magkano babayaran',
      'i-breakdown',
    ]) ||
    (isAffirmative(currentText) && hasAnyTerm(latestAssistantText, ['break that down', 'breakdown', 'out-of-pocket', 'total hospital bill']));

  if (!breakdownIntent) {
    return null;
  }

  const coverage = getCoverage(context.conditionId, context.memberType, context.hospitalLevel, {
    variantKey: context.coverageVariantKey || undefined,
  });
  if (!coverage) {
    return null;
  }

  const zbbStatus = context.hospitalType && context.roomType
    ? getZBBStatus(context.memberType, context.hospitalType, context.roomType)
    : null;
  const language = detectReplyLanguage(currentText, history);
  const condition = context.conditionName || coverage.conditionName_en || coverage.conditionName_fil;
  const level = context.hospitalLevel.replace('level', 'Level ');
  const directFilingText = coverage.directFiling ? 'Yes' : 'No';

  if (language === 'en') {
    const lines = [
      `Here is the breakdown for ${condition} at ${level}:`,
      `PhilHealth package amount: PHP ${coverage.amount.toLocaleString()}.`,
    ];

    if (zbbStatus?.zbbApplies) {
      lines.push(`Patient payment: estimated PHP 0 because ${zbbStatus.zbbType === 'FULL_ZBB' ? 'Zero Balance Billing' : 'No Balance Billing'} may apply with your current hospital and room setup.`);
    } else {
      lines.push(`Estimated patient co-pay: PHP ${coverage.copayMin.toLocaleString()} to PHP ${coverage.copayMax.toLocaleString()}.`);
    }

    lines.push(`Direct filing: ${directFilingText}.`);

    if (!zbbStatus) {
      lines.push('If you tell me the hospital type and room type, I can also check whether zero billing may apply.');
    }

    lines.push('This is not the total hospital bill. It is the PhilHealth package amount plus the estimated patient share based on KoberKo data.');
    return lines.join(' ');
  }

  if (language === 'ceb') {
    const lines = [
      `Mao ni ang breakdown para sa ${condition} sa ${level}:`,
      `PhilHealth package amount: PHP ${coverage.amount.toLocaleString()}.`,
    ];

    if (zbbStatus?.zbbApplies) {
      lines.push(`Tantyang bayran sa pasyente: PHP 0 kay mahimong mo-apply ang ${zbbStatus.zbbType === 'FULL_ZBB' ? 'Zero Balance Billing' : 'No Balance Billing'} sa inyong kasamtangang hospital ug room setup.`);
    } else {
      lines.push(`Tantyang co-pay sa pasyente: PHP ${coverage.copayMin.toLocaleString()} hangtod PHP ${coverage.copayMax.toLocaleString()}.`);
    }

    lines.push(`Direct filing: ${coverage.directFiling ? 'Oo' : 'Dili'}.`);

    if (!zbbStatus) {
      lines.push('Kung ihatag nimo ang klase sa ospital ug room type, ma-check pud nako kung posible ang zero billing.');
    }

    lines.push('Dili pa kini ang kinatibuk-ang bill sa ospital. Mao kini ang PhilHealth package amount ug ang tantyang sariling bayran base sa KoberKo data.');
    return lines.join(' ');
  }

  const lines = [
    `Ito ang breakdown para sa ${condition} sa ${level}:`,
    `PhilHealth package amount: PHP ${coverage.amount.toLocaleString()}.`,
  ];

  if (zbbStatus?.zbbApplies) {
    lines.push(`Tantyang babayaran ng pasyente: PHP 0 dahil maaaring mag-apply ang ${zbbStatus.zbbType === 'FULL_ZBB' ? 'Zero Balance Billing' : 'No Balance Billing'} sa kasalukuyang hospital at room setup ninyo.`);
  } else {
    lines.push(`Tantyang co-pay ng pasyente: PHP ${coverage.copayMin.toLocaleString()} hanggang PHP ${coverage.copayMax.toLocaleString()}.`);
  }

  lines.push(`Direct filing: ${coverage.directFiling ? 'Oo' : 'Hindi'}.`);

  if (!zbbStatus) {
    lines.push('Kung sabihin mo ang uri ng ospital at room type, mache-check ko rin kung puwedeng mag-zero billing.');
  }

  lines.push('Hindi pa ito ang kabuuang hospital bill. Ito ang PhilHealth package amount at tantyang sariling babayaran base sa KoberKo data.');
  return lines.join(' ');
}

function buildVariantFollowUpReply(userMessage, context) {
  if (!context?.conditionId || !context?.memberType || !context?.hospitalLevel) {
    return null;
  }

  const coverage = getCoverage(context.conditionId, context.memberType, context.hospitalLevel, {
    variantKey: context.coverageVariantKey || undefined,
  });
  if (!coverage?.subPackages?.length) {
    return null;
  }

  const normalizedMessage = normalize(userMessage);
  const variantKeywords = coverage.subPackages.map((item) => {
    const label = normalize(`${item.name_en} ${item.name_fil}`);
    const keywordHits = [
      'high risk',
      'moderate risk',
      'severe',
      'warning signs',
      'without warning signs',
      'without complications',
      'with complications',
      'coma',
      'ketoacidosis',
      'pediatric',
      'low-dose',
      'high-dose',
      'plate',
      'nail',
    ].filter((term) => label.includes(term));

    return {
      item,
      score: keywordHits.reduce((total, term) => total + (normalizedMessage.includes(term) ? 3 : 0), 0)
        + label.split(/\s+/).filter((word) => word.length >= 4 && normalizedMessage.includes(word)).length,
    };
  });

  const bestMatch = variantKeywords.sort((a, b) => b.score - a.score)[0];
  if (!bestMatch || bestMatch.score <= 0) {
    return null;
  }

  const language = detectReplyLanguage(userMessage);
  const variantName = pickLocale(bestMatch.item.name_en, bestMatch.item.name_fil, bestMatch.item.name_ceb, language);
  const currentVariant = pickLocale(
    coverage.variantUsed_en || coverage.packageName_en,
    coverage.variantUsed_fil || coverage.packageName_fil,
    coverage.variantUsed_ceb || coverage.packageName_ceb,
    language,
  );

  if (language === 'en') {
    return `For ${variantName}, the PhilHealth amount is PHP ${bestMatch.item.amount.toLocaleString()}. The current result screen is using ${currentVariant}, so this follow-up is a different official package variant. Ask the hospital to confirm the exact diagnosis or treatment variant they are filing.`;
  }

  if (language === 'ceb') {
    return `Para sa ${variantName}, ang PhilHealth amount kay PHP ${bestMatch.item.amount.toLocaleString()}. Ang kasamtangang result screen naggamit ug ${currentVariant}, busa lahi kini nga opisyal nga package variant. Pangutan-a ang ospital kung unsa gyod nga diagnosis o treatment variant ang ilang i-file.`;
  }

  return `Para sa ${variantName}, ang PhilHealth amount ay PHP ${bestMatch.item.amount.toLocaleString()}. Ang kasalukuyang result screen ay gumagamit ng ${currentVariant}, kaya ibang official package variant ito. Itanong sa ospital kung alin ang eksaktong diagnosis o treatment variant na ifa-file nila.`;
}

function buildScenarioFollowUpReply(userMessage, context) {
  if (!context?.memberType || !context?.conditionId || !context?.hospitalLevel) {
    return null;
  }

  const normalizedMessage = normalize(userMessage);
  const asksAboutRoomOrHospital = [
    'private room',
    'semi-private',
    'ward',
    'doh hospital',
    'government hospital',
    'lgu hospital',
    'private hospital',
  ].some((term) => normalizedMessage.includes(term));

  if (!asksAboutRoomOrHospital) {
    return null;
  }

  let hospitalType = context.hospitalType;
  let roomType = context.roomType;

  if (normalizedMessage.includes('private room')) {
    roomType = 'PRIVATE';
  } else if (normalizedMessage.includes('semi-private')) {
    roomType = 'SEMI_PRIVATE';
  } else if (normalizedMessage.includes('ward')) {
    roomType = 'WARD';
  }

  if (normalizedMessage.includes('private hospital')) {
    hospitalType = 'PRIVATE_ACCREDITED';
  } else if (normalizedMessage.includes('lgu hospital') || normalizedMessage.includes('government hospital')) {
    hospitalType = 'LGU';
  } else if (normalizedMessage.includes('doh hospital')) {
    hospitalType = 'DOH';
  }

  if (!hospitalType || !roomType) {
    return null;
  }

  const zbbStatus = getZBBStatus(context.memberType, hospitalType, roomType);
  const coverage = getCoverage(context.conditionId, context.memberType, context.hospitalLevel, {
    variantKey: context.coverageVariantKey || undefined,
  });
  if (!coverage) {
    return null;
  }

  const language = detectReplyLanguage(userMessage);
  if (language === 'en') {
    if (zbbStatus.zbbApplies) {
      return `With ${hospitalType === 'DOH' ? 'a DOH hospital' : 'that hospital setup'} and ${roomType.toLowerCase().replace('_', '-')}, your out-of-pocket may be PHP 0 because ${zbbStatus.zbbType === 'FULL_ZBB' ? 'Zero Balance Billing' : 'No Balance Billing'} can apply. Your PhilHealth package amount for the case still stays at PHP ${coverage.amount.toLocaleString()}, but the patient share may drop to zero under that setup.`;
    }

    return `With ${roomType.toLowerCase().replace('_', '-')} at ${hospitalType === 'PRIVATE_ACCREDITED' ? 'a private hospital' : 'that hospital setup'}, regular PhilHealth rules apply. The package amount stays at PHP ${coverage.amount.toLocaleString()}, and the patient still needs to expect co-pay unless zero-billing rules apply.`;
  }

  if (language === 'ceb') {
    if (zbbStatus.zbbApplies) {
      return `Kung ${hospitalType === 'DOH' ? 'DOH hospital' : 'ingon ana nga hospital setup'} ug ${roomType.toLowerCase().replace('_', '-')}, mahimong PHP 0 ang sariling bayran kay posible nga mo-apply ang ${zbbStatus.zbbType === 'FULL_ZBB' ? 'Zero Balance Billing' : 'No Balance Billing'}. Magpabilin nga PHP ${coverage.amount.toLocaleString()} ang PhilHealth package amount para sa kaso, pero posible nga zero ang patient share sa maong setup.`;
    }

    return `Kung ${roomType.toLowerCase().replace('_', '-')} sa ${hospitalType === 'PRIVATE_ACCREDITED' ? 'pribadong ospital' : 'maong hospital setup'}, regular PhilHealth rules ang mo-apply. Magpabilin nga PHP ${coverage.amount.toLocaleString()} ang package amount, ug kinahanglan gihapon mangandam sa co-pay gawas kung mo-qualify sa zero-billing rules.`;
  }

  if (zbbStatus.zbbApplies) {
    return `Kung ${hospitalType === 'DOH' ? 'DOH hospital' : 'ganyang hospital setup'} at ${roomType.toLowerCase().replace('_', '-')}, puwedeng maging PHP 0 ang sariling babayaran dahil maaaring mag-apply ang ${zbbStatus.zbbType === 'FULL_ZBB' ? 'Zero Balance Billing' : 'No Balance Billing'}. Mananatiling PHP ${coverage.amount.toLocaleString()} ang PhilHealth package amount para sa kaso, pero puwedeng bumaba sa zero ang patient share sa setup na iyon.`;
  }

  return `Kung ${roomType.toLowerCase().replace('_', '-')} sa ${hospitalType === 'PRIVATE_ACCREDITED' ? 'private hospital' : 'ganyang hospital setup'}, regular PhilHealth rules ang mag-aapply. Mananatiling PHP ${coverage.amount.toLocaleString()} ang package amount, at dapat pa ring maghanda sa co-pay maliban kung mag-qualify sa zero-billing rules.`;
}

function buildCoverageAccuracyReply(userMessage, context, history = []) {
  if (!context?.coverageAmount) {
    return null;
  }

  const currentText = userMessage.trim();
  const language = detectReplyLanguage(currentText, history);
  const recentConversation = history.slice(-6).map((item) => item.content).join(' ');
  const accuracyHistoryIntent = hasAnyTerm(recentConversation, [
    'accurate',
    'projection',
    'estimate',
    'correct',
    'coverage cost',
    'coverage costs',
    'amount',
    'tama',
    'sakto',
    'halaga',
  ]);
  const currentVerificationIntent = hasAnyTerm(currentText, [
    'accurate',
    'projection',
    'estimate',
    'correct',
    'coverage cost',
    'coverage costs',
    'amount',
    'tama',
    'sakto',
    'halaga',
  ]);
  const verificationIntent = [
    currentVerificationIntent,
    extractCurrencyAmount(currentText) !== null,
    isAffirmative(currentText) && accuracyHistoryIntent,
  ].some(Boolean);

  if (!verificationIntent) {
    return null;
  }

  const mentionedAmount = extractCurrencyAmount(currentText)
    ?? (isAffirmative(currentText) ? findLatestAmountInHistory(history) : null);
  const condition = context.conditionName || context.conditionName_en || context.conditionName_fil || 'this case';
  const expectedAmount = Number(context.coverageAmount);
  const level = context.hospitalLevel ? context.hospitalLevel.replace('level', 'Level ') : '';

  if (mentionedAmount === null) {
    if (language === 'en') {
      return `If you mean the PhilHealth coverage for the current ${condition}${level ? ` at ${level}` : ''}, KoberKo shows PHP ${expectedAmount.toLocaleString()}. If you mean the total hospital bill or your out-of-pocket cost, tell me and I'll break that down separately.`;
    }

    if (language === 'ceb') {
      return `Kung ang imong pasabot mao ang PhilHealth coverage para sa kasamtangang ${condition}${level ? ` sa ${level}` : ''}, ang gipakita sa KoberKo kay PHP ${expectedAmount.toLocaleString()}. Kung ang imong pasabot mao ang tibuok bill sa ospital o ang imong sariling bayran, sultihi lang ko ug i-breakdown nako kini.`;
    }

    return `Kung PhilHealth coverage ang ibig mong sabihin para sa kasalukuyang ${condition}${level ? ` sa ${level}` : ''}, ang nasa KoberKo ay PHP ${expectedAmount.toLocaleString()}. Kung total hospital bill o sariling babayaran ang tinutukoy mo, sabihin mo lang at ibi-breakdown ko iyon.`;
  }

  const isAccurate = mentionedAmount === expectedAmount;

  if (language === 'en') {
    return isAccurate
      ? `Yes. If you mean the PhilHealth coverage amount for the current ${condition}${level ? ` at ${level}` : ''}, PHP ${mentionedAmount.toLocaleString()} matches KoberKo's local data. That is the PhilHealth package amount, not the total hospital bill.`
      : `No. If you mean the PhilHealth coverage amount for the current ${condition}${level ? ` at ${level}` : ''}, KoberKo's local data shows PHP ${expectedAmount.toLocaleString()}, not PHP ${mentionedAmount.toLocaleString()}. That figure is the PhilHealth package amount, not the total hospital bill.`;
  }

  if (language === 'ceb') {
    return isAccurate
      ? `Oo. Kung ang imong pasabot mao ang PhilHealth coverage amount para sa kasamtangang ${condition}${level ? ` sa ${level}` : ''}, nagtugma ang PHP ${mentionedAmount.toLocaleString()} sa local data sa KoberKo. PhilHealth package amount kini, dili pa kini ang kinatibuk-ang bill sa ospital.`
      : `Dili. Kung ang imong pasabot mao ang PhilHealth coverage amount para sa kasamtangang ${condition}${level ? ` sa ${level}` : ''}, ang local data sa KoberKo kay PHP ${expectedAmount.toLocaleString()}, dili PHP ${mentionedAmount.toLocaleString()}. PhilHealth package amount kini, dili pa kini ang kinatibuk-ang bill sa ospital.`;
  }

  return isAccurate
    ? `Oo. Kung PhilHealth coverage amount ang tinutukoy mo para sa kasalukuyang ${condition}${level ? ` sa ${level}` : ''}, tugma ang PHP ${mentionedAmount.toLocaleString()} sa local data ng KoberKo. PhilHealth package amount ito, hindi pa ito ang kabuuang hospital bill.`
    : `Hindi. Kung PhilHealth coverage amount ang tinutukoy mo para sa kasalukuyang ${condition}${level ? ` sa ${level}` : ''}, ang local data ng KoberKo ay PHP ${expectedAmount.toLocaleString()}, hindi PHP ${mentionedAmount.toLocaleString()}. PhilHealth package amount ito, hindi pa ito ang kabuuang hospital bill.`;
}

function buildRelevantDatasetBlock(intent, userMessage, context, profile) {
  const blocks = [];
  const sources = [];
  const coverage = context?.conditionId && context?.memberType && context?.hospitalLevel
    ? getCoverage(context.conditionId, context.memberType, context.hospitalLevel, {
        variantKey: context.coverageVariantKey || undefined,
      })
    : null;
  const benefit = getBenefitEntry(context?.conditionId);
  const source = getSourceEntryForCondition(context?.conditionId, coverage?.circular || benefit?.circular || '');

  if (coverage) {
    blocks.push([
      '[KOBERKO COVERAGE DATA]',
      `Amount: PHP ${coverage.amount.toLocaleString()}`,
      `Direct filing: ${coverage.directFiling ? 'YES' : 'NO'}`,
      `Circular: ${coverage.circular}`,
      `Package category: ${coverage.packageCategory}`,
      `Coverage note: ${localizeFromProfile(profile, coverage, 'coverageNote') || 'None stored'}`,
      '[END KOBERKO COVERAGE DATA]',
    ].join('\n'));
    if (source?.circular) {
      sources.push(source.circular);
    } else if (coverage.circular) {
      sources.push(coverage.circular);
    }
  }

  if (intent === 'billing' && context?.conditionId) {
    const scriptEntry = getScriptEntry(context.conditionId);
    if (scriptEntry) {
      const redFlags = (scriptEntry.redFlags || []).slice(0, 2).map((item, index) => (
        `${index + 1}. Wrong: ${localizeFromProfile(profile, item, 'wrongStatement')} | Safer reply: ${localizeFromProfile(profile, item, 'correctResponse')}`
      ));
      blocks.push([
        '[KOBERKO BILLING SCRIPT]',
        `Script: ${localizeFromProfile(profile, scriptEntry, 'billingScript')}`,
        ...redFlags,
        '[END KOBERKO BILLING SCRIPT]',
      ].join('\n'));
    }
  }

  if (intent === 'documents' && coverage) {
    const checklist = getChecklistItems(coverage).slice(0, 6)
      .map((item) => `- ${localizeFromProfile(profile, item, 'label')}`);
    if (checklist.length) {
      blocks.push(['[KOBERKO DOCUMENT CHECKLIST]', ...checklist, '[END KOBERKO DOCUMENT CHECKLIST]'].join('\n'));
    }
  }

  if (intent === 'financial_help') {
    const programLines = (financialAssistance.programs || []).map((program) => (
      `${localizeFromProfile(profile, program, 'title')}: ${localizeFromProfile(profile, program, 'summary')} Documents: ${(program[`documents_${profile.lang}`] || program.documents_en || []).slice(0, 2).join('; ')}`
    ));
    blocks.push(['[KOBERKO FINANCIAL HELP]', ...programLines, '[END KOBERKO FINANCIAL HELP]'].join('\n'));
    sources.push(
      ...((financialAssistance.programs || []).flatMap((program) => [program.source_label_en || program.source_label_fil]).filter(Boolean)),
    );
  }

  if (intent === 'claim_denied') {
    const reasonLines = (claimDenialData.topDenialReasons || []).slice(0, 5).map((reason) => (
      `${localizeFromProfile(profile, reason, 'reason')} | Can appeal: ${reason.canAppeal ? 'Yes' : 'No'} | Note: ${localizeFromProfile(profile, reason, 'appealNote') || localizeFromProfile(profile, reason, 'howToAvoid')}`
    ));
    blocks.push(['[KOBERKO CLAIM DENIAL GUIDE]', ...reasonLines, '[END KOBERKO CLAIM DENIAL GUIDE]'].join('\n'));
  }

  if (intent === 'reimbursement') {
    const stepLines = (reimbursementData.steps || []).map((step) => `${step.order}. ${localizeFromProfile(profile, step, 'title')} — ${localizeFromProfile(profile, step, 'desc')}`);
    blocks.push(['[KOBERKO REIMBURSEMENT GUIDE]', ...stepLines, '[END KOBERKO REIMBURSEMENT GUIDE]'].join('\n'));
  }

  if (intent === 'konsulta') {
    blocks.push([
      '[KOBERKO KONSULTA DATA]',
      `Title: ${localizeFromProfile(profile, konsultaData, 'title')}`,
      `Tagline: ${localizeFromProfile(profile, konsultaData, 'tagline')}`,
      `How to access: ${localizeFromProfile(profile, konsultaData, 'howToAccess')}`,
      `Important note: ${localizeFromProfile(profile, konsultaData, 'importantNote')}`,
      '[END KOBERKO KONSULTA DATA]',
    ].join('\n'));
    if (konsultaData.circular) {
      sources.push(konsultaData.circular);
    }
  }

  if (intent === 'medicine') {
    const normalized = normalize(userMessage);
    const medicine = medicines.find((item) =>
      item.aliases?.some((alias) => normalized.includes(normalize(alias)))
        || normalized.includes(normalize(item.genericName)),
    );
    if (medicine) {
      blocks.push([
        '[KOBERKO MEDICINE DATA]',
        `${medicine.genericName} ${medicine.strength} ${medicine.dosageForm}`,
        `Use: ${localizeFromProfile(profile, medicine, 'useFor')}`,
        `Official price: ${localizeFromProfile(profile, medicine, 'officialPrice')}`,
        `Official price note: ${localizeFromProfile(profile, medicine, 'officialPriceNote')}`,
        `Public access: ${localizeFromProfile(profile, medicine, 'publicAccess')}`,
        `Availability: ${localizeFromProfile(profile, medicine, 'availability')}`,
        '[END KOBERKO MEDICINE DATA]',
      ].join('\n'));
    }
  }

  if (intent === 'rhu') {
    const concern = (rhuServices.concerns || []).find((item) =>
      [item.label_en, item.label_fil, item.label_ceb, item.id].some((value) => value && normalize(userMessage).includes(normalize(value))),
    ) || rhuServices.concerns?.[0];
    if (concern) {
      blocks.push([
        '[KOBERKO RHU DATA]',
        `Concern: ${localizeFromProfile(profile, concern, 'label')}`,
        `Summary: ${localizeFromProfile(profile, concern, 'summary')}`,
        `Good first stop: ${(concern[`goodFirstStop_${profile.lang}`] || concern.goodFirstStop_en || []).join('; ')}`,
        `Go to hospital if: ${(concern[`goHospital_${profile.lang}`] || concern.goHospital_en || []).join('; ')}`,
        '[END KOBERKO RHU DATA]',
      ].join('\n'));
    }
  }

  return {
    block: blocks.join('\n\n'),
    sources: [...new Set(sources.filter(Boolean))],
  };
}

function mapHistory(history = []) {
  return history
    .slice(-4)
    .map((item) => {
      const role = item.role === 'assistant' ? 'assistant' : 'user';
      const content = typeof item.content === 'string' ? item.content : item.message;

      return { role, content: content || '' };
    })
    .filter((item) => item.content.trim().length > 0);
}

async function callGroq(messages, options = {}) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { content: null, error: 'offline' };
  }

  try {
    const response = await fetch(GROQ_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 1000,
        messages,
      }),
    });

    if (response.status === 429) {
      groqStatusCache = true;
      return { content: null, error: 'rate_limit' };
    }

    if (response.status === 503) {
      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      groqStatusCache = false;
      return {
        content: null,
        error: payload?.error === 'missing_key' ? 'missing_key' : 'api_error',
        details: payload?.details ?? null,
      };
    }

    if (!response.ok) {
      groqStatusCache = true;
      let details = null;
      try {
        const payload = await response.json();
        details = payload?.details ?? payload?.error ?? null;
      } catch {
        details = await response.text();
      }
      return { content: null, error: 'api_error', details };
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content ?? null;
    groqStatusCache = true;

    return { content, error: null };
  } catch (error) {
    if (error instanceof TypeError) {
      return { content: null, error: 'offline' };
    }

    return {
      content: null,
      error: 'api_error',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

function validateResponsePayload(responseText, context) {
  const amountCheck = validateAIResponse(responseText, context);
  const patternCheck = checkForbiddenPatterns(responseText);

  if (amountCheck.warnings.length > 0) {
    console.warn('[KoberKo Validator] Amount deviation detected:', amountCheck.warnings);
  }

  if (patternCheck.hasViolations) {
    console.warn('[KoberKo Validator] Forbidden pattern detected:', patternCheck.violations);
  }

  return {
    warnings: amountCheck.warnings,
    hasViolations: patternCheck.hasViolations,
  };
}

function extractJson(text) {
  if (!text) {
    return null;
  }

  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i);
  const raw = fencedMatch ? fencedMatch[1] : text;
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

function scoreHeuristicCondition(condition, symptomsText) {
  const haystack = normalize(symptomsText);
  const detail = conditionDetails[condition.id];
  const terms = [
    ...(condition.searchTerms ?? []),
    ...(detail?.symptoms_fil ?? []),
    ...(detail?.symptoms_en ?? []),
  ];

  let score = 0;
  const matches = [];

  terms.forEach((term) => {
    const normalizedTerm = normalize(term);
    if (!normalizedTerm || normalizedTerm.length < 3) {
      return;
    }

    if (haystack.includes(normalizedTerm)) {
      score += normalizedTerm.includes(' ') ? 5 : 3;
      matches.push(term);
      return;
    }

    const pieces = normalizedTerm.split(/\s+/).filter((piece) => piece.length >= 4);
    const overlap = pieces.filter((piece) => haystack.includes(piece));
    if (overlap.length > 0) {
      score += overlap.length;
      matches.push(...overlap);
    }
  });

  return { score, matches: [...new Set(matches)].slice(0, 3) };
}

function buildHeuristicMatches(symptomsText) {
  const ranked = conditions
    .map((condition) => {
      const { score, matches } = scoreHeuristicCondition(condition, symptomsText);
      return { condition, score, matches };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return ranked.map(({ condition, score, matches }) => {
    const confidence = score >= 9 ? 'high' : score >= 5 ? 'medium' : 'low';
    const conditionName_fil = condition.name_fil;
    const conditionName_en = condition.name_en;
    const matchTextFil = matches.length
      ? `Nabanggit mo ang ${matches.join(', ')}, na madalas kaugnay ng ${conditionName_fil}.`
      : `Maaaring tumugma ang mga sintomas sa ${conditionName_fil}.`;
    const matchTextEn = matches.length
      ? `You mentioned ${matches.join(', ')}, which often lines up with ${conditionName_en}.`
      : `The symptoms may line up with ${conditionName_en}.`;

    return {
      conditionId: condition.id,
      conditionName_fil,
      conditionName_en,
      confidence,
      reason_fil: matchTextFil,
      reason_en: matchTextEn,
    };
  });
}

export async function askGroq(userMessage, context = null, history = []) {
  const profile = detectLanguageProfile(userMessage, history);
  const intent = detectIntent(userMessage, context);
  const stressed = detectStress(userMessage);
  const coverage = context?.conditionId && context?.memberType && context?.hospitalLevel
    ? getCoverage(context.conditionId, context.memberType, context.hospitalLevel, {
        variantKey: context.coverageVariantKey || undefined,
      })
    : null;
  const source = getSourceEntryForCondition(context?.conditionId, coverage?.circular || '');
  const contextSources = [source?.circular || coverage?.circular].filter(Boolean);

  if (isClearlyOutOfScope(userMessage)) {
    return {
      message: buildOutOfScopeReply(profile),
      error: null,
      details: null,
      warnings: [],
      hasViolations: false,
    };
  }

  if (!context && needsIntakeContext(intent)) {
    return {
      message: buildIntakeFirstReply(profile, intent),
      error: null,
      details: null,
      warnings: [],
      hasViolations: false,
    };
  }

  const datasetReply = buildGeneralDatasetReply(intent, userMessage, profile, context);
  if (datasetReply) {
    const validation = validateResponsePayload(datasetReply, context);
    return {
      message: datasetReply,
      error: null,
      details: null,
      warnings: validation.warnings,
      hasViolations: validation.hasViolations,
    };
  }

  const variantReply = buildVariantFollowUpReply(userMessage, context);
  if (variantReply) {
    const finalReply = finalizeReply(variantReply, {
      profile,
      intent: 'coverage',
      sources: contextSources,
      sensitive: true,
      context,
    });
    const validation = validateResponsePayload(finalReply, context);
    return {
      message: finalReply,
      error: null,
      details: null,
      warnings: validation.warnings,
      hasViolations: validation.hasViolations,
    };
  }

  const scenarioReply = buildScenarioFollowUpReply(userMessage, context);
  if (scenarioReply) {
    const finalReply = finalizeReply(scenarioReply, {
      profile,
      intent: 'coverage',
      sources: contextSources,
      sensitive: true,
      context,
    });
    const validation = validateResponsePayload(finalReply, context);
    return {
      message: finalReply,
      error: null,
      details: null,
      warnings: validation.warnings,
      hasViolations: validation.hasViolations,
    };
  }

  const breakdownReply = buildCostBreakdownReply(userMessage, context, history);
  if (breakdownReply) {
    const finalReply = finalizeReply(breakdownReply, {
      profile,
      intent: 'coverage',
      sources: contextSources,
      sensitive: true,
      context,
    });
    const validation = validateResponsePayload(finalReply, context);
    return {
      message: finalReply,
      error: null,
      details: null,
      warnings: validation.warnings,
      hasViolations: validation.hasViolations,
    };
  }

  const directReply = buildCoverageAccuracyReply(userMessage, context, history);
  if (directReply) {
    const finalReply = finalizeReply(directReply, {
      profile,
      intent: 'coverage',
      sources: contextSources,
      sensitive: true,
      context,
    });
    const validation = validateResponsePayload(finalReply, context);
    return {
      message: finalReply,
      error: null,
      details: null,
      warnings: validation.warnings,
      hasViolations: validation.hasViolations,
    };
  }

  const contextInjection = buildContextInjection(context);
  const authoritativeFacts = buildAuthoritativeFacts(context, userMessage, profile);
  const recentConversationFocus = buildRecentConversationFocus(history);
  const datasetBlock = buildRelevantDatasetBlock(intent, userMessage, context, profile);
  const groundedMessage = buildGroundedMessage(userMessage, context, profile, datasetBlock.block);
  const guardrailBlock = [
    `Reply language style: ${profile.lang === 'ceb' ? 'Cebuano/Bisaya only' : profile.lang === 'en' ? 'English only' : profile.style === 'taglish' ? 'Taglish only' : 'Filipino only'}.`,
    `Detected intent: ${intent}.`,
    'Use only KoberKo dataset blocks below. Do not use outside memory or guessed PhilHealth facts.',
    'If a source is present in the dataset block, cite it directly in the answer. If the dataset block says no exact citation is stored, say that clearly and tell the user to verify.',
    'If Intake context exists, use it and do not ask the user to repeat it.',
    'If the user is stressed, acknowledge the emotion in one short sentence before the practical answer.',
    'Never diagnose. For symptom questions, give urgency direction only.',
    'If the user asks about billing, surface the billing script proactively.',
    'If the user asks about remaining bills or assistance, explain Malasakit Center, PCSO MAP, and DSWD AICS.',
    'End with one clear next-step offer.',
  ].join('\n');
  const userContent = contextInjection
    ? `${guardrailBlock}\n\n${contextInjection}${authoritativeFacts ? `\n\n${authoritativeFacts}` : ''}${recentConversationFocus ? `\n\n${recentConversationFocus}` : ''}\n\n${groundedMessage}`
    : `${guardrailBlock}${authoritativeFacts ? `\n\n${authoritativeFacts}` : ''}${recentConversationFocus ? `\n\n${recentConversationFocus}` : ''}\n\n${groundedMessage}`;

  const messages = [
    { role: 'system', content: CHAT_SYSTEM_PROMPT },
    ...mapHistory(history),
    { role: 'user', content: userContent },
  ];

  const configured = await getGroqStatus();
  if (!configured) {
    return {
      message: null,
      error: 'missing_key',
      details: null,
      warnings: [],
      hasViolations: false,
    };
  }

  const result = await callGroq(messages, { temperature: 0.2, maxTokens: 500 });

  if (result.error) {
    return {
      message: null,
      error: result.error,
      details: result.details ?? null,
      warnings: [],
      hasViolations: false,
    };
  }

  const responseText = result.content?.trim() || null;
  const finalReply = responseText
    ? finalizeReply(responseText, {
        profile,
        intent,
        sources: [...new Set([...contextSources, ...datasetBlock.sources])],
        sensitive: ['coverage', 'billing', 'documents', 'eligibility', 'claim_denied', 'reimbursement', 'financial_help'].includes(intent) || Boolean(context),
        allowDatasetOnly: ['claim_denied', 'reimbursement', 'medicine', 'rhu', 'urgency'].includes(intent),
        forceEmotion: stressed,
        context,
      })
    : null;
  const validation = finalReply
    ? validateResponsePayload(finalReply, context)
    : { warnings: [], hasViolations: false };

  return {
    message: finalReply,
    error: null,
    details: null,
    warnings: validation.warnings,
    hasViolations: validation.hasViolations,
  };
}

export async function identifyConditionFromSymptoms(symptomsText, lang = 'fil') {
  const cleaned = symptomsText.trim();
  if (!cleaned) {
    return [];
  }

  const heuristicMatches = buildHeuristicMatches(cleaned);

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return heuristicMatches;
  }

  const configured = await getGroqStatus();
  if (!configured) {
    return heuristicMatches;
  }

  const prompt = `Identify the top 3 most likely PhilHealth-covered conditions from this symptom description: "${cleaned}".

Return ONLY a JSON array with this exact shape:
[
  {
    "conditionId": "CAP",
    "conditionName_fil": "Pulmonya (Community-Acquired Pneumonia)",
    "conditionName_en": "Community-Acquired Pneumonia",
    "confidence": "high",
    "reason_fil": "Maikling paliwanag sa Filipino",
    "reason_en": "Short explanation in English"
  }
]

Rules:
- Choose only from these condition IDs: ${conditions.map((condition) => condition.id).join(', ')}
- 0 to 3 items only
- This is NOT medical advice
- Use Filipino explanations when the user language is Filipino; otherwise English explanations are still required
- No markdown, no extra text, JSON only.`;

  const response = await callGroq(
    [
      { role: 'system', content: SYMPTOM_MATCH_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    { temperature: 0.1, maxTokens: 500 },
  );

  if (response.error || !response.content) {
    return heuristicMatches;
  }

  const parsed = extractJson(response.content);
  if (!Array.isArray(parsed) || !parsed.length) {
    return heuristicMatches;
  }

  const valid = parsed
    .map((item) => {
      const condition = conditions.find((entry) => entry.id === item.conditionId);
      if (!condition) {
        return null;
      }

      return {
        conditionId: condition.id,
        conditionName_fil: item.conditionName_fil || condition.name_fil,
        conditionName_en: item.conditionName_en || condition.name_en,
        confidence: ['high', 'medium', 'low'].includes(item.confidence)
          ? item.confidence
          : 'medium',
        reason_fil:
          item.reason_fil ||
          heuristicMatches.find((match) => match.conditionId === condition.id)?.reason_fil ||
          `Maaaring tumugma ang mga sintomas sa ${condition.name_fil}.`,
        reason_en:
          item.reason_en ||
          heuristicMatches.find((match) => match.conditionId === condition.id)?.reason_en ||
          `The symptoms may line up with ${condition.name_en}.`,
      };
    })
    .filter(Boolean)
    .slice(0, 3);

  return valid.length ? valid : heuristicMatches;
}

export function buildQuickPrompt(buttonKey, context, lang) {
  const conditionName = context?.conditionName || context?.conditionName_fil || context?.conditionName_en || 'the current condition';
  const level = context?.hospitalLevel ? ` at ${context.hospitalLevel}` : '';
  const memberType = context?.memberType || 'the current membership';
  const amount = context?.coverageAmount ? `PHP ${context.coverageAmount}` : 'the current coverage amount';
  const isFil = lang === 'fil';
  const isCeb = lang === 'ceb';

  const prompts = {
    direct_filing: isCeb
      ? `Pwede ba ang direct filing para sa ${conditionName}${level}? Tubaga diretso: oo o dili, unsay pasabot niini para sa ${memberType} nga miyembro, ug unsay sunod buhaton sa admitting o billing.`
      : isFil
      ? `Pwede bang mag-direct file para sa ${conditionName}${level}? Sagutin nang direkta: oo o hindi, ano ang ibig sabihin nito para sa ${memberType} member, at ano ang susunod na dapat gawin sa admitting o billing.`
      : `Can this case direct file for ${conditionName}${level}? Answer directly: yes or no, what that means for a ${memberType} member, and the next thing to do at admitting or billing.`,
    documents: isCeb
      ? `Unsa nga mga dokumento ang kinahanglan para sa ${conditionName}? Ihatag ang pinakapraktikal ug mubo nga checklist ug isulti kung unsa ang kinahanglan makuha sa dili pa mogawas sa ospital.`
      : isFil
      ? `Ano ang mga dokumentong kailangan para sa ${conditionName}? Ibigay ang pinakamaikling practical checklist at sabihin kung alin ang kailangang kunin bago umalis sa ospital.`
      : `What documents are needed for ${conditionName}? Give the shortest practical checklist and say which ones must be collected before leaving the hospital.`,
    copay: isCeb
      ? `Tagpila ang posibleng mabayran human sa PhilHealth coverage nga ${amount}? Unaha ang direktang tubag, dayon ibulag ang PhilHealth amount, posibleng co-pay, ug ang pinakimportante nga hinungdan nganong mahimo pa kini mausab.`
      : isFil
      ? `Magkano ang posibleng babayaran matapos ang PhilHealth coverage na ${amount}? Unahin ang direct answer, tapos ihiwalay ang PhilHealth amount, posibleng co-pay, at pinakamahalagang dahilan kung bakit puwedeng magbago ito.`
      : `How much will likely be paid after the PhilHealth coverage of ${amount}? Start with the direct answer, then separate the PhilHealth amount, likely co-pay, and the most important reason it may change.`,
    billing_refusal: isCeb
      ? `Dili modawat ang ospital ug direct filing. Ihatag dayon ang eksaktong script nga isulti sa billing, dayon ang hotline ug ang sunod nga escalation step.`
      : isFil
      ? `Ayaw mag-direct file ng ospital. Ibigay agad ang exact script na sasabihin sa billing, pagkatapos ang hotline at ang susunod na escalation step.`
      : `The hospital refuses to direct file. Give the exact script to say at billing first, then the hotline and the next escalation step.`,
    other_benefits: isCeb
      ? `Aduna pa bay laing benepisyo para sa ${memberType} nga miyembro gawas sa main coverage? Isulti lang ang tinuod nga relevant sa kasamtangang sitwasyon ug unaha ang pinakpraktikal.`
      : isFil
      ? `May iba pa bang benepisyo para sa ${memberType} member bukod sa pangunahing coverage? Banggitin lamang ang mga talagang relevant sa kasalukuyang sitwasyon at unahin ang pinakamataas ang practical value.`
      : `Are there other benefits for a ${memberType} member besides the main coverage? Mention only the ones actually relevant to the current case and put the most practical one first.`,
    konsulta: isCeb
      ? `Unsa ang tibuok PhilHealth Konsulta Package para sa ${memberType} nga miyembro? Ipasabot ang free consultations, lab tests, tambal, dental benefits, unsaon pagkuha sa ATC, ug ipahinumdom nga lahi kini sa hospitalization benefits.`
      : isFil
      ? `Ano ang buong PhilHealth Konsulta Package para sa ${memberType} member? Ipaliwanag ang free consultations, lab tests, gamot, dental benefits, paano kumuha ng ATC, at ipaalala na hiwalay ito sa hospitalization benefits.`
      : `What is the full PhilHealth Konsulta Package for a ${memberType} member? Explain the free consultations, lab tests, medicines, dental benefits, how to get an ATC, and remind me that this is separate from hospitalization benefits.`,
    claim_denied: isCeb
      ? 'Na-deny ang among PhilHealth claim. Unaha ang pinakalikely nga rason base sa sitwasyon, isulti kung pwede ba kini i-appeal, ug ilista ang eksaktong sunod nga lakang para sa Motion for Reconsideration, PARD, ug PhilHealth Board. Iapil ang 2025 reprocessing update para sa late-filed claims.'
      : isFil
      ? 'Na-deny ang aming PhilHealth claim. Unahin ang pinaka-posibleng dahilan batay sa sitwasyon, sabihin kung puwedeng i-appeal, at ilista ang exact next steps para sa Motion for Reconsideration, PARD, at PhilHealth Board. Isama ang 2025 reprocessing update para sa late-filed claims.'
      : 'Our PhilHealth claim was denied. Start with the most likely reason based on the current situation, say whether it can be appealed, and list the exact next steps for Motion for Reconsideration, PARD, and the PhilHealth Board. Include the 2025 reprocessing update for late-filed claims.',
    reimbursement: isCeb
      ? `Unsaon ang reimbursement para ani nga sitwasyon? Ihatag ang labing importanteng step-by-step, ang 60-day deadline, ug ang mga dokumentong kinahanglan makuha sa dili pa mogawas sa ospital.`
      : isFil
      ? `Paano magre-reimburse para sa sitwasyong ito? Ibigay ang step-by-step na pinakamahalaga, ang 60-day deadline, at ang mga dokumentong dapat kunin bago umalis sa ospital.`
      : `How do we reimburse in this scenario? Give the most important step-by-step actions, the 60-day deadline, and the documents that must be collected before leaving the hospital.`,
    malasakit: isCeb
      ? `Unsa ang Malasakit Center ug unsaon kini pagtabang dinhi? Tubaga base sa kasamtangang membership ug hospital context kung relevant ba kini o dili.`
      : isFil
      ? `Ano ang Malasakit Center at paano ito makakatulong dito? Sagutin batay sa kasalukuyang membership at hospital context kung relevant ito o hindi.`
      : `What is the Malasakit Center and how can it help here? Answer based on the current membership and hospital context, including whether it is actually relevant here.`,
    eligibility: isCeb
      ? `Eligible ba mi ani nga PhilHealth coverage base sa membership ug edad sa pasyente? Tubaga ang pinakalikely nga status, ang main risk, ug ang pinakaimportanteng dapat dayon i-check sa ePhilHealth.`
      : isFil
      ? `Eligible ba kami sa PhilHealth coverage na ito batay sa membership at edad ng pasyente? Sagutin ang pinaka-likely status, ang pangunahing risk, at ang pinakamahalagang dapat i-check agad sa ePhilHealth.`
      : `Are we eligible for this PhilHealth coverage based on the membership and patient age? Answer the most likely status, the main risk, and the most important thing to check immediately in ePhilHealth.`,
  };

  return prompts[buttonKey] || (isCeb
    ? 'Tabangi ko ani nga PhilHealth coverage case.'
    : isFil
      ? 'Tulungan mo ako sa PhilHealth coverage na ito.'
      : 'Help me with this PhilHealth coverage case.');
}
