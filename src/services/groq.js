import conditions from '../data/conditions.json';
import conditionDetails from '../data/condition_details.json';
import { getCoverage, getZBBStatus, searchConditions } from '../engine/coverage';
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
1. Always respond in the same language the user writes in (Filipino, English, or Taglish)
2. Be SPECIFIC - give exact peso amounts, not vague "PhilHealth will cover a portion"
3. For stressed users at a billing counter: skip pleasantries, give the script immediately
4. Always mention ZBB when user is at a DOH hospital in ward accommodation
5. Always mention the dual benefit (PhilHealth + senior discount / PhilHealth + PWD discount) when applicable
6. For NBB-eligible members in government hospitals: remind them they should pay ZERO
7. For any billing violation: be assertive, give exact words to say, give PhilHealth hotline (02) 866-225-88
8. Remind users to verify amounts with hospital - rates can change
9. No medical advice - redirect to doctor for medical decisions
10. Mention memberinquiry.philhealth.gov.ph/member/ for contribution checks and online reimbursement`;

const SYSTEM_PROMPT = `[IDENTITY AND ROLE]
You are KoberKo, a PhilHealth coverage assistant for Filipino families.
You are warm, direct, and patient - like a trusted friend who works at PhilHealth.
Your PRIMARY job is accuracy. A wrong number causes real financial harm to a real family.

[GROUNDING RULE - MOST IMPORTANT]
When a [KOBERKO DATA] block is present in the message:
- ALWAYS use those figures as your primary source
- NEVER contradict or replace those figures with your own estimates
- If the data says PHP 29,250, you say PHP 29,250 - never "approximately PHP 10,000-P20,000"
- If confidence is "estimated", you MUST add a caveat when citing the amount

When NO [KOBERKO DATA] block is present:
- Use your PhilHealth knowledge to answer
- For any specific peso amount you cite: add "(I-verify ito sa inyong ospital)" or "(verify this with your hospital)"
- For general rules and processes: you can answer confidently without caveat

[CHAIN-OF-THOUGHT RULE]
For any question involving peso amounts or eligibility:
Before answering, silently work through these steps:
1. Is there a [KOBERKO DATA] block? If yes, use those figures.
2. Is the question about a specific amount I'm confident about from my training? If yes, cite it with a verify caveat.
3. Is this a general PhilHealth rule or process? If yes, answer confidently.
4. Am I uncertain? If yes, say so explicitly and redirect.

Do NOT show this reasoning to the user - just apply it.

[HARD REFUSAL RULES - NEVER BREAK THESE]
1. NEVER invent a specific peso amount that is not in the [KOBERKO DATA] block
   and that you are not highly confident about from official PhilHealth circulars.
   If unsure: say "Hindi ko sigurado sa eksaktong halaga - i-confirm sa PhilHealth
   coordinator ng ospital" / "I'm not certain of the exact amount - confirm with
   the hospital's PhilHealth coordinator."

2. NEVER claim a condition is covered if you are not certain it has a PhilHealth package.
   If unsure: say "Hindi ko sigurado kung may PhilHealth package ang kondisyong ito -
   itanong sa ospital" / "I'm not certain if this condition has a PhilHealth package -
   ask the hospital."

3. NEVER give medical advice - dosage, treatment choice, diagnosis.
   Redirect immediately: "Para sa medikal na desisyon, ang inyong doktor ang dapat
   tanungin" / "For medical decisions, please consult your doctor."

4. NEVER say a claim will definitely be approved - you cannot guarantee this.
   Instead: "Kung kumpleto ang mga dokumento at aktibo ang membership, mataas
   ang tsansa na maaprubahan" / "If documents are complete and membership is active,
   the chances of approval are high."

5. NEVER give a single definitive co-pay amount - only ranges.
   Co-pay depends on room choice, actual charges, and doctor's fees.

6. If asked something you genuinely don't know: say so clearly.
   "Hindi ko alam ang sagot sa tanong na iyon. Para sa tumpak na impormasyon,
   tumawag sa PhilHealth hotline: (02) 866-225-88."
   / "I don't know the answer to that. For accurate information,
   call the PhilHealth hotline: (02) 866-225-88."

