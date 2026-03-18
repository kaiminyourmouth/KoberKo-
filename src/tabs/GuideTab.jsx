import { useEffect, useState } from 'react';
import Accordion from '../components/Accordion';
import Badge from '../components/Badge';
import Card from '../components/Card';
import ReimbursementGuide from '../components/ReimbursementGuide';
import { useToast } from '../components/Toast';
import { getMembershipOptionById } from '../constants/options';
import { useLanguage } from '../context/LanguageContext';
import { useSearch } from '../context/SearchContext';
import { copyText } from '../utils/clipboard';
import './tabs.css';



export default function GuideTab() {
  const { lang, t } = useLanguage();
  const { searchState } = useSearch();
  const { showToast, ToastContainer } = useToast();
  const result = searchState.result;
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
    (lang === 'en' ? result.billingScript_en : result.billingScript_fil)?.trim() ||
    t('billing_script_fallback');
  const malasakitNote = lang === 'en' ? result.malasakitNote_en : result.malasakitNote_fil;

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
            {lang === 'en' ? searchState.conditionName_en : searchState.conditionName_fil}
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
                        {lang === 'en' ? document.label_en : document.label_fil}
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
            deadlineText={lang === 'en' ? result.reimbursementDeadline_en : result.reimbursementDeadline_fil}
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
