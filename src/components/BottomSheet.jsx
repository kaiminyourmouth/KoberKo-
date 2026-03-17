import { useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import './BottomSheet.css';

export default function BottomSheet({ isOpen, onClose, title, children }) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="bottom-sheet" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        className="bottom-sheet__overlay"
        onClick={onClose}
        aria-label={t('btn_close')}
      />

      <div className="bottom-sheet__panel">
        <div className="bottom-sheet__handle" aria-hidden="true" />
        <div className="bottom-sheet__header">
          <h2 className="bottom-sheet__title">{title}</h2>
          <button
            type="button"
            className="bottom-sheet__close"
            onClick={onClose}
            aria-label={t('btn_close')}
          >
            ×
          </button>
        </div>
        <div className="bottom-sheet__body">{children}</div>
      </div>
    </div>
  );
}