[CONFIDENCE SIGNALING]
When you cite an amount from your training (not from [KOBERKO DATA]):
- High confidence (from official circular): cite amount + "(batay sa [circular name])"
- Medium confidence (general knowledge): cite amount + "(i-verify sa ospital)"
- Low confidence (uncertain): do NOT cite a specific amount

[LENGTH AND FORMAT RULE]
Stressed families don't read essays. Maximum 3 short paragraphs per response.
If the answer requires more, give the 3 most important points and offer to elaborate.
For BILLING COUNTER scenario: 1 paragraph maximum. Script first. Explanation second.

[LANGUAGE RULE]
Always respond in the same language the user writes in.
Filipino -> Filipino. English -> English. Taglish -> Taglish.
Never switch languages mid-response without a reason.

[FOLLOW-UP RULE]
If the user asks a short follow-up like "what about severe?", "how about private room?", "and if senior?", or "break that down":
- Assume they are referring to the current KoberKo context and the most recent resolved topic unless they clearly change topics
- Answer the changed part first
- Do NOT repeat the full previous explanation unless it is necessary

[RESPONSE SHAPE]
Whenever possible, structure the answer in this order:
1. Direct answer first
2. Exact amount or rule second
3. Best next action third

For context-rich questions, make the first sentence useful enough to stand on its own.
For judge-facing quality, sound clear, decisive, and grounded - not generic.

[WHAT YOU KNOW - YOUR KNOWLEDGE BASE]
${KNOWLEDGE_BASE}

[ESCALATION - ALWAYS AVAILABLE]
At the end of any complex response, offer:
"Para sa mas detalyadong tulong, tumawag sa PhilHealth hotline: (02) 866-225-88"
/ "For more detailed help, call the PhilHealth hotline: (02) 866-225-88"
Include this when: claim denials, billing disputes, eligibility issues, reimbursement problems.`;

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

function buildGroundedMessage(userMessage, context, lang) {
  if (!context || !context.conditionId || !context.memberType || !context.hospitalLevel) {
    return userMessage;
  }

  const coverage = getCoverage(
    context.conditionId,
    context.memberType,
    context.hospitalLevel,
    { variantKey: context.coverageVariantKey || undefined },
  );

  if (!coverage) {
    return userMessage;
  }

  const groundingBlock = lang === 'fil'
    ? `
[KOBERKO DATA - GAMITIN ITO BILANG PANGUNAHING SANGGUNIAN]
Kondisyon: ${coverage.conditionName_fil}
PhilHealth bayad: P${coverage.amount.toLocaleString()}
Direct filing: ${coverage.directFiling ? 'OO' : 'HINDI'}
Circular: ${coverage.circular}
Confidence: ${coverage.confidence}
Membership: ${context.memberType}
Hospital level: ${context.hospitalLevel}
Hospital type: ${context.hospitalType || 'UNKNOWN'}
Room type: ${context.roomType || 'UNKNOWN'}
Variant used: ${coverage.variantUsed_fil || coverage.packageName_fil}
[KATAPUSAN NG KOBERKO DATA]

Tanong ng user: `
    : `
[KOBERKO DATA - USE THIS AS PRIMARY REFERENCE]
Condition: ${coverage.conditionName_en}
PhilHealth pays: P${coverage.amount.toLocaleString()}
Direct filing: ${coverage.directFiling ? 'YES' : 'NO'}
Circular: ${coverage.circular}
Confidence: ${coverage.confidence}
Membership: ${context.memberType}
Hospital level: ${context.hospitalLevel}
Hospital type: ${context.hospitalType || 'UNKNOWN'}
Room type: ${context.roomType || 'UNKNOWN'}
Variant used: ${coverage.variantUsed_en || coverage.packageName_en}
[END KOBERKO DATA]

