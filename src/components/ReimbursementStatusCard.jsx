import Card from './Card';
import reimbursement from '../data/reimbursement.json';
import { useLanguage } from '../context/LanguageContext';

export default function ReimbursementStatusCard({
  claimOutcome = 'NOT_FILED',
  deadlineText = '',
  primaryActionLabel = '',
  onPrimaryAction = null,
}) {
  const { t } = useLanguage();

  const content =
    claimOutcome === 'DENIED'
      ? {
          variant: 'warning',
          toneClass: 'reimbursement-status-card--denied',
          eyebrow: t('reimbursement_status_denied_eyebrow'),
          title: t('reimbursement_status_denied_title'),
          summary: t('reimbursement_status_denied_summary'),
          recover: t('reimbursement_status_denied_recover'),
          today: t('reimbursement_status_denied_today'),
          next: t('reimbursement_status_denied_next'),
          note: t('reimbursement_status_denied_note'),
        }
      : claimOutcome === 'WAITING'
        ? {
            variant: 'primary',
            toneClass: 'reimbursement-status-card--waiting',
            eyebrow: t('reimbursement_status_waiting_eyebrow'),
            title: t('reimbursement_status_waiting_title'),
            summary: t('reimbursement_status_waiting_summary'),
            recover: t('reimbursement_status_waiting_recover'),
            today: t('reimbursement_status_waiting_today'),
            next: t('reimbursement_status_waiting_next'),
            note: t('reimbursement_status_waiting_note'),
          }
        : {
            variant: 'success',
            toneClass: 'reimbursement-status-card--not-filed',
            eyebrow: t('reimbursement_status_not_filed_eyebrow'),
            title: t('reimbursement_status_not_filed_title'),
            summary: t('reimbursement_status_not_filed_summary'),
            recover: t('reimbursement_status_not_filed_recover'),
            today: t('reimbursement_status_not_filed_today'),
            next: t('reimbursement_status_not_filed_next'),
            note: deadlineText
              ? t('reimbursement_status_not_filed_note', { deadline: deadlineText })
              : t('reimbursement_status_not_filed_note', { deadline: t('reimbursement_deadline_default') }),
          };

  return (
    <Card variant={content.variant} className={`reimbursement-status-card ${content.toneClass}`}>
      <div className="reimbursement-status-card__header">
        <span className="reimbursement-status-card__eyebrow">{content.eyebrow}</span>
        {deadlineText ? (
          <span className="reimbursement-status-card__deadline">
            {t('claim_denial_deadline_label')}: {deadlineText}
          </span>
        ) : null}
      </div>

      <div className="reimbursement-status-card__copy">
        <h3 className="reimbursement-status-card__title">{content.title}</h3>
        <p className="reimbursement-status-card__summary">{content.summary}</p>
      </div>

      <div className="reimbursement-status-card__grid">
        <div className="reimbursement-status-card__item">
          <span className="reimbursement-status-card__label">{t('reimbursement_status_question_recover')}</span>
          <strong>{content.recover}</strong>
        </div>
        <div className="reimbursement-status-card__item">
          <span className="reimbursement-status-card__label">{t('reimbursement_status_question_today')}</span>
          <strong>{content.today}</strong>
        </div>
        <div className="reimbursement-status-card__item">
          <span className="reimbursement-status-card__label">{t('reimbursement_status_question_next')}</span>
          <strong>{content.next}</strong>
        </div>
      </div>

      <p className="reimbursement-status-card__note">{content.note}</p>

      <div className="reimbursement-status-card__actions screen-only">
        {primaryActionLabel && onPrimaryAction ? (
          <button type="button" className="button button--primary" onClick={onPrimaryAction}>
            {primaryActionLabel}
          </button>
        ) : null}
        <a
          className={`button ${primaryActionLabel && onPrimaryAction ? 'button--outline' : 'button--primary'}`}
          href={`tel:${reimbursement.hotline.replace(/[^\d+]/g, '')}`}
        >
          {t('reimbursement_call_hotline')}
        </a>
      </div>
    </Card>
  );
}
