import { useEffect, useMemo, useState } from 'react';
import Card from './Card';
import LanguageToggle from './LanguageToggle';
import { useLanguage } from '../context/LanguageContext';
import './AppTutorial.css';

const TAB_ITEMS = [
  {
    key: 'intake',
    labelKey: 'nav_intake',
    descKey: 'tutorial_tab_intake_desc',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-2" />
        <path d="M9 2a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1" />
        <path d="M9 2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1" />
        <path d="M8 10h8" />
        <path d="M8 15h5" />
      </svg>
    ),
  },
  {
    key: 'find',
    labelKey: 'nav_find',
    descKey: 'tutorial_tab_find_desc',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    ),
  },
  {
    key: 'guide',
    labelKey: 'nav_guide',
    descKey: 'tutorial_tab_guide_desc',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 4.5A2.5 2.5 0 0 1 5.5 2H11v20H5.5A2.5 2.5 0 0 0 3 24Z" />
        <path d="M21 4.5A2.5 2.5 0 0 0 18.5 2H13v20h5.5A2.5 2.5 0 0 1 21 24Z" />
      </svg>
    ),
  },
  {
    key: 'gabay',
    labelKey: 'nav_gabay',
    descKey: 'tutorial_tab_gabay_desc',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
        <path d="M8 7h8" />
        <path d="M8 11h8" />
      </svg>
    ),
  },
  {
    key: 'account',
    labelKey: 'nav_account',
    descKey: 'tutorial_tab_account_desc',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

const SCENARIO_ITEMS = [
  {
    key: 'billing',
    labelKey: 'intake_scenario_billing_label',
    descKey: 'intake_scenario_billing_desc',
  },
  {
    key: 'doctor',
    labelKey: 'intake_scenario_doctor_label',
    descKey: 'intake_scenario_doctor_desc',
  },
  {
    key: 'admitted',
    labelKey: 'intake_scenario_admitted_label',
    descKey: 'intake_scenario_admitted_desc',
  },
  {
    key: 'symptoms',
    labelKey: 'intake_scenario_symptoms_label',
    descKey: 'intake_scenario_symptoms_desc',
  },
  {
    key: 'discharge',
    labelKey: 'intake_scenario_discharge_label',
    descKey: 'intake_scenario_discharge_desc',
  },
  {
    key: 'planning',
    labelKey: 'intake_scenario_planning_label',
    descKey: 'intake_scenario_planning_desc',
  },
];

export default function AppTutorial({ isOpen, onClose }) {
  const { t } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(0);

  const pages = useMemo(
    () => [
      { key: 'intro', renderKey: 'intro' },
      { key: 'tabs', renderKey: 'tabs' },
      { key: 'intake', renderKey: 'intake' },
      { key: 'after', renderKey: 'after' },
    ],
    [],
  );

  const afterSteps = useMemo(
    () => [
      t('tutorial_after_step_1'),
      t('tutorial_after_step_2'),
      t('tutorial_after_step_3'),
      t('tutorial_after_step_4'),
    ],
    [t],
  );
  const isLastPage = activeIndex === pages.length - 1;

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setActiveIndex(0);

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const jumpToPage = (index) => {
    const nextIndex = Math.max(0, Math.min(index, pages.length - 1));
    setActiveIndex(nextIndex);
  };

  const handleAdvance = () => {
    jumpToPage(activeIndex + 1);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="app-tutorial" role="dialog" aria-modal="true" aria-labelledby="app-tutorial-title">
      <div className="app-tutorial__backdrop" />

      <div className="app-tutorial__surface">
        <div className="app-tutorial__header">
          <div className="app-tutorial__brand">
            <div className="app-tutorial__logo" aria-hidden="true">₱</div>
            <div>
              <span className="app-tutorial__eyebrow">{t('tutorial_badge')}</span>
              <h2 className="app-tutorial__header-title">{t('tutorial_title')}</h2>
            </div>
          </div>

          <div className="app-tutorial__actions">
            <LanguageToggle className="app-tutorial__lang-toggle" />
            <button
              type="button"
              className="button button--outline button--sm app-tutorial__skip"
              onClick={onClose}
            >
              {t('tutorial_skip')}
            </button>
          </div>
        </div>

        <div className="app-tutorial__stage">
          {activeIndex === 0 ? (
            <section className="app-tutorial__section">
              <Card className="app-tutorial__card app-tutorial__card--hero">
                <div className="app-tutorial__hero-copy">
                  <span className="app-tutorial__pill">{t('tutorial_scroll_hint')}</span>
                  <h1 id="app-tutorial-title" className="app-tutorial__title">{t('tutorial_title')}</h1>
                  <p className="app-tutorial__body">{t('tutorial_body')}</p>
                </div>

                <div className="app-tutorial__chip-row">
                  <span className="app-tutorial__chip">{t('tutorial_chip_fast')}</span>
                  <span className="app-tutorial__chip">{t('tutorial_chip_start')}</span>
                  <span className="app-tutorial__chip">{t('tutorial_chip_steps')}</span>
                </div>

                <div className="app-tutorial__step-list">
                  <div className="app-tutorial__step-item">
                    <span className="app-tutorial__step-number">1</span>
                    <span>{t('tutorial_intro_step_1')}</span>
                  </div>
                  <div className="app-tutorial__step-item">
                    <span className="app-tutorial__step-number">2</span>
                    <span>{t('tutorial_intro_step_2')}</span>
                  </div>
                  <div className="app-tutorial__step-item">
                    <span className="app-tutorial__step-number">3</span>
                    <span>{t('tutorial_intro_step_3')}</span>
                  </div>
                </div>

                <div className="app-tutorial__callout">
                  <strong className="app-tutorial__callout-title">{t('tutorial_intro_callout_title')}</strong>
                  <p className="app-tutorial__callout-body">{t('tutorial_intro_callout_body')}</p>
                </div>
              </Card>
            </section>
          ) : null}

          {activeIndex === 1 ? (
            <section className="app-tutorial__section">
              <Card className="app-tutorial__card">
                <div className="app-tutorial__section-copy">
                  <span className="app-tutorial__section-badge">{t('tutorial_tabs_badge')}</span>
                  <h3 className="app-tutorial__section-title">{t('tutorial_tabs_title')}</h3>
                  <p className="app-tutorial__body app-tutorial__body--muted">{t('tutorial_tabs_body')}</p>
                </div>

                <div className="app-tutorial__tab-list">
                  {TAB_ITEMS.map((item) => (
                    <div key={item.key} className="app-tutorial__tab-item">
                      <span className="app-tutorial__tab-icon" aria-hidden="true">
                        {item.icon}
                      </span>
                      <div className="app-tutorial__tab-copy">
                        <strong>{t(item.labelKey)}</strong>
                        <span>{t(item.descKey)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </section>
          ) : null}

          {activeIndex === 2 ? (
            <section className="app-tutorial__section">
              <Card className="app-tutorial__card">
                <div className="app-tutorial__section-copy">
                  <span className="app-tutorial__section-badge">{t('tutorial_intake_badge')}</span>
                  <h3 className="app-tutorial__section-title">{t('tutorial_intake_title')}</h3>
                  <p className="app-tutorial__body app-tutorial__body--muted">{t('tutorial_intake_body')}</p>
                </div>

                <div className="app-tutorial__step-list app-tutorial__step-list--compact">
                  <div className="app-tutorial__step-item">
                    <span className="app-tutorial__step-number">1</span>
                    <span>{t('tutorial_intake_step_1')}</span>
                  </div>
                  <div className="app-tutorial__step-item">
                    <span className="app-tutorial__step-number">2</span>
                    <span>{t('tutorial_intake_step_2')}</span>
                  </div>
                  <div className="app-tutorial__step-item">
                    <span className="app-tutorial__step-number">3</span>
                    <span>{t('tutorial_intake_step_3')}</span>
                  </div>
                </div>

                <div className="app-tutorial__scenario-copy">
                  <strong className="app-tutorial__scenario-title">{t('tutorial_scenarios_title')}</strong>
                </div>

                <div className="app-tutorial__scenario-grid">
                  {SCENARIO_ITEMS.map((item) => (
                    <div key={item.key} className="app-tutorial__scenario-item">
                      <strong>{t(item.labelKey)}</strong>
                      <span>{t(item.descKey)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </section>
          ) : null}

          {activeIndex === 3 ? (
            <section className="app-tutorial__section">
              <Card className="app-tutorial__card app-tutorial__card--final">
                <div className="app-tutorial__section-copy">
                  <span className="app-tutorial__section-badge">{t('tutorial_after_badge')}</span>
                  <h3 className="app-tutorial__section-title">{t('tutorial_after_title')}</h3>
                  <p className="app-tutorial__body app-tutorial__body--muted">{t('tutorial_after_body')}</p>
                </div>

                <div className="app-tutorial__after-list">
                  {afterSteps.map((step, index) => (
                    <div key={step} className="app-tutorial__after-item">
                      <span className="app-tutorial__after-number">{index + 1}</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>

                <div className="app-tutorial__callout app-tutorial__callout--success">
                  <strong className="app-tutorial__callout-title">{t('tutorial_after_badge')}</strong>
                  <p className="app-tutorial__callout-body">{t('tutorial_after_note')}</p>
                </div>

                <button
                  type="button"
                  className="button button--primary app-tutorial__card-action"
                  onClick={onClose}
                >
                  {t('tutorial_start')}
                </button>
              </Card>
            </section>
          ) : null}
        </div>

        <div className="app-tutorial__footer">
          <div className="app-tutorial__footer-copy" aria-live="polite">
            <span className="app-tutorial__footer-progress">
              {t('tutorial_progress', { current: activeIndex + 1, total: pages.length })}
            </span>
            <div className="app-tutorial__pager" aria-label={t('tutorial_scroll_hint')}>
              {pages.map((page, index) => (
                <button
                  key={page.key}
                  type="button"
                  className={`app-tutorial__dot${activeIndex === index ? ' app-tutorial__dot--active' : ''}`}
                  onClick={() => jumpToPage(index)}
                  aria-label={`${t('tutorial_badge')} ${index + 1}`}
                  aria-pressed={activeIndex === index}
                />
              ))}
            </div>
          </div>

          {!isLastPage ? (
            <button
              type="button"
              className="button button--primary app-tutorial__footer-action"
              onClick={handleAdvance}
            >
              {t('tutorial_next')}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