User question: `;

  return `${groundingBlock}${userMessage}`;
}

function detectReplyLanguage(userMessage = '') {
  const text = userMessage.trim();
  if (!text) {
    return 'fil';
  }

  const normalized = normalize(text);
  const filipinoSignals = [
    'po',
    'ba',
    'magkano',
    'pwede',
    'paano',
    'tatay',
    'nanay',
    'ospital',
    'babayaran',
    'sakit',
    'admit',
    'kami',
    'namin',
    'amin',
    'ibig',
    'kailangan',
    'doktor',
  ];

  return filipinoSignals.some((term) => normalized.includes(term)) ? 'fil' : 'en';
}

function extractCurrencyAmount(text = '') {
  const match = text.replace(/,/g, '').match(/(\d{1,7})(?:\.\d{1,2})?/);
  return match ? Number(match[1]) : null;
}

function isAffirmative(text = '') {
  const normalized = normalize(text).trim();
  return ['yes', 'oo', 'opo', 'sige', 'yes i wanna know', 'yes, i wanna know'].includes(normalized);
}

function hasAnyTerm(text = '', terms = []) {
  const normalized = normalize(text);
  return terms.some((term) => normalized.includes(normalize(term)));
}

function findConditionFromText(text = '') {
  const matches = searchConditions(text, 'en');
  return matches[0] ?? null;
}

function buildAuthoritativeFacts(context, userMessage) {
  const derivedCondition =
    (context?.conditionId && conditions.find((condition) => condition.id === context.conditionId)) ||
    findConditionFromText(userMessage);
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

function findLatestAmountInHistory(history = []) {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const amount = extractCurrencyAmount(history[index]?.content ?? '');
    if (amount !== null) {
      return amount;
    }
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
  const language = detectReplyLanguage(currentText);
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
  const variantName = language === 'en' ? bestMatch.item.name_en : bestMatch.item.name_fil;
  const currentVariant = language === 'en'
    ? coverage.variantUsed_en || coverage.packageName_en
    : coverage.variantUsed_fil || coverage.packageName_fil;

  if (language === 'en') {
    return `For ${variantName}, the PhilHealth amount is PHP ${bestMatch.item.amount.toLocaleString()}. The current result screen is using ${currentVariant}, so this follow-up is a different official package variant. Ask the hospital to confirm the exact diagnosis or treatment variant they are filing.`;
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
  const language = detectReplyLanguage(currentText);
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

    return `Kung PhilHealth coverage ang ibig mong sabihin para sa kasalukuyang ${condition}${level ? ` sa ${level}` : ''}, ang nasa KoberKo ay PHP ${expectedAmount.toLocaleString()}. Kung total hospital bill o sariling babayaran ang tinutukoy mo, sabihin mo lang at ibi-breakdown ko iyon.`;
  }

  const isAccurate = mentionedAmount === expectedAmount;

  if (language === 'en') {
    return isAccurate
      ? `Yes. If you mean the PhilHealth coverage amount for the current ${condition}${level ? ` at ${level}` : ''}, PHP ${mentionedAmount.toLocaleString()} matches KoberKo's local data. That is the PhilHealth package amount, not the total hospital bill.`
      : `No. If you mean the PhilHealth coverage amount for the current ${condition}${level ? ` at ${level}` : ''}, KoberKo's local data shows PHP ${expectedAmount.toLocaleString()}, not PHP ${mentionedAmount.toLocaleString()}. That figure is the PhilHealth package amount, not the total hospital bill.`;
  }

  return isAccurate
    ? `Oo. Kung PhilHealth coverage amount ang tinutukoy mo para sa kasalukuyang ${condition}${level ? ` sa ${level}` : ''}, tugma ang PHP ${mentionedAmount.toLocaleString()} sa local data ng KoberKo. PhilHealth package amount ito, hindi pa ito ang kabuuang hospital bill.`
    : `Hindi. Kung PhilHealth coverage amount ang tinutukoy mo para sa kasalukuyang ${condition}${level ? ` sa ${level}` : ''}, ang local data ng KoberKo ay PHP ${expectedAmount.toLocaleString()}, hindi PHP ${mentionedAmount.toLocaleString()}. PhilHealth package amount ito, hindi pa ito ang kabuuang hospital bill.`;
}

