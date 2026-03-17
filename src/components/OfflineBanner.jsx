import { useLanguage } from '../context/LanguageContext';
import useOnlineStatus from '../hooks/useOnlineStatus';
import './OfflineBanner.css';

export default function OfflineBanner() {
  const { isOnline } = useOnlineStatus();
  const { t } = useLanguage();

  return (
    <div className="offline-banner-slot" aria-hidden={isOnline}>
      <div className={`offline-banner-bar${isOnline ? '' : ' offline-banner-bar--visible'}`}>
        {!isOnline ? (
          <span className="offline-banner-bar__text">📶 {t('offline_banner')}</span>
        ) : null}
      </div>
    </div>
  );
}
