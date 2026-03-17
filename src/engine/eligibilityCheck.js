const ESERVICES_URL = 'https://memberinquiry.philhealth.gov.ph/member/';
const NO_CONTRIBUTION_MEMBERS = new Set(['NHTS', 'SPONSORED', 'SENIOR', 'LIFETIME', 'KASAMBAHAY']);
const CONTRIBUTION_CHECK_MEMBERS = new Set(['SSS', 'GSIS', 'VOLUNTARY', 'OFW', 'PWD']);

function normalizeDateInput(dateInput) {
  if (!dateInput) {
    return null;
  }

  if (typeof dateInput === 'string') {
    const [year, month] = dateInput.split('-').map(Number);
    if (!year || !month) {
      return null;
    }
    return { year, month };
  }

  if (typeof dateInput === 'object') {
    const year = Number(dateInput.year);
    const month = Number(dateInput.month);
    if (!year || !month) {
      return null;
    }
    return { year, month };
  }

  return null;
}

function diffInMonths(fromDate, toDate) {
  return (toDate.year - fromDate.year) * 12 + (toDate.month - fromDate.month);
}

export function checkEligibility(memberType, lastContributionDate, plannedAdmissionDate) {
  if (!memberType) {
    return null;
  }

  if (NO_CONTRIBUTION_MEMBERS.has(memberType)) {
    return {
      eligible: true,
      reason: 'no_contribution_required',
      monthsAgo: 0,
      message_fil: 'Malamang eligible ka. Walang contribution check na kailangan para sa membership type na ito.',
      message_en: 'You are likely eligible. No contribution check is needed for this membership type.',
      warningNote_fil: null,
      warningNote_en: null,
      actionUrl: ESERVICES_URL,
    };
  }

  if (!CONTRIBUTION_CHECK_MEMBERS.has(memberType)) {
    return null;
  }

  const normalizedLastContribution = normalizeDateInput(lastContributionDate);
  const normalizedPlannedAdmission = normalizeDateInput(plannedAdmissionDate);

  if (!normalizedLastContribution || !normalizedPlannedAdmission) {
    return null;
  }

  const monthsAgo = diffInMonths(normalizedLastContribution, normalizedPlannedAdmission);

  if (monthsAgo < 0) {
    return {
      eligible: 'at_risk',
      monthsAgo,
      message_fil: 'Pakicheck ang mga petsa. Mukhang mas huli ang contribution date kaysa planned admission date.',
      message_en: 'Please double-check the dates. The contribution date appears later than the planned admission date.',
      warningNote_fil: 'Tantya lamang ito. I-verify ang contribution history sa ePhilHealth bago mag-admit.',
      warningNote_en: 'This is only an estimate. Verify the contribution history on ePhilHealth before admission.',
      actionUrl: ESERVICES_URL,
    };
  }

  if (monthsAgo <= 6) {
    return {
      eligible: true,
      monthsAgo,
      message_fil: `Ang huli mong hulog ay ${monthsAgo} buwan pa lang bago ang planong admission, kaya malamang pasok pa ito sa 6-month window.`,
      message_en: `Your last contribution was ${monthsAgo} month${monthsAgo === 1 ? '' : 's'} before the planned admission, so it likely still falls within the 6-month window.`,
      warningNote_fil: 'I-check pa rin sa ePhilHealth kung posted at kumpleto ang hulog.',
      warningNote_en: 'Still verify on ePhilHealth that the contribution is posted and complete.',
      actionUrl: ESERVICES_URL,
    };
  }

  if (monthsAgo <= 12) {
    return {
      eligible: 'at_risk',
      monthsAgo,
      message_fil: `Ang huli mong hulog ay ${monthsAgo} buwan na ang nakalipas, kaya may risk na hindi sapat ang contribution history para sa admission na ito.`,
      message_en: `Your last contribution was ${monthsAgo} months ago, so there is a risk that the contribution history may not be enough for this admission.`,
      warningNote_fil: 'I-check agad ang contribution history at MDR sa ePhilHealth bago mag-admit.',
      warningNote_en: 'Check the contribution history and MDR on ePhilHealth before admission.',
      actionUrl: ESERVICES_URL,
    };
  }

  return {
    eligible: false,
    monthsAgo,
    message_fil: `Ang huli mong hulog ay ${monthsAgo} buwan na ang nakalipas, kaya malamang hindi sapat ang contribution record para sa planned admission na ito.`,
    message_en: `Your last contribution was ${monthsAgo} months ago, so the contribution record is likely not enough for this planned admission.`,
    warningNote_fil: 'Hindi pa ito final decision. I-verify sa ePhilHealth o sa PhilHealth coordinator bago mag-admit.',
    warningNote_en: 'This is not a final decision. Verify on ePhilHealth or with the PhilHealth coordinator before admission.',
    actionUrl: ESERVICES_URL,
  };
}
