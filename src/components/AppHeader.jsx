import { useLanguage } from '../context/LanguageContext';
import LanguageToggle from './LanguageToggle';
import './AppHeader.css';

export default function AppHeader() {
  const { t } = useLanguage();

  return (
    <header className="app-header" role="banner">
      <div className="app-header__brand" aria-label={t('app_name')}>
        <div className="app-header__logo" aria-hidden="true">₱</div>
        <span className="app-header__name">{t('app_name')}</span>
      </div>
      <LanguageToggle />
    </header>
  );
}