function mapHistory(history = []) {
  return history
    .slice(-8)
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
  const variantReply = buildVariantFollowUpReply(userMessage, context);
  if (variantReply) {
    const validation = validateResponsePayload(variantReply, context);
    return {
      message: variantReply,
      error: null,
      details: null,
      warnings: validation.warnings,
      hasViolations: validation.hasViolations,
    };
  }

  const scenarioReply = buildScenarioFollowUpReply(userMessage, context);
  if (scenarioReply) {
    const validation = validateResponsePayload(scenarioReply, context);
    return {
      message: scenarioReply,
      error: null,
      details: null,
      warnings: validation.warnings,
      hasViolations: validation.hasViolations,
    };
  }

  const breakdownReply = buildCostBreakdownReply(userMessage, context, history);
  if (breakdownReply) {
    const validation = validateResponsePayload(breakdownReply, context);
    return {
      message: breakdownReply,
      error: null,
      details: null,
      warnings: validation.warnings,
      hasViolations: validation.hasViolations,
    };
  }

  const directReply = buildCoverageAccuracyReply(userMessage, context, history);
  if (directReply) {
    const validation = validateResponsePayload(directReply, context);
    return {
      message: directReply,
      error: null,
      details: null,
      warnings: validation.warnings,
      hasViolations: validation.hasViolations,
    };
  }

  const contextInjection = buildContextInjection(context);
  const authoritativeFacts = buildAuthoritativeFacts(context, userMessage);
  const recentConversationFocus = buildRecentConversationFocus(history);
  const replyLanguage = detectReplyLanguage(userMessage);
  const groundedMessage = buildGroundedMessage(userMessage, context, replyLanguage);
  const guardrailBlock = [
    `Reply language: ${replyLanguage === 'fil' ? 'Filipino or Taglish only' : 'English only'}.`,
    'If authoritative KoberKo facts are provided, you MUST use them and must not replace them with other recalled numbers.',
    'If the user asks about a projection or estimate and there is no authoritative resolved amount, ask one short clarification question instead of guessing.',
    'Do not say "I checked the case rates for you" unless the authoritative facts block below actually contains a resolved amount.',
    'For short follow-ups, assume the user means the current KoberKo context and the most recent resolved topic unless they clearly changed topic.',
    'For follow-ups, answer the changed part first and avoid repeating the whole explanation.',
    'When a strong context is present, sound decisive and grounded: direct answer first, exact amount or rule second, next step third.',
  ].join('\n');
  const userContent = contextInjection
    ? `${guardrailBlock}\n\n${contextInjection}${authoritativeFacts ? `\n\n${authoritativeFacts}` : ''}${recentConversationFocus ? `\n\n${recentConversationFocus}` : ''}\n\n${groundedMessage}`
    : `${guardrailBlock}${authoritativeFacts ? `\n\n${authoritativeFacts}` : ''}${recentConversationFocus ? `\n\n${recentConversationFocus}` : ''}\n\n${groundedMessage}`;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
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

  const result = await callGroq(messages, { temperature: 0.2, maxTokens: 1000 });

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
  const validation = responseText
    ? validateResponsePayload(responseText, context)
    : { warnings: [], hasViolations: false };

  return {
    message: responseText,
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
      { role: 'system', content: SYSTEM_PROMPT },
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
  const isFil = lang !== 'en';

  const prompts = {
    direct_filing: isFil
      ? `Pwede bang mag-direct file para sa ${conditionName}${level}? Sagutin nang direkta: oo o hindi, ano ang ibig sabihin nito para sa ${memberType} member, at ano ang susunod na dapat gawin sa admitting o billing.`
      : `Can this case direct file for ${conditionName}${level}? Answer directly: yes or no, what that means for a ${memberType} member, and the next thing to do at admitting or billing.`,
    documents: isFil
      ? `Ano ang mga dokumentong kailangan para sa ${conditionName}? Ibigay ang pinakamaikling practical checklist at sabihin kung alin ang kailangang kunin bago umalis sa ospital.`
      : `What documents are needed for ${conditionName}? Give the shortest practical checklist and say which ones must be collected before leaving the hospital.`,
    copay: isFil
      ? `Magkano ang posibleng babayaran matapos ang PhilHealth coverage na ${amount}? Unahin ang direct answer, tapos ihiwalay ang PhilHealth amount, posibleng co-pay, at pinakamahalagang dahilan kung bakit puwedeng magbago ito.`
      : `How much will likely be paid after the PhilHealth coverage of ${amount}? Start with the direct answer, then separate the PhilHealth amount, likely co-pay, and the most important reason it may change.`,
    billing_refusal: isFil
      ? `Ayaw mag-direct file ng ospital. Ibigay agad ang exact script na sasabihin sa billing, pagkatapos ang hotline at ang susunod na escalation step.`
      : `The hospital refuses to direct file. Give the exact script to say at billing first, then the hotline and the next escalation step.`,
    other_benefits: isFil
      ? `May iba pa bang benepisyo para sa ${memberType} member bukod sa pangunahing coverage? Banggitin lamang ang mga talagang relevant sa kasalukuyang sitwasyon at unahin ang pinakamataas ang practical value.`
      : `Are there other benefits for a ${memberType} member besides the main coverage? Mention only the ones actually relevant to the current case and put the most practical one first.`,
    konsulta: isFil
      ? `Ano ang buong PhilHealth Konsulta Package para sa ${memberType} member? Ipaliwanag ang free consultations, lab tests, gamot, dental benefits, paano kumuha ng ATC, at ipaalala na hiwalay ito sa hospitalization benefits.`
      : `What is the full PhilHealth Konsulta Package for a ${memberType} member? Explain the free consultations, lab tests, medicines, dental benefits, how to get an ATC, and remind me that this is separate from hospitalization benefits.`,
    claim_denied: isFil
      ? 'Na-deny ang aming PhilHealth claim. Unahin ang pinaka-posibleng dahilan batay sa sitwasyon, sabihin kung puwedeng i-appeal, at ilista ang exact next steps para sa Motion for Reconsideration, PARD, at PhilHealth Board. Isama ang 2025 reprocessing update para sa late-filed claims.'
      : 'Our PhilHealth claim was denied. Start with the most likely reason based on the current situation, say whether it can be appealed, and list the exact next steps for Motion for Reconsideration, PARD, and the PhilHealth Board. Include the 2025 reprocessing update for late-filed claims.',
    reimbursement: isFil
      ? `Paano magre-reimburse para sa sitwasyong ito? Ibigay ang step-by-step na pinakamahalaga, ang 60-day deadline, at ang mga dokumentong dapat kunin bago umalis sa ospital.`
      : `How do we reimburse in this scenario? Give the most important step-by-step actions, the 60-day deadline, and the documents that must be collected before leaving the hospital.`,
    malasakit: isFil
      ? `Ano ang Malasakit Center at paano ito makakatulong dito? Sagutin batay sa kasalukuyang membership at hospital context kung relevant ito o hindi.`
      : `What is the Malasakit Center and how can it help here? Answer based on the current membership and hospital context, including whether it is actually relevant here.`,
    eligibility: isFil
      ? `Eligible ba kami sa PhilHealth coverage na ito batay sa membership at edad ng pasyente? Sagutin ang pinaka-likely status, ang pangunahing risk, at ang pinakamahalagang dapat i-check agad sa ePhilHealth.`
      : `Are we eligible for this PhilHealth coverage based on the membership and patient age? Answer the most likely status, the main risk, and the most important thing to check immediately in ePhilHealth.`,
  };

  return prompts[buttonKey] || (isFil ? 'Tulungan mo ako sa PhilHealth coverage na ito.' : 'Help me with this PhilHealth coverage case.');
}
