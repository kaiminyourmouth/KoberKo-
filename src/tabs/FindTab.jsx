import { useEffect, useMemo, useRef, useState } from 'react';
import conditions from '../data/conditions.json';
import notCovered from '../data/not_covered.json';
import {
  getConditionById,
  getConditionDetail,
  getConditionsBySystem,
  getCoverage,
  getCoverageVariantPrompt,
  getFacilityWorkflowNote,
  getZBBStatus,
  searchConditions,
} from '../engine/coverage';
import {
  getHospitalById,
} from '../engine/hospitalSearch';
import Accordion from '../components/Accordion';
import Badge from '../components/Badge';
import BottomSheet from '../components/BottomSheet';
import Card from '../components/Card';
import { useToast } from '../components/Toast';
import {
  HOSPITAL_LEVELS,
  HOSPITAL_TYPE_OPTIONS,
  MEMBERSHIP_OPTIONS,
  PACKAGE_TYPE_KEYS,
  ROOM_TYPE_OPTIONS,
  SAVED_RESULTS_KEY,
  getHospitalLevelNumber,
  getMembershipLabel,
  getMembershipOptionById,
} from '../constants/options';
import { useLanguage } from '../context/LanguageContext';
import { useSearch } from '../context/SearchContext';
import useDebounce from '../hooks/useDebounce';
import { copyText } from '../utils/clipboard';
import { loadDefaultMembership, saveResultToStorage } from '../utils/storage';
import './tabs.css';

const PHYSICIAN_SEARCH_URL = 'https://philhealth.gov.ph/about/phps';
const MEMBER_PORTAL_URL = 'https://memberinquiry.philhealth.gov.ph/member/';

const MEMBERSHIP_ICONS = {
  SSS: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
  GSIS: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 22V9l9-7 9 7v13M9 22V12h6v10"/></svg>,
  VOLUNTARY: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>,
  OFW: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19.5 2.5S18 2 16.5 3.5L13 7 4.8 5.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>,
  NHTS: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 13c-1.1 0-2 .9-2 2s2 4 2 4 2-2.9 2-4-.9-2-2-2z"/></svg>,
  SPONSORED: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2M12 12v4M8 12v4M16 12v4"/></svg>,
  SENIOR: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="4.5" r="2"/><path d="M10 7v6"/><path d="M10 10h4"/><path d="M14 10l2 4"/><path d="M10 13l-2 7"/><path d="M17 13v7"/></svg>,
  LIFETIME: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  PWD: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="14.5" cy="4.5" r="1.5"/><circle cx="8.5" cy="18" r="3"/><path d="M10.5 18h6a3.5 3.5 0 1 0-3.5-3.5"/><path d="M12 8h3l2 4"/><path d="M12 8l-2 4"/></svg>,
  KASAMBAHAY: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>,
};

function formatAmount(amount) {
  if (typeof amount !== 'number') {
    return '0';
  }

  return amount.toLocaleString();
}

