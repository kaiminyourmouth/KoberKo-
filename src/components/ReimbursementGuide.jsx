import Badge from './Badge';
import Card from './Card';
import reimbursement from '../data/reimbursement.json';
import { useLanguage } from '../context/LanguageContext';

export default function ReimbursementGuide({ deadlineText = '' }) {
  const { lang, t } = useLanguage();
  const deadlineLabel = deadlineText || t('reimbursement_deadline_default');

  return (
    <section className="tab-section">
      <div className="tab-section__header">
        <h2 className="tab-section__title">{t('reimbursement_guide_title')}</h2>
      </div>

      <Card variant="warning" className="saved-card">
        <strong>{t('reimbursement_deadline_banner')}</strong>
        <p>{deadlineLabel}</p>
      </Card>

      <ol className="steps-list">
        {reimbursement.steps.map((step) => (
          <li key={step.order} className="steps-list__item">
            <span className="steps-list__number">{step.order}</span>
            <div className="steps-list__text">
              <div className="list-button__row">
                <strong>{lang === 'en' ? step.title_en : step.title_fil}</strong>
                {step.critical ? (
                  <Badge variant="danger" size="sm">
                    {t('required')}
                  </Badge>
                ) : null}
              </div>
              {step.deadline_note ? (
                <Card variant="warning" className="saved-card">
                  <p>{lang === 'en' ? step.desc_en : step.desc_fil}</p>
                </Card>
              ) : (
                <p className="muted-text">{lang === 'en' ? step.desc_en : step.desc_fil}</p>
              )}
              {(lang === 'en' ? step.items_en : step.items_fil)?.length ? (
                <div className="sheet-list">
                  {(lang === 'en' ? step.items_en : step.items_fil).map((item) => (
                    <span key={item} className="muted-text">• {item}</span>
                  ))}
                </div>
              ) : null}
              {step.actionUrl ? (
                <a
                  className="button button--outline"
                  href={step.actionUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('reimbursement_step_link')}
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      {(lang === 'en' ? reimbursement.reprocessingNote_en : reimbursement.reprocessingNote_fil) ? (
        <Card variant="warning" className="saved-card">
          <strong>{t('reimbursement_reprocessing_title')}</strong>
          <p>{lang === 'en' ? reimbursement.reprocessingNote_en : reimbursement.reprocessingNote_fil}</p>
        </Card>
      ) : null}

      <a
        className="button button--outline"
        href={reimbursement.onlinePortal}
        target="_blank"
        rel="noreferrer"
      >
        {t('reimbursement_file_online')}
      </a>

      <Card variant="neutral" className="saved-card screen-only">
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
          {t('reimbursement_hotline_label')}
        </p>
        <a
          href={`tel:${reimbursement.hotline.replace(/[^\d+]/g, '')}`}
          className="button button--outline"
          style={{ fontWeight: 'var(--font-weight-bold)', letterSpacing: '0.04em' }}
        >
          {reimbursement.hotline}
        </a>
      </Card>
    </section>
  );
}
