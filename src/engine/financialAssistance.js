import { pickLocale } from '../utils/localize';
import assistanceData from '../data/financial_assistance.json';

export const HIGH_COPAY_THRESHOLD = 15000;

export function getEstimatedRemainingBalance(coverage, exactCopay = null) {
  if (typeof exactCopay === 'number' && Number.isFinite(exactCopay)) {
    return exactCopay;
  }

  if (typeof coverage?.copayMax === 'number' && Number.isFinite(coverage.copayMax)) {
    return coverage.copayMax;
  }

  return null;
}

export function shouldShowFinancialAssistance(coverage, zbbStatus, exactCopay = null) {
  if (!coverage || zbbStatus?.zbbApplies) {
    return false;
  }

  const remaining = getEstimatedRemainingBalance(coverage, exactCopay);
  return typeof remaining === 'number' && remaining >= HIGH_COPAY_THRESHOLD;
}

export function getFinancialAssistancePrograms(lang = 'en', options = {}) {
  const { hospitalType = '', hospitalHasMalasakitCenter = false } = options;
  const programs = assistanceData.programs.map((program) => ({
    key: program.key,
    title: pickLocale(program.title_en, program.title_fil, program.title_ceb, lang),
    summary: pickLocale(program.summary_en, program.summary_fil, program.summary_ceb, lang),
    bestFor: pickLocale(program.best_for_en, program.best_for_fil, program.best_for_ceb, lang),
    documents: pickLocale(program.documents_en, program.documents_fil, program.documents_ceb, lang),
    steps: pickLocale(program.steps_en, program.steps_fil, program.steps_ceb, lang),
    note: pickLocale(program.note_en, program.note_fil, program.note_ceb, lang),
    sourceLabel: pickLocale(program.source_label_en, program.source_label_fil, program.source_label_ceb, lang),
    sourceUrl: program.source_url,
    sourceLabel2: lang === 'en' ? program.source_label_2_en || '' : program.source_label_2_fil || '',
    sourceUrl2: program.source_url_2 || '',
  }));

  const malasakitRank = hospitalHasMalasakitCenter || hospitalType === 'DOH' ? 0 : 2;
  const order = {
    malasakit: malasakitRank,
    pcso: hospitalType === 'PRIVATE' ? 0 : 1,
    dswd: hospitalType === 'PRIVATE' ? 1 : 2,
  };

  return programs.sort((a, b) => {
    const aRank = order[a.key] ?? 99;
    const bRank = order[b.key] ?? 99;
    return aRank - bRank;
  });
}
