import { useLanguage } from '../context/LanguageContext';
import './LanguageToggle.css';

export default function LanguageToggle({ className = '' }) {
  const { lang, setLang, t } = useLanguage();
  const classes = ['lang-toggle', className].filter(Boolean).join(' ');

  return (
    <div className={classes} role="group" aria-label={t('language_label')}>
      <button
        type="button"
        className={`lang-toggle__btn${lang === 'fil' ? ' lang-toggle__btn--active' : ''}`}
        onClick={() => setLang('fil')}
        aria-pressed={lang === 'fil'}
        aria-label={t('language_fil')}
      >
        {t('lang_toggle_fil')}
      </button>
      <button
        type="button"
        className={`lang-toggle__btn${lang === 'en' ? ' lang-toggle__btn--active' : ''}`}
        onClick={() => setLang('en')}
        aria-pressed={lang === 'en'}
        aria-label={t('language_en')}
      >
        {t('lang_toggle_en')}
      </button>
    </div>
  );
}