function normalizePlaceValue(value = '') {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function getHospitalTypeChipLabel(type, t) {
  if (type === 'DOH') return 'DOH';
  if (type === 'LGU') return 'LGU';
  return t('hospital_type_tag_PRIVATE_ACCREDITED');
}

function getRoomTypeLabel(roomType, lang) {
  const option = ROOM_TYPE_OPTIONS.find((item) => item.code === roomType);
  if (!option) {
    return '';
  }

  return lang === 'en' ? option.label_en : option.label_fil;
}


export default function FindTab({ onTabChange, onOpenChat, restoreToken = 0 }) {
  const { lang, t } = useLanguage();
  const { searchState, setSearchState, clearSearch } = useSearch();
  const { showToast, ToastContainer } = useToast();
  const shouldRestoreSearch = searchState.resultSource !== 'intake';

  const [view, setView] = useState(
    shouldRestoreSearch && searchState.result ? 'result' : 'picker',
  );
  const [query, setQuery] = useState('');
  const [activeSystem, setActiveSystem] = useState('');
  const [selectedCondition, setSelectedCondition] = useState(() =>
    shouldRestoreSearch ? getConditionById(searchState.conditionId) : null,
  );
  const [selectedMemberType, setSelectedMemberType] = useState(
    () => (shouldRestoreSearch ? searchState.memberType : '') || loadDefaultMembership(),
  );
  const [selectedHospitalLevel, setSelectedHospitalLevel] = useState(
    () => (shouldRestoreSearch ? searchState.hospitalLevel : '') || '',
  );
  const [selectedHospitalType, setSelectedHospitalType] = useState(
    () => (shouldRestoreSearch ? searchState.hospitalType : '') || '',
  );
  const [selectedRoomType, setSelectedRoomType] = useState(
    () => (shouldRestoreSearch ? searchState.roomType : '') || '',
  );
  const [selectedCoverageVariantKey, setSelectedCoverageVariantKey] = useState(
    () => (shouldRestoreSearch ? searchState.coverageVariantKey : '') || '',
  );
  const [detailConditionId, setDetailConditionId] = useState(null);
  const [isMembershipInfoOpen, setIsMembershipInfoOpen] = useState(false);
  const [isDirectFilingOpen, setIsDirectFilingOpen] = useState(false);
  const [ctaPulse, setCtaPulse] = useState(false);
  const [actualBillInput, setActualBillInput] = useState('');
  const [isSavedCurrent, setIsSavedCurrent] = useState(false);

  const debouncedQuery = useDebounce(query, 300);
  const systemsMap = getConditionsBySystem('en');
  const systems = Object.entries(systemsMap).map(([systemKey, systemConditions]) => ({
    key: systemKey,
    label: lang === 'en' ? systemKey : systemConditions[0]?.bodySystem_fil ?? systemKey,
    conditions: systemConditions,
  }));
  const isSearching = debouncedQuery.trim().length >= 2;
  const searchResults = isSearching ? searchConditions(debouncedQuery, lang) : [];
  const browseConditions = activeSystem
    ? systems.find((system) => system.key === activeSystem)?.conditions ?? []
    : conditions;
  const currentResult = searchState.result;
  const detailCondition = detailConditionId ? getConditionById(detailConditionId) : null;
  const detail = detailConditionId ? getConditionDetail(detailConditionId) : null;
  const variantConfig = selectedCondition ? getCoverageVariantPrompt(selectedCondition.id) : null;
  const zbbStatus = selectedMemberType && selectedHospitalType && selectedRoomType
    ? getZBBStatus(selectedMemberType, selectedHospitalType, selectedRoomType)
    : null;
  const canSubmit = Boolean(
    selectedCondition &&
    selectedMemberType &&
    selectedHospitalLevel &&
    selectedHospitalType &&
    selectedRoomType,
  );
  const previousReady = useRef(canSubmit);
  const hasDraft =
    Boolean(query.trim()) ||
    Boolean(activeSystem) ||
    Boolean(selectedCondition) ||
    Boolean(selectedHospitalLevel) ||
    Boolean(selectedHospitalType) ||
    Boolean(selectedRoomType) ||
    Boolean(shouldRestoreSearch && searchState.result);

  useEffect(() => {
    if (canSubmit && !previousReady.current) {
      setCtaPulse(true);
      const timer = window.setTimeout(() => setCtaPulse(false), 400);
      previousReady.current = canSubmit;
      return () => window.clearTimeout(timer);
    }

    previousReady.current = canSubmit;
    return undefined;
  }, [canSubmit]);

  useEffect(() => {
    const restoredCondition = getConditionById(searchState.conditionId);
    if (!shouldRestoreSearch || !restoredCondition) {
      setView('picker');
      return;
    }

    setSelectedCondition(restoredCondition);
    setSelectedMemberType(searchState.memberType || loadDefaultMembership());
    setSelectedHospitalLevel(searchState.hospitalLevel || '');
    setSelectedHospitalType(searchState.hospitalType || '');
    setSelectedRoomType(searchState.roomType || '');
    setSelectedCoverageVariantKey(searchState.coverageVariantKey || '');

    if (searchState.result) {
      setView('result');
    }
  }, [
    restoreToken,
    shouldRestoreSearch,
    searchState.conditionId,
    searchState.memberType,
    searchState.hospitalLevel,
    searchState.hospitalType,
    searchState.roomType,
    searchState.coverageVariantKey,
    searchState.result,
  ]);

  useEffect(() => {
    if (!selectedCondition) {
      setSelectedCoverageVariantKey('');
      return;
    }

    const nextConfig = getCoverageVariantPrompt(selectedCondition.id);
    if (!nextConfig) {
      setSelectedCoverageVariantKey('');
      return;
    }

    const isValid = nextConfig.options.some((option) => option.key === selectedCoverageVariantKey);
    if (!isValid) {
      setSelectedCoverageVariantKey(nextConfig.defaultKey || nextConfig.options[0]?.key || '');
    }
  }, [selectedCondition?.id]);

  useEffect(() => {
    setActualBillInput('');
  }, [currentResult?.conditionId, currentResult?.amount]);

  useEffect(() => {
    if (!selectedCondition || !currentResult) {
      setIsSavedCurrent(false);
      return;
    }

    try {
      const savedItems = JSON.parse(localStorage.getItem(SAVED_RESULTS_KEY) || '[]');
      const alreadySaved = savedItems.some(
        (item) =>
          item.conditionId === selectedCondition.id &&
          item.memberType === selectedMemberType &&
          item.hospitalLevel === selectedHospitalLevel &&
          (item.coverageVariantKey || '') === (selectedCoverageVariantKey || ''),
      );
      setIsSavedCurrent(alreadySaved);
    } catch {
      setIsSavedCurrent(false);
    }
  }, [selectedCondition?.id, selectedMemberType, selectedHospitalLevel, selectedCoverageVariantKey, currentResult?.amount]);

  function handleConditionSelect(condition) {
    setSelectedCondition(condition);
    const nextVariantConfig = getCoverageVariantPrompt(condition.id);
    setSelectedCoverageVariantKey(nextVariantConfig?.defaultKey || nextVariantConfig?.options[0]?.key || '');
    setQuery('');
    if (!activeSystem) {
      setActiveSystem(condition.bodySystem_en);
    }
  }

  function handleConditionDetailOpen(conditionId) {
    setDetailConditionId(conditionId);
  }

  function handleConditionDetailClose() {
    setDetailConditionId(null);
  }

  function handleConditionDetailSelect() {
    if (!detailCondition) {
      return;
    }

    handleConditionSelect(detailCondition);
    handleConditionDetailClose();
  }

  function handleSubmit() {
    if (!selectedCondition || !selectedMemberType || !selectedHospitalLevel) {
      return;
    }

    const result = getCoverage(
      selectedCondition.id,
      selectedMemberType,
      selectedHospitalLevel,
      { variantKey: selectedCoverageVariantKey || undefined },
    );

    if (!result) {
      return;
    }

    setSearchState({
      conditionId: selectedCondition.id,
      conditionName_fil: selectedCondition.name_fil,
      conditionName_en: selectedCondition.name_en,
      memberType: selectedMemberType,
      hospitalLevel: selectedHospitalLevel,
      hospitalType: selectedHospitalType,
      roomType: selectedRoomType,
      coverageVariantKey: selectedCoverageVariantKey || null,
      resultSource: 'find',
      result,
    });
    setActualBillInput('');
    setView('result');
  }

  function handleReset() {
    clearSearch();
    setView('picker');
    setQuery('');
    setActiveSystem('');
    setSelectedCondition(null);
    setSelectedMemberType(loadDefaultMembership());
    setSelectedHospitalLevel('');
    setSelectedHospitalType('');
    setSelectedRoomType('');
    setSelectedCoverageVariantKey('');
    setDetailConditionId(null);
    setIsMembershipInfoOpen(false);
    setIsDirectFilingOpen(false);
    setCtaPulse(false);
    setActualBillInput('');
  }

  function handleOpenNotCoveredChat() {
    const trimmedQuery = query.trim();

    setSearchState((current) => ({
      ...current,
      intakeContext: {
        scenario: 'SCENARIO_PLANNING',
        conditionId: selectedCondition?.id ?? '',
        conditionName: selectedCondition
          ? lang === 'en'
            ? selectedCondition.name_en
            : selectedCondition.name_fil
          : trimmedQuery,
        conditionName_fil: selectedCondition?.name_fil ?? '',
        conditionName_en: selectedCondition?.name_en ?? '',
        symptomDescription: trimmedQuery,
        memberType: selectedMemberType || current.memberType || '',
        hospitalLevel: selectedHospitalLevel || current.hospitalLevel || '',
        hospitalType: selectedHospitalType || current.hospitalType || '',
        roomType: selectedRoomType || current.roomType || '',
        coverageVariantKey: selectedCoverageVariantKey || current.coverageVariantKey || '',
      },
    }));

    onOpenChat?.();
  }

  function handleSave() {
    if (!selectedCondition || !currentResult) {
      return;
    }

    saveResultToStorage({
      id: `${selectedCondition.id}-${selectedMemberType}-${selectedHospitalLevel}-${Date.now()}`,
      conditionId: selectedCondition.id,
      conditionName_fil: selectedCondition.name_fil,
      conditionName_en: selectedCondition.name_en,
      memberType: selectedMemberType,
      hospitalLevel: selectedHospitalLevel,
      coverageVariantKey: selectedCoverageVariantKey || null,
      amount: currentResult.amount,
      directFiling: currentResult.directFiling,
      circular: currentResult.circular,
      variantUsed_en: currentResult.variantUsed_en,
      variantUsed_fil: currentResult.variantUsed_fil,
      savedAt: new Date().toISOString(),
      note: '',
    });

    setIsSavedCurrent(true);
    showToast(t('saved_toast'), 'success');
  }

  function renderResultStatusCard(result) {
    if (!result) {
      return null;
    }

    const selectedHospital = searchState.hospitalId ? getHospitalById(searchState.hospitalId) : null;
    const contextParts = [];

    if (result.selectedVariantName_en || result.selectedVariantName_fil) {
      contextParts.push(lang === 'en' ? result.selectedVariantName_en : result.selectedVariantName_fil);
    }

    contextParts.push(t('level_short', { level: getHospitalLevelNumber(selectedHospitalLevel) }));

    if (selectedHospital) {
      contextParts.push(selectedHospital.name);
    } else if (selectedHospitalType) {
      contextParts.push(getHospitalTypeChipLabel(selectedHospitalType, t));
    }

    if (selectedRoomType) {
      contextParts.push(getRoomTypeLabel(selectedRoomType, lang));
    }

    if (selectedMemberType) {
      contextParts.push(getMembershipLabel(selectedMemberType, lang));
    }

    return (
      <Card className="saved-card">
        <strong>{t('result_status_title')}</strong>
        <p className="muted-text">{t('result_status_body', { context: contextParts.filter(Boolean).join(' • ') })}</p>
      </Card>
    );
  }

  function renderBringChecklistCard(result) {
    if (!result?.documents?.length) {
      return null;
    }

    const quickItems = result.documents.filter((item) => item.critical);
    const visibleItems = (quickItems.length ? quickItems : result.documents).slice(0, 5);

    return (
      <section className="tab-section screen-only">
        <Accordion title={t('bring_checklist_title')}>
          <div className="sheet-list">
            <p className="muted-text">{t('bring_checklist_sub')}</p>
            {visibleItems.map((item) => (
              <div key={`${item.order}-${item.label_en}`} className="sheet-list__item">
                <div className="list-button__row">
                  <span>{lang === 'en' ? item.label_en : item.label_fil}</span>
                  {item.critical ? (
                    <Badge variant="danger" size="sm">{t('required')}</Badge>
                  ) : null}
                </div>
              </div>
            ))}
            <button
              type="button"
              className="button button--outline button--sm"
              onClick={() => onTabChange(2)}
            >
              {t('bring_checklist_open_guide')}
            </button>
          </div>
        </Accordion>
      </section>
    );
  }

  function renderHospitalAccreditationSection(result) {
    if (!result) {
      return null;
    }

    const selectedHospital = searchState.hospitalId ? getHospitalById(searchState.hospitalId) : null;
    const selectedTypeLabel = selectedHospital
      ? getHospitalTypeChipLabel(selectedHospital.type, t)
      : selectedHospitalType
        ? t(`hospital_type_tag_${selectedHospitalType}`)
        : '';
    const packageAccreditationNote =
      lang === 'en' ? result.packageAccreditationNote_en : result.packageAccreditationNote_fil;
    const isNonAccredited =
      selectedHospital?.philhealthAccredited === false || selectedHospitalType === 'PRIVATE_NOT_ACCREDITED';

    return (
      <section className="tab-section screen-only">
        <Card className="saved-card">
          <h3 className="tab-section__title">{t('hospital_accreditation_title')}</h3>
          <p>
            {isNonAccredited
              ? t('hospital_accreditation_non_accredited_body')
              : selectedHospital
                ? t('hospital_accreditation_yes_selected', { name: selectedHospital.name })
                : selectedHospitalType && selectedHospitalType !== 'UNKNOWN'
                  ? t('hospital_accreditation_yes_typed', { type: selectedTypeLabel })
                  : t('hospital_accreditation_unknown')}
          </p>
          {selectedHospital ? (
            <p className="muted-text">
              {t('hospital_accreditation_selected_meta', {
                level: selectedHospital.level,
                type: selectedTypeLabel,
              })}
            </p>
          ) : selectedHospitalLevel || selectedTypeLabel ? (
            <p className="muted-text">
              {t('hospital_accreditation_context_meta', {
                level: getHospitalLevelNumber(selectedHospitalLevel) || '?',
                type: selectedTypeLabel || t('hospital_type_tag_UNKNOWN'),
              })}
            </p>
          ) : null}
        </Card>

        {isNonAccredited ? (
          <Card variant="warning" className="saved-card">
            <p>{t('hospital_accreditation_emergency_exception')}</p>
          </Card>
        ) : null}

        {packageAccreditationNote ? (
          <Card variant="warning" className="saved-card">
            <strong>{t('package_accreditation_title')}</strong>
            <p>{packageAccreditationNote}</p>
          </Card>
        ) : null}
      </section>
    );
  }

  function renderVariantPicker() {
    if (!variantConfig) {
      return null;
    }

    return (
      <section className="tab-section picker-panel">
        <div className="tab-section__header">
          <h2 className="tab-section__title">{t('coverage_detail_title')}</h2>
        </div>

        <div className="sheet-list__item">
          <span className="sheet-list__title">
            {lang === 'en' ? variantConfig.title_en : variantConfig.title_fil}
          </span>
          <span className="muted-text">
            {lang === 'en' ? variantConfig.note_en : variantConfig.note_fil}
          </span>
        </div>

        <div className="select-grid">
          {variantConfig.options.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`select-card${selectedCoverageVariantKey === option.key ? ' select-card--selected' : ''}`}
              onClick={() => setSelectedCoverageVariantKey(option.key)}
            >
              <span className="select-card__title">
                {lang === 'en' ? option.label_en : option.label_fil}
              </span>
              <span className="select-card__desc">
                {lang === 'en' ? option.desc_en : option.desc_fil}
              </span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  async function handleCopyIcd10(code) {
    if (!code) {
      return;
    }

    try {
      await copyText(code);
      showToast(`${t('copied')} ✓`, 'success');
    } catch {
      showToast(t('copy_failed'), 'warning');
    }
  }

  function renderConfidenceBadge(result) {
    const confidence = result?.dataConfidence?.confidence ?? result?.confidence ?? 'needs_check';
    const verifiedBy = result?.dataConfidence?.verifiedBy ?? result?.verifiedBy ?? null;

    if (confidence === 'verified') {
      return (
        <div className="hero-card__confidence">
          <Badge
            variant="success"
            size="sm"
            title={verifiedBy ? t('data_confidence_verified_detail', { source: verifiedBy }) : ''}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            {t('data_confidence_verified')}
          </Badge>
        </div>
      );
    }

    if (confidence === 'estimated') {
      return (
        <div className="hero-card__confidence">
          <Badge variant="warning" size="sm">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {t('data_confidence_estimated')}
          </Badge>
        </div>
      );
    }

    return (
      <div className="hero-card__confidence">
        <Badge variant="danger" size="sm">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          {t('data_confidence_needs_check')}
        </Badge>
      </div>
    );
  }

  function renderConfidenceNotice(result) {
    const confidence = result?.dataConfidence?.confidence ?? result?.confidence ?? 'needs_check';
    const verifiedBy = result?.dataConfidence?.verifiedBy ?? result?.verifiedBy ?? null;

    if (confidence === 'verified') {
      return verifiedBy ? (
        <p className="muted-text">{t('data_confidence_verified_detail', { source: verifiedBy })}</p>
      ) : null;
    }

    if (confidence === 'estimated') {
      return (
        <Card variant="warning" className="saved-card">
          <strong>{t('data_confidence_estimated_title')}</strong>
          <p>{t('data_confidence_estimated_body')}</p>
        </Card>
      );
    }

    return (
      <Card variant="warning" className="saved-card">
        <strong>{t('data_confidence_needs_check_title')}</strong>
        <p>{t('data_confidence_needs_check_body')}</p>
      </Card>
    );
  }

  function renderCoverageVariants(result) {
    if (!result?.subPackages?.length) {
      return null;
    }

    return (
      <Card className="saved-card">
        <strong>{t('coverage_variants_title')}</strong>
        <p className="muted-text">{t('coverage_variants_note')}</p>
        <div className="tab-section" style={{ gap: '10px' }}>
          {result.subPackages.map((item) => (
            <div key={`${item.name_en}-${item.amount}`} className="list-button">
              <div className="list-button__row">
                <span className="list-button__title">
                  {lang === 'en' ? item.name_en : item.name_fil}
                </span>
                <span className="saved-card__amount">₱{formatAmount(item.amount)}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  function renderSourceUsedCard(result) {
    if (!result) {
      return null;
    }

    const variantUsed = lang === 'en' ? result.variantUsed_en : result.variantUsed_fil;
    const sourceDetail = lang === 'en' ? result.sourceDetail_en : result.sourceDetail_fil;

    return (
      <Card className="saved-card">
        <strong>{t('source_used_title')}</strong>
        <div className="sheet-list">
          <div className="sheet-list__item">
            <span className="sheet-list__title">{t('source_used_label')}</span>
            <span className="muted-text">
              {result.circularUrl ? (
                <a href={result.circularUrl} target="_blank" rel="noreferrer">
                  {result.circular}
                </a>
              ) : (
                result.circular
              )}
            </span>
          </div>
          {variantUsed ? (
            <div className="sheet-list__item">
              <span className="sheet-list__title">{t('source_variant_label')}</span>
              <span className="muted-text">{variantUsed}</span>
            </div>
          ) : null}
          {sourceDetail ? (
            <div className="sheet-list__item">
              <span className="muted-text">{sourceDetail}</span>
            </div>
          ) : null}
          {result.lastReviewed ? (
            <div className="sheet-list__item">
              <span className="sheet-list__title">{t('source_last_reviewed_label')}</span>
              <span className="muted-text">{result.lastReviewed}</span>
            </div>
          ) : null}
        </div>
      </Card>
    );
  }

  function renderConditionRow(condition, { largeTitle = false, showPackageTag = false }) {
    const isSelected = selectedCondition?.id === condition.id;
    const conditionName = lang === 'en' ? condition.name_en : condition.name_fil;
    const bodySystem = lang === 'en' ? condition.bodySystem_en : condition.bodySystem_fil;

    return (
      <div
        key={condition.id}
        className={`condition-row${isSelected ? ' condition-row--selected' : ''}`}
      >
        <button
          type="button"
          className="condition-row__main"
          onClick={() => handleConditionSelect(condition)}
        >
          <span className="list-button__row">
            <span className={`list-button__title${largeTitle ? ' list-button__title--large' : ''}`}>
              {conditionName}
            </span>
            {isSelected ? <span aria-hidden="true">✓</span> : null}
          </span>
          <span className="list-button__meta">
            {showPackageTag ? (
              <span className="tag tag--gray">{t(PACKAGE_TYPE_KEYS[condition.packageType])}</span>
            ) : (
              <span className="tag">{bodySystem}</span>
            )}
          </span>
        </button>

        <button
          type="button"
          className="condition-row__info"
          onClick={() => handleConditionDetailOpen(condition.id)}
          aria-label={`${t('more_info')} ${conditionName}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </button>
      </div>
    );
  }

  function renderPickerView() {
    return (
      <div className="tab-screen find-tab find-tab--picker">
        {hasDraft ? (
          <div className="summary-bar">
            <span className="muted-text">{t('find_heading')}</span>
            <button
              type="button"
              className="button button--outline button--sm"
              onClick={handleReset}
            >
              {t('start_over')}
            </button>
          </div>
        ) : null}

        <div className="tab-section">
          <label className="sr-only" htmlFor="condition-search">
            {t('search_placeholder')}
          </label>
          <div className="search-input-wrap">
            <span className="search-input__icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </span>
            <input
              id="condition-search"
              className="search-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('search_placeholder')}
            />
          </div>
          <p className="muted-text">{t('smart_search_hint')}</p>
        </div>

        {isSearching ? (
          <Card className="list-card">
            {searchResults.length ? (
              searchResults.map((condition) =>
                renderConditionRow(condition, { largeTitle: true, showPackageTag: false }),
              )
            ) : (
              <div className="saved-card">
                <p className="saved-card__title">{t('no_results_title')}</p>
                <p className="muted-text">{t('no_results_sub')}</p>
                <p className="muted-text">{t('smart_search_no_results')}</p>
              </div>
            )}
          </Card>
        ) : (
          <>
            <div className="chips-row" aria-label={t('browse_by_system')}>
              <button
                type="button"
                className={`chip${!activeSystem ? ' chip--active' : ''}`}
                onClick={() => setActiveSystem('')}
              >
                {t('all_systems')}
              </button>
              {systems.map((system) => (
                <button
                  key={system.key}
                  type="button"
                  className={`chip${activeSystem === system.key ? ' chip--active' : ''}`}
                  onClick={() => setActiveSystem(system.key)}
                >
                  {system.label}
                </button>
              ))}
            </div>

            <Card className="list-card">
              {browseConditions.map((condition) =>
                renderConditionRow(condition, { largeTitle: false, showPackageTag: true }),
              )}
            </Card>
          </>
        )}

        <section className="tab-section screen-only">
          <Accordion title={t('not_covered_picker_title')}>
            <div className="sheet-list">
              <p className="muted-text">{t('not_covered_picker_body')}</p>

              <div className="sheet-list__item">
                <span className="sheet-list__title">{t('not_covered_categories_title')}</span>
                <div className="sheet-list">
                  {notCovered.categories.map((category) => (
                    <Accordion
                      key={category.category_en}
                      title={lang === 'en' ? category.category_en : category.category_fil}
                    >
                      <div className="sheet-list">
                        {(lang === 'en' ? category.items_en : category.items_fil).map((item) => (
                          <span key={item} className="muted-text">
                            • {item}
                          </span>
                        ))}
                      </div>
                    </Accordion>
                  ))}
                </div>
              </div>

              <div className="sheet-list__item">
                <span className="sheet-list__title">{t('not_covered_emergency_title')}</span>
                <span className="muted-text">
                  {lang === 'en' ? notCovered.emergencyNote_en : notCovered.emergencyNote_fil}
                </span>
              </div>

              <button
                type="button"
                className="button button--outline"
                onClick={handleOpenNotCoveredChat}
              >
                {t('ask_our_ai')}
              </button>
            </div>
          </Accordion>
        </section>

        <div className={`reveal-section ${selectedCondition ? 'reveal-section--visible' : 'reveal-section--hidden'}`}>
          {renderVariantPicker()}

          <section className="tab-section picker-panel">
            <div className="tab-section__header">
              <div className="inline-row">
                <h2 className="tab-section__title">{t('your_membership')}</h2>
                <button
                  type="button"
                  className="helper-button"
                  onClick={() => setIsMembershipInfoOpen(true)}
                  aria-label={t('membership_info_title')}
                >
                  i
                </button>
              </div>
            </div>

            <div className="select-grid">
              {MEMBERSHIP_OPTIONS.map((option) => {
                const isSelected = selectedMemberType === option.code;
                return (
                  <button
                    key={option.code}
                    type="button"
                    className={`select-card${isSelected ? ' select-card--selected' : ''}`}
                    onClick={() => setSelectedMemberType(option.code)}
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
                );
              })}
            </div>
          </section>

          <section className="tab-section picker-panel">
            <div className="tab-section__header">
              <div className="inline-row">
                <h2 className="tab-section__title">{t('hospital_level_label')}</h2>
              </div>
            </div>

            <div className="select-grid">
              {HOSPITAL_LEVELS.map((level) => {
                const levelNumber = getHospitalLevelNumber(level.code);
                const isSelected = selectedHospitalLevel === level.code;
                return (
                  <button
                    key={level.code}
                    type="button"
                    className={`select-card${isSelected ? ' select-card--selected' : ''}`}
                    onClick={() => setSelectedHospitalLevel(level.code)}
                  >
                    <span className="select-card__title">
                      {t('level_short', { level: levelNumber })}
                    </span>
                    <span className="select-card__desc">{t(level.descriptionKey)}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="tab-section picker-panel">
            <div className="tab-section__header">
              <div className="inline-row">
                <h2 className="tab-section__title">{t('hospital_type_label')}</h2>
              </div>
            </div>

            <div className="select-grid">
              {HOSPITAL_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  className={`select-card${selectedHospitalType === option.code ? ' select-card--selected' : ''}`}
                  onClick={() => setSelectedHospitalType(option.code)}
                >
                  <span className="select-card__title">{t(option.labelKey)}</span>
                  <span className="select-card__desc">{t(option.descriptionKey)}</span>
                </button>
              ))}
            </div>

            {selectedHospitalType === 'UNKNOWN' ? (
              <div className="notice notice--warning">
                {t('hospital_type_unknown_tip')}
              </div>
            ) : null}
          </section>

          <section className="tab-section picker-panel">
            <div className="tab-section__header">
              <div className="inline-row">
                <h2 className="tab-section__title">{t('room_type_label')}</h2>
              </div>
            </div>

            <div className="select-grid">
              {ROOM_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  className={`select-card${selectedRoomType === option.code ? ' select-card--selected' : ''}`}
                  onClick={() => setSelectedRoomType(option.code)}
                >
                  <span className="select-card__title">{t(option.labelKey)}</span>
                  <span className="select-card__desc">{t(option.descriptionKey)}</span>
                </button>
              ))}
            </div>
          </section>

          <button
            type="button"
            className={`button button--primary${ctaPulse ? ' button--pulse' : ''}${canSubmit ? '' : ' button--disabled'}`}
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {t('see_coverage')}
          </button>
        </div>

        <BottomSheet
          isOpen={isMembershipInfoOpen}
          onClose={() => setIsMembershipInfoOpen(false)}
          title={t('membership_info_title')}
        >
          <p className="muted-text">{t('membership_info_intro')}</p>
          <div className="sheet-list">
            {MEMBERSHIP_OPTIONS.map((option) => (
              <div key={option.code} className="sheet-list__item">
                <span className="sheet-list__title">
                  {option.icon} {lang === 'en' ? option.label_en : option.label_fil}
                </span>
                <span className="muted-text">{lang === 'en' ? option.desc_en : option.desc_fil}</span>
              </div>
            ))}
          </div>
        </BottomSheet>

        <BottomSheet
          isOpen={Boolean(detailCondition && detail)}
          onClose={handleConditionDetailClose}
          title={detailCondition ? (lang === 'en' ? detailCondition.name_en : detailCondition.name_fil) : ''}
        >
          {detailCondition && detail ? (
            <div className="condition-detail">
              {detailCondition.icd10 ? (
                <section className="condition-detail__section">
                  <Card className="condition-detail__code-card">
                    <div className="condition-detail__code-row">
                      <div className="condition-detail__code-copy">
                        <span className="condition-detail__stat-label">{t('icd10_code')}</span>
                        <strong>{detailCondition.icd10}</strong>
                        {detailCondition.icd10_description ? (
                          <span className="muted-text">{detailCondition.icd10_description}</span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className="helper-button"
                        onClick={() => void handleCopyIcd10(detailCondition.icd10)}
                        aria-label={`${t('copy')} ${detailCondition.icd10}`}
                      >
                        ⧉
                      </button>
                    </div>
                    <p className="muted-text">{t('icd10_note')}</p>
                  </Card>
                </section>
              ) : null}

              <section className="condition-detail__section">
                <h3 className="tab-section__title">{t('symptoms')}</h3>
                <div className="chips-row condition-detail__symptoms">
                  {(lang === 'en' ? detail.symptoms_en : detail.symptoms_fil).map((symptom) => (
                    <span key={symptom} className="tag condition-detail__symptom-tag">
                      {symptom}
                    </span>
                  ))}
                </div>
              </section>

              <section className="condition-detail__section">
                <h3 className="tab-section__title">{t('what_is_it')}</h3>
                <p className="muted-text">
                  {lang === 'en' ? detail.whatIsIt_en : detail.whatIsIt_fil}
                </p>
              </section>

              <section className="condition-detail__stats">
                <Card className="condition-detail__stat-card">
                  <span className="condition-detail__stat-label">{t('typical_stay')}</span>
                  <strong>{lang === 'en' ? detail.typicalStay_en : detail.typicalStay_fil}</strong>
                </Card>
                <Card className="condition-detail__stat-card">
                  <span className="condition-detail__stat-label">{t('avg_total_bill')}</span>
                  <strong>{lang === 'en' ? detail.averageTotalBill_en : detail.averageTotalBill_fil}</strong>
                </Card>
              </section>

              <section className="condition-detail__section">
                <h3 className="tab-section__title">{t('when_to_go')}</h3>
                <Card className="condition-detail__compare-card">
                  <div className="condition-detail__compare-row">
                    <span className="condition-detail__compare-label">{t('level_short', { level: 2 })}</span>
                    <p>{lang === 'en' ? detail.whenToGoLevel2_en : detail.whenToGoLevel2_fil}</p>
                  </div>
                  <div className="condition-detail__compare-row">
                    <span className="condition-detail__compare-label">{t('level_short', { level: 3 })}+</span>
                    <p>{lang === 'en' ? detail.whenToGoLevel3_en : detail.whenToGoLevel3_fil}</p>
                  </div>
                </Card>
              </section>

              <section className="condition-detail__section">
                <h3 className="tab-section__title">{t('tips')}</h3>
                <div className="condition-detail__tips">
                  {(lang === 'en' ? detail.tips_en : detail.tips_fil).map((tip) => (
                    <div key={tip} className="condition-detail__tip">
                      <span aria-hidden="true" style={{color:'var(--color-warning)'}}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      </span>
                      <p>{tip}</p>
                    </div>
                  ))}
                </div>
              </section>

              <Card variant="warning" className="condition-detail__severity-card">
                <span className="condition-detail__stat-label">{t('severity_note')}</span>
                <p>{lang === 'en' ? detail.severityNote_en : detail.severityNote_fil}</p>
              </Card>

              <button
                type="button"
                className="button button--primary"
                onClick={handleConditionDetailSelect}
              >
                {t('select_this_condition')}
              </button>
            </div>
          ) : null}
        </BottomSheet>
      </div>
    );
  }

  function renderResultView() {
    if (!selectedCondition || !currentResult) {
      return renderPickerView();
    }

    const conditionName = lang === 'en' ? selectedCondition.name_en : selectedCondition.name_fil;
    const packageName = lang === 'en' ? currentResult.packageName_en : currentResult.packageName_fil;
    const membershipNote = lang === 'en' ? currentResult.membershipNote_en : currentResult.membershipNote_fil;
    const membershipOption = getMembershipOptionById(selectedMemberType);
    const selectedHospital = searchState.hospitalId ? getHospitalById(searchState.hospitalId) : null;
    const facilityWorkflowNote = getFacilityWorkflowNote(
      currentResult,
      selectedHospitalType,
      selectedRoomType,
      selectedHospital?.name || '',
    );
    const effectiveDate = lang === 'en' ? currentResult.effectiveDate : currentResult.effectiveDate_fil;
    const billingScript = lang === 'en' ? currentResult.billingScript_en : currentResult.billingScript_fil;
    const dualBenefitNote = membershipOption
      ? lang === 'en'
        ? membershipOption.discountNote_en
        : membershipOption.discountNote_fil
      : '';
    const dualBenefitTitle =
      selectedMemberType === 'SENIOR'
        ? t('dual_benefit_senior_title')
        : selectedMemberType === 'PWD'
          ? t('dual_benefit_pwd_title')
          : '';
    const actualBillAmount = Number(actualBillInput);
    const hasActualBill = Number.isFinite(actualBillAmount) && actualBillAmount > 0;
    const displayedAmount =
      hasActualBill && actualBillAmount < currentResult.amount
        ? actualBillAmount
        : currentResult.amount;
    const exactCopay =
      hasActualBill && !zbbStatus?.zbbApplies
        ? Math.max(actualBillAmount - displayedAmount, 0)
        : null;
    const membershipVariant =
      selectedMemberType === 'NHTS'
        ? 'success'
        : selectedMemberType === 'SENIOR'
          ? 'warning'
          : selectedMemberType === 'PWD'
            ? 'primary'
            : 'default';

    return (
      <div className="tab-screen find-tab find-tab--result">
        <div className="summary-bar screen-only">
          <button
            type="button"
            className="summary-back"
            onClick={() => setView('picker')}
          >
            ← {t('back')}
          </button>
          <button
            type="button"
            className="button button--outline button--sm"
            onClick={handleReset}
          >
            {t('start_over')}
          </button>
        </div>

        <div className="summary-tags">
          <span className="tag tag--gray">{conditionName}</span>
          <span className="tag tag--gray">{t('level_short', { level: getHospitalLevelNumber(selectedHospitalLevel) })}</span>
          <span className="tag tag--gray">
            {getMembershipLabel(selectedMemberType, lang)}
          </span>
          {currentResult.selectedVariantName_en || currentResult.selectedVariantName_fil ? (
            <span className="tag tag--gray">
              {lang === 'en' ? currentResult.selectedVariantName_en : currentResult.selectedVariantName_fil}
            </span>
          ) : null}
          {selectedHospital ? (
            <span className="tag tag--gray">
              {`${selectedHospital.name} • ${t('level_short', { level: selectedHospital.level })} • ${getHospitalTypeChipLabel(selectedHospital.type, t)}`}
            </span>
          ) : null}
          {selectedHospitalType ? <span className="tag tag--gray">{t(`hospital_type_tag_${selectedHospitalType}`)}</span> : null}
          {selectedRoomType ? <span className="tag tag--gray">{t(`room_type_tag_${selectedRoomType}`)}</span> : null}
        </div>

        {renderResultStatusCard(currentResult)}

        {zbbStatus ? (
          <div className={`zbb-banner${zbbStatus.zbbApplies ? ' zbb-banner--success' : ''}`}>
            <div className="zbb-banner__content">
              <strong className="zbb-card__title">
                {zbbStatus.zbbType === 'FULL_ZBB'
                  ? t('zbb_full_banner')
                  : zbbStatus.zbbType === 'NBB'
                    ? t('zbb_nbb_banner')
                    : selectedRoomType === 'PRIVATE'
                      ? t('zbb_private_room_warning')
                      : t('zbb_regular_banner')}
              </strong>
              <p>{lang === 'en' ? zbbStatus.explanation_en : zbbStatus.explanation_fil}</p>
              {(lang === 'en' ? zbbStatus.warning_en : zbbStatus.warning_fil) ? (
                <p className="muted-text">
                  {lang === 'en' ? zbbStatus.warning_en : zbbStatus.warning_fil}
                </p>
              ) : null}
              {selectedHospital?.isDOH && selectedRoomType === 'WARD' ? (
                <p className="muted-text text-success">
                  {t('hospital_context_doh_confirm', { name: selectedHospital.name })}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="amount-hero-card print-block">
          <span className="hero-card__label">{t('philhealth_pays')}</span>
          <div className="hero-card__amount-row">
            <div className="hero-card__amount">
              <span className="currency">₱</span>{formatAmount(displayedAmount)}
            </div>
            {renderConfidenceBadge(currentResult)}
          </div>
          <p className="hero-card__package">{packageName}</p>
          <p className="muted-text">
            {t('lesser_of_note', { amount: formatAmount(currentResult.amount) })}
          </p>
        </div>

        {renderConfidenceNotice(currentResult)}

        <button
          type="button"
          className="tab-section print-block"
          onClick={() => setIsDirectFilingOpen(true)}
          style={{ width: '100%', border: 'none', background: 'none', padding: 0, textAlign: 'left' }}
        >
          <div className={`df-badge ${currentResult.directFiling ? 'df-badge--yes' : 'df-badge--no'}`}>
            <span className="df-badge__icon" aria-hidden="true">
              {currentResult.directFiling ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              )}
            </span>
            <span className="df-badge__text">
              {currentResult.directFiling ? t('direct_filing_badge') : t('reimburse_only_badge')}
            </span>
          </div>
          <span
            className={`muted-text ${currentResult.directFiling ? 'text-success' : 'text-warning'}`}
            style={{ display: 'block', marginTop: '6px' }}
          >
            {currentResult.directFiling
              ? t('direct_filing_explanation')
              : t('reimburse_explanation')}
          </span>
        </button>

        {currentResult.requiresPreAuth ? (
          <Card variant="warning" className="saved-card">
            <strong>{t('preauth_title')}</strong>
            <p>{t('preauth_body_intro')}</p>
            <p>
              {lang === 'en' ? currentResult.preAuthNote_en : currentResult.preAuthNote_fil}
            </p>
            <p className="muted-text">{t('preauth_emergency_note')}</p>
          </Card>
        ) : null}

        {(lang === 'en' ? currentResult.coverageNote_en : currentResult.coverageNote_fil) ? (
          <Card className="saved-card">
            <strong>{t('coverage_note_title')}</strong>
            <p>{lang === 'en' ? currentResult.coverageNote_en : currentResult.coverageNote_fil}</p>
          </Card>
        ) : null}

        {renderCoverageVariants(currentResult)}

        {renderSourceUsedCard(currentResult)}

        {facilityWorkflowNote ? (
          <Card className="saved-card">
            <strong>{lang === 'en' ? facilityWorkflowNote.title_en : facilityWorkflowNote.title_fil}</strong>
            <p>{lang === 'en' ? facilityWorkflowNote.body_en : facilityWorkflowNote.body_fil}</p>
          </Card>
        ) : null}

        {!zbbStatus?.zbbApplies ? (
          <Card className="saved-card">
            <div className="list-button__row">
              <span className="sheet-list__title">{t('your_copay')}</span>
              <span className="saved-card__amount">
                {exactCopay !== null
                  ? `₱${formatAmount(exactCopay)}`
                  : `₱${formatAmount(currentResult.copayMin)} - ₱${formatAmount(currentResult.copayMax)}`}
              </span>
            </div>
            <p className="muted-text">
              {hasActualBill && actualBillAmount < currentResult.amount
                ? t('actual_bill_lower_note')
                : t('copay_note')}
            </p>
            {(selectedMemberType === 'SSS' || selectedMemberType === 'GSIS') ? (
              <p className="muted-text">{t('hmo_copay_note')}</p>
            ) : null}
          </Card>
        ) : null}

        <label className="tab-section screen-only">
          <span className="sheet-list__title">{t('actual_bill_input_label')}</span>
          <input
            className="search-input"
            type="number"
            min="0"
            inputMode="numeric"
            placeholder={t('actual_bill_input_placeholder')}
            value={actualBillInput}
            onChange={(event) => setActualBillInput(event.target.value)}
          />
        </label>

        {renderHospitalAccreditationSection(currentResult)}
        {renderBringChecklistCard(currentResult)}

        {dualBenefitNote ? (
          <Card
            variant={selectedMemberType === 'SENIOR' ? 'warning' : 'primary'}
            className="saved-card"
          >
            <strong>{dualBenefitTitle}</strong>
            <p>{dualBenefitNote}</p>
          </Card>
        ) : null}

        {membershipNote ? (
          <Card variant={membershipVariant} className="saved-card">
            <span className="sheet-list__title">{membershipNote}</span>
          </Card>
        ) : null}

        {currentResult.malasakitEligible && selectedMemberType === 'NHTS' ? (
          <Card variant="success" className="saved-card">
            <strong>{t('malasakit_title')}</strong>
            <p>{lang === 'en' ? currentResult.malasakitNote_en : currentResult.malasakitNote_fil}</p>
            {selectedHospital?.hasMalasakitCenter ? (
              <p className="muted-text text-success">
                {t('hospital_malasakit_confirm', { name: selectedHospital.name })}
              </p>
            ) : null}
          </Card>
        ) : null}

        {['SSS', 'GSIS', 'VOLUNTARY', 'OFW'].includes(selectedMemberType) ? (
          <button
            type="button"
            className="list-button__row"
            style={{ width: '100%', justifyContent: 'space-between', color: 'var(--color-text-secondary)', padding: 0 }}
            onClick={() => onTabChange(3)}
          >
            <span>{t('result_eligibility_reminder')}</span>
            <span aria-hidden="true">→</span>
          </button>
        ) : null}

        {(selectedMemberType === 'SSS' || selectedMemberType === 'GSIS') && membershipOption?.contributionCheckUrl ? (
          <div className="warning-card">
            <div className="warning-card-header">
              <div className="warning-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <span className="warning-card-title">{t('contribution_check_title')}</span>
            </div>
            <div className="warning-card-body">
              <p style={{ fontSize: '13px', color: '#78350F', marginBottom: '10px' }}>{t('contribution_check_intro')}</p>
              <div className="warning-steps">
                <div className="warning-step">
                  <span className="warning-step-num">1</span>
                  <span>{t('contribution_check_step_1')}</span>
                </div>
                <div className="warning-step">
                  <span className="warning-step-num">2</span>
                  <span>{t('contribution_check_step_2')}</span>
                </div>
                <div className="warning-step">
                  <span className="warning-step-num">3</span>
                  <span>{t('contribution_check_step_3')}</span>
                </div>
                <div className="warning-step">
                  <span className="warning-step-num">4</span>
                  <span>{t('contribution_check_step_4')}</span>
                </div>
              </div>
              <a
                href={membershipOption.contributionCheckUrl}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '13px', color: '#1B4FD8', display: 'block', marginTop: '10px' }}
              >
                {membershipOption.contributionCheckUrl}
              </a>
              <p className="muted-text" style={{ fontSize: '12px', marginTop: '8px' }}>{t('contribution_check_denied')}</p>
            </div>
          </div>
        ) : null}

        <section className="tab-section screen-only">
          <Accordion title={t('physician_note_title')}>
            <div className="sheet-list">
              <p className="muted-text">{t('physician_note_intro')}</p>
              <p className="muted-text">{t('physician_note_pf')}</p>
              <a href={PHYSICIAN_SEARCH_URL} target="_blank" rel="noreferrer">
                {t('physician_note_link_label')}
              </a>
            </div>
          </Accordion>
        </section>

        {currentResult.benefitLimits?.length ? (
          <section className="tab-section screen-only">
            <Accordion title={t('benefit_limits_title')}>
              <div className="sheet-list">
                {currentResult.benefitLimits.map((limit) => (
                  <div key={limit.key} className="sheet-list__item">
                    <span className="sheet-list__title">{t(`benefit_limit_${limit.key}`)}</span>
                    <span className="muted-text">
                      {lang === 'en' ? limit.description_en : limit.description_fil}
                    </span>
                    {(lang === 'en' ? limit.warningNote_en : limit.warningNote_fil) ? (
                      <span className="muted-text">
                        {lang === 'en' ? limit.warningNote_en : limit.warningNote_fil}
                      </span>
                    ) : null}
                  </div>
                ))}
                <a
                  className="muted-text"
                  href={MEMBER_PORTAL_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('benefit_limits_online')}
                </a>
              </div>
            </Accordion>
          </section>
        ) : null}

        {currentResult.secondCaseRateEligible ? (
          <section className="tab-section screen-only">
            <Accordion title={t('second_case_rate_title')}>
              <p className="muted-text">{t('second_case_rate_body')}</p>
            </Accordion>
          </section>
        ) : null}

        <p className="muted-text">
          {t('based_on')}{' '}
          {currentResult.circularUrl ? (
            <a href={currentResult.circularUrl} target="_blank" rel="noreferrer">
              {currentResult.circular}
            </a>
          ) : (
            currentResult.circular
          )}
          {effectiveDate ? `, ${t('effective')} ${effectiveDate}` : ''}
        </p>

        {currentResult.needsVerification ? (
          <div className="notice notice--warning screen-only">{t('verify_notice')}</div>
        ) : null}

        <div className="actions-row screen-only">
          <button
            type="button"
            className="button button--primary"
            onClick={() => onTabChange(2)}
          >
            {t('see_guide')}
          </button>
          <button
            type="button"
            className="button button--outline"
            onClick={handleSave}
            disabled={isSavedCurrent}
          >
            {isSavedCurrent ? t('saved_status') : t('save')}
          </button>
        </div>

        <section className="print-only print-pack">
          <h2 className="print-pack__title">{conditionName}</h2>
          <p className="print-pack__amount">₱{formatAmount(currentResult.amount)}</p>
          <p className="print-pack__line">
            {currentResult.directFiling ? t('direct_filing_badge') : t('reimburse_only_badge')}
          </p>
          <div className="print-pack__group">
            <h3>{t('documents_needed')}</h3>
            <ul className="print-pack__list">
              {currentResult.documents.map((document) => (
                <li key={`${document.order}-${document.label_en}`}>
                  {lang === 'en' ? document.label_en : document.label_fil}
                </li>
              ))}
            </ul>
          </div>
          <div className="print-pack__group">
            <h3>{t('say_this_to_billing')}</h3>
            <p>{billingScript}</p>
          </div>
        </section>

        <BottomSheet
          isOpen={isDirectFilingOpen}
          onClose={() => setIsDirectFilingOpen(false)}
          title={currentResult.directFiling ? t('direct_filing_sheet_title') : t('reimburse_sheet_title')}
        >
          <p className="muted-text">
            {currentResult.directFiling
              ? t('direct_filing_sheet_body')
              : t('reimburse_sheet_body')}
          </p>
        </BottomSheet>
      </div>
    );
  }

  return (
    <>
      <ToastContainer />
      {view === 'result' ? renderResultView() : renderPickerView()}
    </>
  );
}
