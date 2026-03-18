import { useMemo, useState } from 'react';
import Accordion from '../components/Accordion';
import Badge from '../components/Badge';
import Card from '../components/Card';
import konsulta from '../data/konsulta.json';
import rhuServices from '../data/rhu_services.json';
import { version } from '../../package.json';
import LanguageToggle from '../components/LanguageToggle';
import { DEFAULT_MEMBERSHIP_KEY, MEMBERSHIP_OPTIONS } from '../constants/options';
import { useLanguage } from '../context/LanguageContext';
import { checkEligibility } from '../engine/eligibilityCheck';
import './tabs.css';

const MEMBER_PORTAL_URL = 'https://memberinquiry.philhealth.gov.ph/member/';

function loadDefaultMembership() {
  try {
    return localStorage.getItem(DEFAULT_MEMBERSHIP_KEY) || '';
  } catch {
    return '';
  }
}

export default function AccountTab({ onOpenSaved, onOpenChat }) {
  const { lang, t } = useLanguage();
  const [defaultMembership, setDefaultMembership] = useState(() => loadDefaultMembership());
  const [selectedRhuConcernId, setSelectedRhuConcernId] = useState(() => rhuServices.concerns[0]?.id || '');
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];
  const monthOptions = [
    { value: '1', label: t('month_1') },
    { value: '2', label: t('month_2') },
    { value: '3', label: t('month_3') },
    { value: '4', label: t('month_4') },
    { value: '5', label: t('month_5') },
    { value: '6', label: t('month_6') },
    { value: '7', label: t('month_7') },
    { value: '8', label: t('month_8') },
    { value: '9', label: t('month_9') },
    { value: '10', label: t('month_10') },
    { value: '11', label: t('month_11') },
    { value: '12', label: t('month_12') },
  ];
  const [eligibilityMembership, setEligibilityMembership] = useState(() => loadDefaultMembership());
  const [lastContributionMonth, setLastContributionMonth] = useState('');
  const [lastContributionYear, setLastContributionYear] = useState('');
  const [plannedAdmissionMonth, setPlannedAdmissionMonth] = useState('');
  const [plannedAdmissionYear, setPlannedAdmissionYear] = useState('');
  const services = konsulta.services;
  const rhuConcerns = rhuServices.concerns;
  const selectedRhuConcern =
    rhuConcerns.find((concern) => concern.id === selectedRhuConcernId) || rhuConcerns[0];
  const eligibilityResult = useMemo(() => {
    if (
      !eligibilityMembership ||
      !lastContributionMonth ||
      !lastContributionYear ||
      !plannedAdmissionMonth ||
      !plannedAdmissionYear
    ) {
      return null;
    }

    return checkEligibility(
      eligibilityMembership,
      { month: lastContributionMonth, year: lastContributionYear },
      { month: plannedAdmissionMonth, year: plannedAdmissionYear },
    );
  }, [
    eligibilityMembership,
    lastContributionMonth,
    lastContributionYear,
    plannedAdmissionMonth,
    plannedAdmissionYear,
  ]);

  const MEMBERSHIP_ICONS = {
    SSS: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
    GSIS: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 22V9l9-7 9 7v13M9 22V12h6v10"/></svg>,
    VOLUNTARY: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>,
    OFW: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19.5 2.5S18 2 16.5 3.5L13 7 4.8 5.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>,
    NHTS: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 13c-1.1 0-2 .9-2 2s2 4 2 4 2-2.9 2-4-.9-2-2-2z"/></svg>,
    SPONSORED: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2M12 12v4M8 12v4M16 12v4"/></svg>,
    SENIOR: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="2"/><path d="M12 7v6M10 13l-2 8M14 13l2 8M10 10h4"/></svg>,
    LIFETIME: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    PWD: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="16" cy="4" r="1.5"/><path d="M10 9h6l2 5h2M9 21l2-7 3 3 2-7"/></svg>,
    KASAMBAHAY: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>,
  };

  function handleMembershipChange(event) {
    const nextValue = event.target.value;
    setDefaultMembership(nextValue);

    try {
      localStorage.setItem(DEFAULT_MEMBERSHIP_KEY, nextValue);
    } catch {
      // Ignore localStorage issues.
    }
  }

  const eligibilityCardVariant = eligibilityResult?.eligible === true
    ? 'success'
    : eligibilityResult?.eligible === 'at_risk'
      ? 'warning'
      : 'danger';

  const eligibilityStatus = eligibilityResult?.eligible === true
    ? t('account_eligibility_status_yes')
    : eligibilityResult?.eligible === 'at_risk'
      ? t('account_eligibility_status_risk')
      : t('account_eligibility_status_no');

  return (
    <div className="tab-screen account-tab">
      <section className="account-brand">
        <h1 className="account-brand__name">KoberKo</h1>
        <p className="muted-text">{t('tagline')}</p>
      </section>

      <Card className="prefs-card">
        <h2 className="tab-section__title">{t('preferences')}</h2>

        <div className="setting-row">
          <div className="setting-row__copy">
            <span className="setting-row__title">{t('language_label')}</span>
          </div>
          <LanguageToggle />
        </div>

        <div className="setting-row">
          <div className="setting-row__copy">
            <span className="setting-row__title">{t('default_membership')}</span>
          </div>
          <select
            className="select-input"
            value={defaultMembership}
            onChange={handleMembershipChange}
          >
            <option value="">{t('default_membership_placeholder')}</option>
            {MEMBERSHIP_OPTIONS.map((option) => (
              <option key={option.code} value={option.code}>
                {lang === 'en' ? option.label_en : option.label_fil}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card className="prefs-card">
        <Accordion title={t('account_eligibility_title')}>
          <div className="sheet-list">
            <div className="setting-row__copy">
              <span className="setting-row__title">{t('account_eligibility_membership')}</span>
            </div>

            <div className="select-grid">
              {MEMBERSHIP_OPTIONS.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  className={`select-card${eligibilityMembership === option.code ? ' select-card--selected' : ''}`}
                  onClick={() => setEligibilityMembership(option.code)}
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

            <div className="setting-row__copy">
              <span className="setting-row__title">{t('account_eligibility_last_paid')}</span>
            </div>
            <div className="account-eligibility__date-row">
              <select className="select-input" value={lastContributionMonth} onChange={(event) => setLastContributionMonth(event.target.value)}>
                <option value="">{t('account_eligibility_month')}</option>
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select className="select-input" value={lastContributionYear} onChange={(event) => setLastContributionYear(event.target.value)}>
                <option value="">{t('account_eligibility_year')}</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div className="setting-row__copy">
              <span className="setting-row__title">{t('account_eligibility_admission')}</span>
            </div>
            <div className="account-eligibility__date-row">
              <select className="select-input" value={plannedAdmissionMonth} onChange={(event) => setPlannedAdmissionMonth(event.target.value)}>
                <option value="">{t('account_eligibility_month')}</option>
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select className="select-input" value={plannedAdmissionYear} onChange={(event) => setPlannedAdmissionYear(event.target.value)}>
                <option value="">{t('account_eligibility_year')}</option>
                {yearOptions.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {eligibilityResult ? (
              <Card variant={eligibilityCardVariant} className="prefs-card">
                <div className="setting-row__copy">
                  <h3 className="tab-section__title">{eligibilityStatus}</h3>
                  <p>{lang === 'en' ? eligibilityResult.message_en : eligibilityResult.message_fil}</p>
                  {eligibilityResult.warningNote_en || eligibilityResult.warningNote_fil ? (
                    <p className="muted-text">
                      {lang === 'en' ? eligibilityResult.warningNote_en : eligibilityResult.warningNote_fil}
                    </p>
                  ) : null}
                </div>

                {eligibilityResult.eligible !== true ? (
                  <a
                    className="button button--outline"
                    href={eligibilityResult.actionUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t('account_eligibility_cta')}
                  </a>
                ) : null}

                <p className="muted-text">{t('account_eligibility_disclaimer')}</p>
              </Card>
            ) : null}
          </div>
        </Accordion>
      </Card>

      <Card className="prefs-card">
        <h2 className="tab-section__title">{t('account_tools_title')}</h2>

        <button type="button" className="account-link-card" onClick={onOpenSaved}>
          <div className="account-link-card__copy">
            <span className="account-link-card__title">{t('account_saved_title')}</span>
            <span className="muted-text">{t('account_saved_sub')}</span>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
        </button>

        <button type="button" className="account-link-card" onClick={onOpenChat}>
          <div className="account-link-card__copy">
            <span className="account-link-card__title">{t('account_chat_title')}</span>
            <span className="muted-text">{t('account_chat_sub')}</span>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </Card>

      <Card className="prefs-card">
        <div className="setting-row__copy">
          <div className="inline-row">
            <h2 className="tab-section__title">{t('account_rhu_title')}</h2>
            <Badge variant="primary" size="sm">{t('account_rhu_badge')}</Badge>
          </div>
          <p className="muted-text">{t('account_rhu_sub')}</p>
          <p className="muted-text">{t('account_rhu_picker')}</p>
        </div>

        <div className="select-grid rhu-guide-selector">
          {rhuConcerns.map((concern) => {
            const isSelected = selectedRhuConcern?.id === concern.id;
            return (
              <button
                key={concern.id}
                type="button"
                className={`select-card rhu-guide-selector__button${isSelected ? ' select-card--selected' : ''}`}
                onClick={() => setSelectedRhuConcernId(concern.id)}
              >
                <span className="select-card__title">
                  {lang === 'en' ? concern.label_en : concern.label_fil}
                </span>
              </button>
            );
          })}
        </div>

        {selectedRhuConcern ? (
          <div className="rhu-guide-panel">
            <div className="rhu-guide-panel__header">
              <div className="setting-row__copy">
                <span className="sheet-list__title">
                  {lang === 'en' ? selectedRhuConcern.label_en : selectedRhuConcern.label_fil}
                </span>
                <p className="muted-text">
                  {lang === 'en' ? selectedRhuConcern.summary_en : selectedRhuConcern.summary_fil}
                </p>
              </div>
              <span className="tag tag--gray">{t('account_rhu_public_tag')}</span>
            </div>

            <div className="rhu-guide-section">
              <span className="sheet-list__title">{t('account_rhu_ask_for')}</span>
              <div className="rhu-guide-list">
                {(lang === 'en' ? selectedRhuConcern.askFor_en : selectedRhuConcern.askFor_fil).map((item) => (
                  <div key={item} className="rhu-guide-list__item">
                    <span className="rhu-guide-list__dot" aria-hidden="true" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rhu-guide-section">
              <span className="sheet-list__title">{t('account_rhu_good_first_stop')}</span>
              <div className="rhu-guide-list">
                {(lang === 'en' ? selectedRhuConcern.goodFirstStop_en : selectedRhuConcern.goodFirstStop_fil).map((item) => (
                  <div key={item} className="rhu-guide-list__item">
                    <span className="rhu-guide-list__dot" aria-hidden="true" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rhu-guide-section">
              <span className="sheet-list__title">{t('account_rhu_hospital_now')}</span>
              <div className="rhu-guide-list">
                {(lang === 'en' ? selectedRhuConcern.goHospital_en : selectedRhuConcern.goHospital_fil).map((item) => (
                  <div key={item} className="rhu-guide-list__item">
                    <span className="rhu-guide-list__dot rhu-guide-list__dot--warning" aria-hidden="true" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="notice notice--warning">
              {lang === 'en' ? selectedRhuConcern.availabilityNote_en : selectedRhuConcern.availabilityNote_fil}
            </div>

            <div className="setting-row__copy">
              <span className="setting-row__title">{t('account_rhu_konsulta_link')}</span>
              <span className="muted-text">{t('account_rhu_konsulta_note')}</span>
            </div>

            <div className="chips-row">
              {(lang === 'en' ? rhuServices.sourceTags_en : rhuServices.sourceTags_fil).map((tag) => (
                <span key={tag} className="tag tag--gray">
                  {tag}
                </span>
              ))}
            </div>

            <p className="muted-text">{t('account_rhu_disclaimer')}</p>
          </div>
        ) : null}
      </Card>

      <Card className="prefs-card">
        <div className="setting-row__copy">
          <h2 className="tab-section__title">{t('account_konsulta_title')}</h2>
          <p className="muted-text">{t('account_konsulta_sub')}</p>
          <p className="sheet-list__title">{t('account_konsulta_entitled')}</p>
        </div>

        <div className="sheet-list">
          <Accordion title={lang === 'en' ? services.consultations.title_en : services.consultations.title_fil}>
            <div className="konsulta-chips">
              {(lang === 'en' ? services.consultations.items_en : services.consultations.items_fil).map((item) => (
                <span key={item} className="konsulta-chip">
                  <svg className="konsulta-chip__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  {item}
                </span>
              ))}
            </div>
          </Accordion>

          <Accordion title={lang === 'en' ? services.laboratoryTests.title_en : services.laboratoryTests.title_fil}>
            <div className="konsulta-chips">
              {(lang === 'en' ? services.laboratoryTests.items_en : services.laboratoryTests.items_fil).map((item) => (
                <span key={item} className="konsulta-chip">
                  <svg className="konsulta-chip__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  {item}
                </span>
              ))}
            </div>
          </Accordion>

          <Accordion title={lang === 'en' ? services.medicines.title_en : services.medicines.title_fil}>
            <div className="sheet-list">
              <div className="konsulta-chips">
                {(lang === 'en' ? services.medicines.categories_en : services.medicines.categories_fil).map((item) => (
                  <span key={item} className="konsulta-chip">
                    <svg className="konsulta-chip__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    {item}
                  </span>
                ))}
              </div>
              <span className="muted-text">
                {lang === 'en' ? services.medicines.note_en : services.medicines.note_fil}
              </span>
            </div>
          </Accordion>

          <Accordion
            title={
              <span className="inline-row">
                <span>{lang === 'en' ? services.dental.title_en : services.dental.title_fil}</span>
                <Badge variant="success" size="sm">{t('account_konsulta_new_badge')}</Badge>
              </span>
            }
          >
            <div className="sheet-list">
              <div className="konsulta-chips">
                {(lang === 'en' ? services.dental.services_en : services.dental.services_fil).map((item) => (
                  <span key={item} className="konsulta-chip">
                    <svg className="konsulta-chip__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    {item}
                  </span>
                ))}
              </div>
              <span className="muted-text">
                {lang === 'en' ? services.dental.copayNote_en : services.dental.copayNote_fil}
              </span>
            </div>
          </Accordion>
        </div>

        <div className="setting-row__copy">
          <span className="setting-row__title">{t('account_konsulta_access')}</span>
          <span className="muted-text">
            {lang === 'en' ? konsulta.howToAccess_en : konsulta.howToAccess_fil}
          </span>
        </div>

        <div className="setting-row__copy">
          <span className="setting-row__title">{t('account_konsulta_important')}</span>
          <span className="muted-text">
            {lang === 'en' ? konsulta.importantNote_en : konsulta.importantNote_fil}
          </span>
        </div>

        <a
          className="button button--outline"
          href={konsulta.findProvider_url}
          target="_blank"
          rel="noreferrer"
        >
          {t('account_konsulta_find')}
        </a>
      </Card>

      <Card className="prefs-card">
        <div className="setting-row__copy">
          <h2 className="tab-section__title">{t('account_ephilhealth_title')}</h2>
        </div>

        <div className="chips-row">
          <span className="tag tag--gray">{t('account_ephilhealth_chip_contributions')}</span>
          <span className="tag tag--gray">{t('account_ephilhealth_chip_mdr')}</span>
          <span className="tag tag--gray">{t('account_ephilhealth_chip_dependents')}</span>
          <span className="tag tag--gray">{t('account_ephilhealth_chip_reimbursement')}</span>
        </div>

        <a
          className="button button--outline"
          href={MEMBER_PORTAL_URL}
          target="_blank"
          rel="noreferrer"
        >
          {t('account_ephilhealth_cta')}
        </a>
      </Card>

      <Card className="prefs-card">
        <div className="setting-row__copy">
          <h2 className="tab-section__title">{t('account_hmo_title')}</h2>
          <p className="muted-text">{t('account_hmo_sub')}</p>
        </div>

        <Accordion title={t('account_hmo_expand')}>
          <div className="sheet-list">
            <span className="muted-text">{t('account_hmo_intro')}</span>
            <span className="muted-text">1. {t('account_hmo_step_1')}</span>
            <span className="muted-text">2. {t('account_hmo_step_2')}</span>
            <span className="muted-text">3. {t('account_hmo_step_3')}</span>
            <div className="sheet-list__item">
              <span className="sheet-list__title">{t('account_hmo_example_title')}</span>
              <span className="muted-text">{t('account_hmo_example_body')}</span>
            </div>
            <span className="muted-text">{t('account_hmo_note')}</span>
          </div>
        </Accordion>
      </Card>

      <Card className="about-card">
        <h2 className="tab-section__title">{t('about_title')}</h2>
        <div className="setting-row__copy">
          <span className="setting-row__title">{t('data_source')}</span>
          <span className="muted-text">{t('data_source_value')}</span>
        </div>
        <div className="setting-row__copy">
          <span className="setting-row__title">{t('disclaimer')}</span>
          <span className="muted-text">{t('disclaimer_text')}</span>
        </div>
        <div className="setting-row__copy">
          <span className="setting-row__title">{t('version')}</span>
          <span className="muted-text">KoberKo v{version}</span>
        </div>
      </Card>

      <Card variant="neutral" className="coming-soon-card">
        <h2 className="tab-section__title">{t('coming_soon_title')}</h2>
        <p className="muted-text">{t('coming_soon_body')}</p>
        <button
          type="button"
          className="button button--outline button--disabled"
          disabled
        >
          {t('coming_soon_button')}
        </button>
      </Card>
    </div>
  );
}
