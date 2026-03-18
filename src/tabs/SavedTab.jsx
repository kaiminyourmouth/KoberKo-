import { useEffect, useState } from 'react';
import Badge from '../components/Badge';
import BottomSheet from '../components/BottomSheet';
import Card from '../components/Card';
import { SAVED_RESULTS_KEY, getHospitalLevelNumber, getMembershipLabel } from '../constants/options';
import { getCoverage } from '../engine/coverage';
import { useLanguage } from '../context/LanguageContext';
import { useSearch } from '../context/SearchContext';
import './tabs.css';
import { pickLocale } from '../utils/localize';

function loadSavedResults() {
  try {
    return JSON.parse(localStorage.getItem(SAVED_RESULTS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveSavedResults(items) {
  localStorage.setItem(SAVED_RESULTS_KEY, JSON.stringify(items));
}

function getRelativeDate(savedAt, lang, t) {
  const diffMs = Date.now() - new Date(savedAt).getTime();
  const totalHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
  const totalDays = Math.floor(totalHours / 24);

  if (totalHours < 1) {
    return t('relative_now');
  }

  if (totalDays < 1) {
    return t(totalHours === 1 ? 'relative_hour' : 'relative_hours', { count: totalHours });
  }

  return t(totalDays === 1 ? 'relative_day' : 'relative_days', { count: totalDays });
}

export default function SavedTab({ onTabChange, onOpenSavedResult, standalone = false, onBack }) {
  const { lang, t } = useLanguage();
  const { setSearchState } = useSearch();
  const [savedItems, setSavedItems] = useState(() => loadSavedResults());
  const [editingId, setEditingId] = useState(null);
  const [draftNote, setDraftNote] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  useEffect(() => {
    setSavedItems(loadSavedResults());
  }, []);

  const pendingDeleteItem =
    savedItems.find((item) => item.id === pendingDeleteId) ?? null;

  function persistItems(nextItems) {
    setSavedItems(nextItems);
    saveSavedResults(nextItems);
  }

  function handleView(savedItem) {
    const restoredResult = getCoverage(
      savedItem.conditionId,
      savedItem.memberType,
      savedItem.hospitalLevel,
      { variantKey: savedItem.coverageVariantKey || undefined },
    );

    if (!restoredResult) {
      return;
    }

    setSearchState({
      conditionId: savedItem.conditionId,
      conditionName_fil: savedItem.conditionName_fil,
      conditionName_en: savedItem.conditionName_en,
      memberType: savedItem.memberType,
      hospitalLevel: savedItem.hospitalLevel,
      coverageVariantKey: savedItem.coverageVariantKey || null,
      resultSource: 'saved',
      hospitalType: null,
      roomType: null,
      result: restoredResult,
    });
    onOpenSavedResult();
    onTabChange(1);
  }

  function beginNoteEdit(item) {
    setEditingId(item.id);
    setDraftNote(item.note || '');
  }

  function commitNote(itemId) {
    const nextItems = savedItems.map((item) =>
      item.id === itemId ? { ...item, note: draftNote.trim() } : item,
    );
    persistItems(nextItems);
    setEditingId(null);
    setDraftNote('');
  }

  function handleDelete() {
    if (!pendingDeleteId) {
      return;
    }

    const nextItems = savedItems.filter((item) => item.id !== pendingDeleteId);
    persistItems(nextItems);
    setPendingDeleteId(null);
  }

  if (!savedItems.length) {
    return (
      <div className="tab-screen saved-tab saved-tab--empty">
        {standalone ? (
          <div className="summary-bar">
            <button type="button" className="summary-back" onClick={onBack}>
              ← {t('back')}
            </button>
          </div>
        ) : null}
          <div className="saved-tab__empty-content">
          <div className="empty-state">
            <div className="empty-state__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 3.5A2.5 2.5 0 0 0 5.5 6v14.1c0 .3.16.58.42.72.26.14.58.14.84-.02L12 17.72l5.24 3.08a.82.82 0 0 0 1.26-.7V6A2.5 2.5 0 0 0 16 3.5H8z" />
              </svg>
            </div>
            <h2 className="empty-state__title">{t('saved_empty_title')}</h2>
            <p className="empty-state__text">{t('saved_empty_sub')}</p>
          </div>
          <button
            type="button"
            className="button button--primary"
            onClick={() => onTabChange(1)}
          >
            {t('search_now')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="tab-screen saved-tab">
        {standalone ? (
          <div className="summary-bar">
            <button type="button" className="summary-back" onClick={onBack}>
              ← {t('back')}
            </button>
          </div>
        ) : null}
        {savedItems.map((item) => (
          <Card key={item.id} className="saved-card">
            <h2 className="saved-card__title">
              {pickLocale(item.conditionName_en, item.conditionName_fil, item.conditionName_ceb, lang)}
            </h2>

            <div className="saved-card__meta">
              <span className="tag">
                {t('level_short', { level: getHospitalLevelNumber(item.hospitalLevel) })}
              </span>
              <span className="tag">{getMembershipLabel(item.memberType, lang)}</span>
            </div>

            <div className="saved-card__amount">₱{item.amount.toLocaleString()}</div>

            <Badge variant={item.directFiling ? 'success' : 'warning'} size="sm">
              {item.directFiling ? t('direct_filing_short') : t('reimburse_only_short')}
            </Badge>

            <p className="muted-text">{getRelativeDate(item.savedAt, lang, t)}</p>

            {editingId === item.id ? (
              <textarea
                autoFocus
                className="text-area"
                value={draftNote}
                onChange={(event) => setDraftNote(event.target.value)}
                onBlur={() => commitNote(item.id)}
                placeholder={t('add_note')}
              />
            ) : (
              <button
                type="button"
                className="note-preview"
                onClick={() => beginNoteEdit(item)}
              >
                {item.note || t('add_note')}
              </button>
            )}

            <div className="saved-card__footer">
              <button
                type="button"
                className="button button--outline button--sm"
                onClick={() => handleView(item)}
              >
                {t('view')}
              </button>
              <span className="saved-card__spacer" />
              <button
                type="button"
                className="icon-button icon-button--trash"
                onClick={() => setPendingDeleteId(item.id)}
                aria-label={t('delete')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              </button>
            </div>
          </Card>
        ))}
      </div>

      <BottomSheet
        isOpen={Boolean(pendingDeleteItem)}
        onClose={() => setPendingDeleteId(null)}
        title={t('delete_confirm_title')}
      >
        <div className="actions-row">
          <button
            type="button"
            className="button button--outline"
            onClick={() => setPendingDeleteId(null)}
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            className="button button--danger"
            onClick={handleDelete}
          >
            {t('delete')}
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
