import { useEffect, useState } from 'react';
import Accordion from '../components/Accordion';
import Badge from '../components/Badge';
import Card from '../components/Card';
import ReimbursementGuide from '../components/ReimbursementGuide';
import ReimbursementStatusCard from '../components/ReimbursementStatusCard';
import { useToast } from '../components/Toast';
import { getMembershipOptionById } from '../constants/options';
import { useLanguage } from '../context/LanguageContext';
import { useSearch } from '../context/SearchContext';
import { getZBBStatus } from '../engine/coverage';
import {
  getEstimatedRemainingBalance,
  getFinancialAssistancePrograms,
  shouldShowFinancialAssistance,
} from '../engine/financialAssistance';
import { getHospitalById } from '../engine/hospitalSearch';
import { copyText } from '../utils/clipboard';
import './tabs.css';
import { pickLocale } from '../utils/localize';



export default function GuideTab() {
  const { lang, t } = useLanguage();
  const { searchState } = useSearch();
  const { showToast, ToastContainer } = useToast();
  const result = searchState.result;
  const reimbursementResult =
    searchState.intakeResult?.mode === 'after_discharge' ? searchState.intakeResult : null;
  const [checkedItems, setCheckedItems] = useState([]);
  const [copyState, setCopyState] = useState(false);

  useEffect(() => {
    setCheckedItems(new Array(result?.documents?.length ?? 0).fill(false));
  }, [result?.conditionId, result?.packageType, result?.documents?.length]);

  useEffect(() => {
    if (!copyState) {
      return undefined;
    }

    const timer = window.setTimeout(() => setCopyState(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  if (!result && reimbursementResult) {
    return (
      <>
        <ToastContainer />
        <div className="tab-screen guide-tab">
          <section className="tab-section">
            <div className="tab-section__header">
              <h2 className="tab-section__title">{t('guide_after_discharge_title')}</h2>
            </div>
            <p className="muted-text">{t('guide_after_discharge_sub')}</p>
          </section>

          <ReimbursementStatusCard
            claimOutcome={reimbursementResult.claimOutcome}
            deadlineText={
              reimbursementResult.claimOutcome === 'NOT_FILED'
                ? reimbursementResult.reimbursementDeadline
                : ''
            }
          />

          <ReimbursementGuide deadlineText={reimbursementResult.reimbursementDeadline} />

          {reimbursementResult.claimOutcome === 'WAITING' && reimbursementResult.waitingTimeline?.length ? (
            <Card className="saved-card">
              <h3 className="tab-section__title">{t('claim_denial_waiting_timeline_title')}</h3>
              <div className="sheet-list">
                {reimbursementResult.waitingTimeline.map((item) => (
                  <div key={item.key} className="sheet-list__item">
                    <span className="sheet-list__title">{item.title}</span>
                    <span className="muted-text">{item.body}</span>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {reimbursementResult.claimOutcome === 'DENIED' ? (
            <>
              <Card className="next-steps-card">
                <h3 className="tab-section__title">{t('intake_result_next_steps')}</h3>
                <p className="muted-text">{t('claim_denial_denied_next_steps')}</p>
              </Card>

              {reimbursementResult.reprocessing2025 ? (
                <Card variant="warning" className="saved-card">
                  <strong>{t('claim_denial_reprocessing_banner')}</strong>
                  <div className="sheet-list">
                    <span>
                      {pickLocale(
                        reimbursementResult.reprocessing2025.title_en,
                        reimbursementResult.reprocessing2025.title_fil,
                        reimbursementResult.reprocessing2025.title_ceb,
                        lang,
                      )}
                    </span>
                    <span className="muted-text">
                      {pickLocale(
                        reimbursementResult.reprocessing2025.description_en,
                        reimbursementResult.reprocessing2025.description_fil,
                        reimbursementResult.reprocessing2025.description_ceb,
                        lang,
                      )}
                    </span>
                    <span className="muted-text">
                      {pickLocale(
                        reimbursementResult.reprocessing2025.whatToDo_en,
                        reimbursementResult.reprocessing2025.whatToDo_fil,
                        reimbursementResult.reprocessing2025.whatToDo_ceb,
                        lang,
                      )}
                    </span>
                  </div>
                </Card>
              ) : null}
            </>
          ) : null}
        </div>
      </>
    );
  }

  if (!result) {
    return (
      <div className="tab-screen tab-screen--centered">
        <div className="empty-state">
          <div className="empty-state__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4"/></svg>
          </div>
          <h2 className="empty-state__title">{t('guide_empty_title')}</h2>
          <p className="empty-state__text">{t('guide_empty_sub')}</p>
        </div>

        <div className="preview-grid">
          <Card className="preview-card">
            <div className="preview-card__svg-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            </div>
            <span className="preview-card__label">{t('guide_feature_documents')}</span>
          </Card>
          <Card className="preview-card">
            <div className="preview-card__svg-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <span className="preview-card__label">{t('guide_feature_script')}</span>
          </Card>
          <Card className="preview-card">
            <div className="preview-card__svg-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <span className="preview-card__label">{t('guide_feature_red_flags')}</span>
          </Card>
        </div>
      </div>
    );
  }

  const checkedCount = checkedItems.filter(Boolean).length;
  const progressWidth = result.documents.length
    ? `${(checkedCount / result.documents.length) * 100}%`
    : '0%';
  const billingScript =
    (pickLocale(result.billingScript_en, result.billingScript_fil, result.billingScript_ceb, lang))?.trim() ||
    t('billing_script_fallback');
  const malasakitNote = pickLocale(result.malasakitNote_en, result.malasakitNote_fil, result.malasakitNote_ceb, lang);
  const selectedHospital = searchState.hospitalId ? getHospitalById(searchState.hospitalId) : null;
  const zbbStatus =
    searchState.memberType && searchState.hospitalType && searchState.roomType
      ? getZBBStatus(searchState.memberType, searchState.hospitalType, searchState.roomType)
      : null;
  const showFinancialHelp =
    searchState.resultSource === 'intake' &&
    searchState.intakeResult?.mode !== 'after_discharge' &&
    shouldShowFinancialAssistance(result, zbbStatus);
  const assistancePrograms = showFinancialHelp
    ? getFinancialAssistancePrograms(lang, {
        hospitalType: searchState.hospitalType,
        hospitalHasMalasakitCenter: Boolean(selectedHospital?.hasMalasakitCenter),
      })
    : [];
  const estimatedRemainingBalance = showFinancialHelp
    ? getEstimatedRemainingBalance(result)
    : null;

  async function handleCopy() {
    try {
      await copyText(billingScript);
      setCopyState(true);
    } catch {
      showToast(t('copy_failed'), 'warning');
    }
  }

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({ text: billingScript });
        return;
      }
      await copyText(billingScript);
      showToast(t('share_fallback'), 'primary');
    } catch (error) {
      if (error?.name === 'AbortError') {
        return;
      }

      try {
        await copyText(billingScript);
        showToast(t('share_fallback'), 'primary');
      } catch {
        showToast(t('copy_failed'), 'warning');
      }
    }
  }

  return (
    <>
      <ToastContainer />
      <div className="tab-screen guide-tab">
        <section className="print-only print-pack">
          <h2 className="print-pack__title">
            {pickLocale(searchState.conditionName_en, searchState.conditionName_fil, searchState.conditionName_ceb, lang)}
          </h2>
          <p className="print-pack__amount">₱{result.amount.toLocaleString()}</p>
          <p className="print-pack__line">
            {result.directFiling ? t('direct_filing_badge') : t('reimburse_only_badge')}
          </p>
        </section>

        <section className="tab-section guide-tab__documents print-block">
          <div className="tab-section__header">
            <h2 className="tab-section__title">{t('documents_needed')}</h2>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: progressWidth }} />
          </div>
          <p className="muted-text">{t('documents_progress', { checked: checkedCount, total: result.documents.length })}</p>
          <Card className="saved-card">
            {result.documents.map((document, index) => {
              const isChecked = checkedItems[index];
              return (
                <label key={`${document.order}-${document.label_en}`} className="checkbox-item">
                  <button
                    type="button"
                    className={`checkbox-button${isChecked ? ' checkbox-button--checked' : ''}`}
                    onClick={() =>
                      setCheckedItems((current) =>
                        current.map((value, valueIndex) =>
                          valueIndex === index ? !value : value,
                        ),
                      )
                    }
                    aria-pressed={isChecked}
                  >
                    {isChecked ? '✓' : ''}
                  </button>
                  <div className="checkbox-item__label">
                    <div className="list-button__row">
                      <span className={isChecked ? 'checkbox-item__label--checked' : ''}>
                        {pickLocale(document.label_en, document.label_fil, document.label_ceb, lang)}
                      </span>
                      {document.critical ? (
                        <Badge variant="danger" size="sm">
                          {t('required')}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </label>
              );
            })}
          </Card>
          <button
            type="button"
            className="button button--outline screen-only"
            onClick={() => window.print()}
          >
            {t('print_checklist')}
          </button>
        </section>

        {showFinancialHelp ? (
          <section className="tab-section screen-only">
            <Card variant="warning" className="saved-card assistance-guide-card">
              <h2 className="tab-section__title">{t('financial_help_guide_title')}</h2>
              <p>
                {estimatedRemainingBalance
                  ? t('financial_help_guide_estimate', { amount: estimatedRemainingBalance.toLocaleString() })
                  : t('financial_help_guide_sub')}
              </p>
              <div className="assistance-guide-list">
                {assistancePrograms.map((program) => (
                  <Accordion key={program.key} title={program.title}>
                    <div className="assistance-guide-panel">
                      <div className="sheet-list">
                        <div className="sheet-list__item">
                          <span className="sheet-list__title">{t('financial_help_best_for')}</span>
                          <span className="muted-text">{program.bestFor}</span>
                        </div>
                        <div className="sheet-list__item">
                          <span className="sheet-list__title">{t('financial_help_documents')}</span>
                          <div className="assistance-guide-bullets">
                            {program.documents.map((item) => (
                              <div key={item} className="rhu-guide-list__item">
                                <span className="rhu-guide-list__dot" aria-hidden="true" />
                                <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="sheet-list__item">
                          <span className="sheet-list__title">{t('financial_help_steps')}</span>
                          <ol className="steps-list">
                            {program.steps.map((step, index) => (
                              <li key={`${program.key}-${index}`} className="steps-list__item">
                                <span className="steps-list__number">{index + 1}</span>
                                <span className="steps-list__text">{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                        <div className="sheet-list__item">
                          <span className="sheet-list__title">{t('financial_help_note')}</span>
                          <span className="muted-text">{program.note}</span>
                        </div>
                        <div className="sheet-list__item">
                          <span className="sheet-list__title">{t('financial_help_source')}</span>
                          <a href={program.sourceUrl} target="_blank" rel="noreferrer">
                            {program.sourceLabel}
                          </a>
                          {program.sourceUrl2 ? (
                            <a href={program.sourceUrl2} target="_blank" rel="noreferrer">
                              {program.sourceLabel2 || program.title}
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </Accordion>
                ))}
              </div>
            </Card>
          </section>
        ) : null}

        {result.directFiling ? (
          <section className="tab-section guide-tab__script print-block">
            <Card className="billing-script-card">
              <div className="billing-script-header">
                <div className="billing-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <span className="billing-script-title">{t('say_this_to_billing')}</span>
              </div>
              <p className="script-card__text">{billingScript}</p>
              <div className="actions-row screen-only">
                <button
                  type="button"
                  className="button button--outline"
                  onClick={handleCopy}
                >
                  {copyState ? `${t('copied')} ✓` : t('copy')}
                </button>
                <button
                  type="button"
                  className="button button--primary"
                  onClick={handleShare}
                >
                  {t('share')}
                </button>
              </div>
            </Card>
          </section>
        ) : (
          <ReimbursementGuide
            deadlineText={pickLocale(result.reimbursementDeadline_en, result.reimbursementDeadline_fil, result.reimbursementDeadline_ceb, lang)}
          />
        )}

        <section className="tab-section guide-tab__flags screen-only">
          <Accordion title={
            <span className="inline-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span>{t('red_flags_title')}</span>
            </span>
          }>
            <div className="flag-list">
              {result.redFlags.map((flag, index) => (
                <div key={`${flag.wrongStatement_en}-${index}`} className="flag-item">
                  <div className="red-flag-wrong">
                    <span className="muted-text" style={{display:'flex',alignItems:'center',gap:'4px'}}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      {t('red_flag_wrong') || 'Avoid saying'}
                    </span>
                    <p>{pickLocale(flag.wrongStatement_en, flag.wrongStatement_fil, flag.wrongStatement_ceb, lang)}</p>
                  </div>
                  <div className="red-flag-correct">
                    <span className="muted-text" style={{display:'flex',alignItems:'center',gap:'4px'}}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                      {t('correct_response')}
                    </span>
                    <p>{pickLocale(flag.correctResponse_en, flag.correctResponse_fil, flag.correctResponse_ceb, lang)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Accordion>
        </section>

        {/* Show Malasakit section for all NBB-eligible member types at government hospitals */}
        {result.malasakitEligible && getMembershipOptionById(searchState.memberType)?.nbpEligible ? (
          <Card variant="success" className="saved-card guide-tab__malasakit screen-only">
            <h2 className="tab-section__title" style={{display:'flex',alignItems:'center',gap:'6px'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--color-success)" stroke="none" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              {t('malasakit_title')}
            </h2>
            <p>{malasakitNote}</p>
            <a
              className="button button--outline"
              href="https://www.philhealth.gov.ph"
              target="_blank"
              rel="noreferrer"
            >
              {t('learn_more')}
            </a>
          </Card>
        ) : null}

        {/* PhilHealth hotline — always visible, no AI needed */}
        <Card variant="neutral" className="saved-card screen-only">
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            {lang === 'en'
              ? 'Need more help? Call the PhilHealth hotline:'
              : 'Kailangan ng dagdag na tulong? Tumawag sa PhilHealth hotline:'}
          </p>
          <a
            href="tel:0286622588"
            className="button button--outline"
            style={{ fontWeight: 'var(--font-weight-bold)', letterSpacing: '0.04em' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.26h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.87a16 16 0 0 0 6.07 6.07l1.77-1.77a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.02z"/></svg>
            (02) 866-225-88
          </a>
        </Card>
      </div>
    </>
  );
}
