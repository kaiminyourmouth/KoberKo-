import { useMemo, useState } from 'react';
import Accordion from '../components/Accordion';
import Badge from '../components/Badge';
import Card from '../components/Card';
import konsulta from '../data/konsulta.json';
import konsultaProvidersData from '../data/konsulta_providers.json';
import rhuServices from '../data/rhu_services.json';
import { useLanguage } from '../context/LanguageContext';
import { getMedicineById, searchMedicines } from '../engine/medicineGuide';
import './tabs.css';

function normalizeProviderQuery(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildInitialStack() {
  return [{ type: 'main' }];
}

export default function GabayTab() {
  const { lang, t } = useLanguage();
  const [viewStack, setViewStack] = useState(buildInitialStack);
  const [selectedRhuConcernId, setSelectedRhuConcernId] = useState(() => rhuServices.concerns[0]?.id || '');
  const [medicineQuery, setMedicineQuery] = useState('');
  const [selectedMedicineId, setSelectedMedicineId] = useState('');
  const [selectedKonsultaRegion, setSelectedKonsultaRegion] = useState('');
  const [selectedKonsultaProvince, setSelectedKonsultaProvince] = useState('');
  const [konsultaFinderQuery, setKonsultaFinderQuery] = useState('');

  const currentView = viewStack[viewStack.length - 1];
  const services = konsulta.services;
  const rhuConcerns = rhuServices.concerns;
  const konsultaProviders = konsultaProvidersData.providers;
  const konsultaRegions = konsultaProvidersData.regions;
  const selectedRhuConcern =
    rhuConcerns.find((concern) => concern.id === selectedRhuConcernId) || rhuConcerns[0];

  const medicineMatches = useMemo(() => searchMedicines(medicineQuery), [medicineQuery]);
  const selectedMedicine =
    getMedicineById(selectedMedicineId) ||
    (medicineMatches.length === 1 ? medicineMatches[0] : null);
  const showMedicineResults = medicineQuery.trim() && !selectedMedicine;
  const medicineBadgeKey =
    selectedMedicine?.officialPriceType === 'cap'
      ? 'account_medicine_price_badge_cap'
      : selectedMedicine?.officialPriceType === 'example'
        ? 'account_medicine_price_badge_example'
        : 'account_medicine_price_badge_none';

  const konsultaProvinceOptions = useMemo(() => {
    if (!selectedKonsultaRegion) {
      return [];
    }

    return [...new Set(
      konsultaProviders
        .filter((provider) => provider.region === selectedKonsultaRegion)
        .map((provider) => provider.province),
    )].sort((a, b) => a.localeCompare(b));
  }, [konsultaProviders, selectedKonsultaRegion]);

  const filteredKonsultaProviders = useMemo(() => {
    if (!selectedKonsultaRegion) {
      return [];
    }

    const normalizedQuery = normalizeProviderQuery(konsultaFinderQuery);

    return konsultaProviders.filter((provider) => {
      if (provider.region !== selectedKonsultaRegion) {
        return false;
      }

      if (selectedKonsultaProvince && provider.province !== selectedKonsultaProvince) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = normalizeProviderQuery([
        provider.name,
        provider.municipality,
        provider.province,
        provider.street,
      ].join(' '));

      return haystack.includes(normalizedQuery);
    });
  }, [konsultaFinderQuery, konsultaProviders, selectedKonsultaProvince, selectedKonsultaRegion]);

  const visibleKonsultaProviders = filteredKonsultaProviders.slice(0, 12);

  function pushView(nextView) {
    setViewStack((current) => [...current, nextView]);
  }

  function goBack() {
    setViewStack((current) => (current.length > 1 ? current.slice(0, -1) : current));
  }

  function openRhuConcern(concernId) {
    setSelectedRhuConcernId(concernId);
    pushView({ type: 'rhu_detail', concernId });
  }

  function openMedicineGuide() {
    pushView({ type: 'medicine' });
  }

  function openKonsultaPackage() {
    pushView({ type: 'konsulta' });
  }

  function openKonsultaFinder() {
    pushView({ type: 'konsulta_finder' });
  }

  function handleMedicineQueryChange(event) {
    setMedicineQuery(event.target.value);
    setSelectedMedicineId('');
  }

  function handleSelectMedicine(medicine) {
    setSelectedMedicineId(medicine.id);
    setMedicineQuery(medicine.genericName);
  }

  function handleClearMedicine() {
    setMedicineQuery('');
    setSelectedMedicineId('');
  }

  function handleKonsultaRegionChange(event) {
    setSelectedKonsultaRegion(event.target.value);
    setSelectedKonsultaProvince('');
    setKonsultaFinderQuery('');
  }

  function renderSubviewHeader(title, subtitle = '') {
    return (
      <div className="summary-bar summary-bar--stacked">
        <button type="button" className="summary-back" onClick={goBack}>
          ← {t('back')}
        </button>
        <div className="gabay-subview__heading">
          <h1 className="tab-section__title">{title}</h1>
          {subtitle ? <p className="muted-text">{subtitle}</p> : null}
        </div>
      </div>
    );
  }

  function renderMainView() {
    return (
      <>
        <section className="account-brand">
          <h1 className="account-brand__name">{t('gabay_tab_heading')}</h1>
          <p className="muted-text">{t('gabay_tab_subheading')}</p>
        </section>

        <Card className="prefs-card">
          <div className="setting-row__copy">
            <div className="inline-row">
              <h2 className="tab-section__title">{t('account_rhu_title')}</h2>
              <Badge variant="primary" size="sm">{t('account_rhu_badge')}</Badge>
            </div>
            <p className="muted-text">{`${t('account_rhu_sub')} ${t('account_rhu_picker')}`}</p>
          </div>

          <div className="select-grid rhu-guide-selector">
            {rhuConcerns.map((concern) => (
              <button
                key={concern.id}
                type="button"
                className="select-card rhu-guide-selector__button"
                onClick={() => openRhuConcern(concern.id)}
              >
                <span className="select-card__title">
                  {lang === 'en' ? concern.label_en : concern.label_fil}
                </span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="prefs-card">
          <div className="setting-row__copy">
            <div className="inline-row">
              <h2 className="tab-section__title">{t('account_medicine_title')}</h2>
              <Badge variant="primary" size="sm">{t('account_medicine_badge')}</Badge>
            </div>
            <p className="muted-text">{t('gabay_medicine_entry_body')}</p>
          </div>

          <button type="button" className="account-link-card" onClick={openMedicineGuide}>
            <div className="account-link-card__copy">
              <span className="account-link-card__title">{t('account_medicine_title')}</span>
              <span className="muted-text">{t('account_medicine_sub')}</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </Card>

        <Card className="prefs-card">
          <div className="setting-row__copy">
            <div className="inline-row">
              <h2 className="tab-section__title">{t('account_konsulta_title')}</h2>
              <Badge variant="primary" size="sm">{t('gabay_konsulta_badge')}</Badge>
            </div>
            <p className="muted-text">{t('gabay_konsulta_entry_body')}</p>
          </div>

          <button type="button" className="account-link-card" onClick={openKonsultaPackage}>
            <div className="account-link-card__copy">
              <span className="account-link-card__title">{t('account_konsulta_title')}</span>
              <span className="muted-text">{t('account_konsulta_sub')}</span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </Card>
      </>
    );
  }

  function renderRhuDetailView() {
    if (!selectedRhuConcern) {
      return null;
    }

    return (
      <>
        {renderSubviewHeader(
          lang === 'en' ? selectedRhuConcern.label_en : selectedRhuConcern.label_fil,
          lang === 'en' ? selectedRhuConcern.summary_en : selectedRhuConcern.summary_fil,
        )}

        <Card className="prefs-card">
          <div className="inline-row">
            <span className="sheet-list__title">{lang === 'en' ? selectedRhuConcern.label_en : selectedRhuConcern.label_fil}</span>
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

          <div className="notice notice--info">
            <strong>{t('account_rhu_konsulta_link')}</strong>
            <div>{t('account_rhu_konsulta_note')}</div>
          </div>

          <div className="notice notice--warning">
            {lang === 'en' ? selectedRhuConcern.availabilityNote_en : selectedRhuConcern.availabilityNote_fil}
          </div>
        </Card>
      </>
    );
  }

  function renderMedicineView() {
    return (
      <>
        {renderSubviewHeader(t('account_medicine_title'), t('account_medicine_sub'))}

        <Card className="prefs-card">
          <label className="setting-row__copy" htmlFor="medicine-guide-input">
            <span className="setting-row__title">{t('account_medicine_search_label')}</span>
            <span className="muted-text">{t('account_medicine_search_hint')}</span>
          </label>

          <input
            id="medicine-guide-input"
            className="medicine-guide__input"
            type="text"
            autoComplete="off"
            value={medicineQuery}
            onChange={handleMedicineQueryChange}
            placeholder={t('account_medicine_search_placeholder')}
          />

          {!medicineQuery.trim() ? (
            <div className="notice notice--info">
              {t('account_medicine_empty')}
            </div>
          ) : null}

          {showMedicineResults ? (
            medicineMatches.length ? (
              <div className="sheet-list">
                <span className="sheet-list__title">{t('account_medicine_results_title')}</span>
                <div className="medicine-guide__results">
                  {medicineMatches.map((medicine) => (
                    <button
                      key={medicine.id}
                      type="button"
                      className="list-button medicine-guide__result"
                      onClick={() => handleSelectMedicine(medicine)}
                    >
                      <div className="list-button__row">
                        <span className="list-button__title">{medicine.genericName}</span>
                        <span className="tag tag--gray">{medicine.strength}</span>
                      </div>
                      <span className="muted-text">
                        {[medicine.dosageForm, ...(medicine.brandExamples || [])].join(' • ')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="notice notice--warning">
                {t('account_medicine_no_results')}
              </div>
            )
          ) : null}

          {selectedMedicine ? (
            <div className="medicine-guide__panel">
              <div className="medicine-guide__header">
                <div className="setting-row__copy">
                  <span className="sheet-list__title">{selectedMedicine.genericName}</span>
                  <span className="muted-text">
                    {[selectedMedicine.strength, selectedMedicine.dosageForm].filter(Boolean).join(' • ')}
                  </span>
                </div>
                <span className="tag">{t(medicineBadgeKey)}</span>
              </div>

              <div className="medicine-guide__section">
                <span className="sheet-list__title">{t('account_medicine_generic_label')}</span>
                <span>
                  {[selectedMedicine.genericName, selectedMedicine.strength, selectedMedicine.dosageForm]
                    .filter(Boolean)
                    .join(' • ')}
                </span>
              </div>

              {selectedMedicine.brandExamples?.length ? (
                <div className="medicine-guide__section">
                  <span className="sheet-list__title">{t('account_medicine_brands_label')}</span>
                  <div className="chips-row medicine-guide__chips">
                    {selectedMedicine.brandExamples.map((brand) => (
                      <span key={brand} className="tag tag--gray">
                        {brand}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="medicine-guide__section">
                <span className="sheet-list__title">{t('account_medicine_use_for_label')}</span>
                <span>{lang === 'en' ? selectedMedicine.useFor_en : selectedMedicine.useFor_fil}</span>
              </div>

              <div className="medicine-guide__section">
                <span className="sheet-list__title">{t('account_medicine_price_label')}</span>
                <span>{lang === 'en' ? selectedMedicine.officialPrice_en : selectedMedicine.officialPrice_fil}</span>
                <span className="muted-text">
                  {lang === 'en' ? selectedMedicine.officialPriceNote_en : selectedMedicine.officialPriceNote_fil}
                </span>
              </div>

              <div className="medicine-guide__section">
                <span className="sheet-list__title">{t('account_medicine_public_access_label')}</span>
                <span>{lang === 'en' ? selectedMedicine.publicAccess_en : selectedMedicine.publicAccess_fil}</span>
                <span className="muted-text">
                  {lang === 'en' ? selectedMedicine.availability_en : selectedMedicine.availability_fil}
                </span>
              </div>

              <button type="button" className="button button--outline" onClick={handleClearMedicine}>
                {t('account_medicine_search_again')}
              </button>

              <p className="muted-text">{t('account_medicine_disclaimer')}</p>
            </div>
          ) : null}
        </Card>
      </>
    );
  }

  function renderKonsultaPackageView() {
    return (
      <>
        {renderSubviewHeader(t('account_konsulta_title'), t('account_konsulta_sub'))}

        <Card className="prefs-card">
          <p className="sheet-list__title">{t('account_konsulta_entitled')}</p>

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
              title={(
                <span className="inline-row">
                  <span>{lang === 'en' ? services.dental.title_en : services.dental.title_fil}</span>
                  <Badge variant="success" size="sm">{t('account_konsulta_new_badge')}</Badge>
                </span>
              )}
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

          <div className="gabay-konsulta-actions">
            <button type="button" className="button button--primary" onClick={openKonsultaFinder}>
              {t('gabay_konsulta_finder_cta')}
            </button>

            <a
              className="button button--outline"
              href={konsulta.findProvider_url}
              target="_blank"
              rel="noreferrer"
            >
              {t('account_konsulta_find')}
            </a>
          </div>
        </Card>
      </>
    );
  }

  function renderKonsultaFinderView() {
    return (
      <>
        {renderSubviewHeader(t('account_konsulta_finder_title'), t('account_konsulta_finder_sub'))}

        <Card className="prefs-card">
          <p className="muted-text">
            {t('account_konsulta_finder_source', { date: konsultaProvidersData.updatedAsOf })}
          </p>

          <div className="konsulta-finder">
            <div className="konsulta-finder__controls">
              <label className="setting-row__copy" htmlFor="konsulta-region-select">
                <span className="setting-row__title">{t('account_konsulta_finder_region')}</span>
                <select
                  id="konsulta-region-select"
                  className="select-input konsulta-finder__select"
                  value={selectedKonsultaRegion}
                  onChange={handleKonsultaRegionChange}
                >
                  <option value="">{t('account_konsulta_finder_region_placeholder')}</option>
                  {konsultaRegions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </label>

              <label className="setting-row__copy" htmlFor="konsulta-province-select">
                <span className="setting-row__title">{t('account_konsulta_finder_province')}</span>
                <select
                  id="konsulta-province-select"
                  className="select-input konsulta-finder__select"
                  value={selectedKonsultaProvince}
                  onChange={(event) => setSelectedKonsultaProvince(event.target.value)}
                  disabled={!selectedKonsultaRegion}
                >
                  <option value="">{t('account_konsulta_finder_province_placeholder')}</option>
                  {konsultaProvinceOptions.map((province) => (
                    <option key={province} value={province}>
                      {province}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="setting-row__copy" htmlFor="konsulta-provider-search">
              <span className="setting-row__title">{t('account_konsulta_finder_search')}</span>
              <input
                id="konsulta-provider-search"
                className="medicine-guide__input"
                type="text"
                autoComplete="off"
                value={konsultaFinderQuery}
                onChange={(event) => setKonsultaFinderQuery(event.target.value)}
                placeholder={t('account_konsulta_finder_search_placeholder')}
                disabled={!selectedKonsultaRegion}
              />
            </label>

            {!selectedKonsultaRegion ? (
              <div className="notice notice--warning">
                {t('account_konsulta_finder_pick_region')}
              </div>
            ) : (
              <div className="sheet-list">
                <span className="sheet-list__title">
                  {t('account_konsulta_finder_results', {
                    count: filteredKonsultaProviders.length,
                    region: selectedKonsultaRegion,
                  })}
                </span>

                {filteredKonsultaProviders.length > visibleKonsultaProviders.length ? (
                  <span className="muted-text">
                    {t('account_konsulta_finder_refine', {
                      shown: visibleKonsultaProviders.length,
                      total: filteredKonsultaProviders.length,
                    })}
                  </span>
                ) : null}

                <div className="konsulta-provider-list">
                  {visibleKonsultaProviders.map((provider) => (
                    <div key={provider.id} className="konsulta-provider-card">
                      <div className="konsulta-provider-card__header">
                        <div className="setting-row__copy">
                          <span className="sheet-list__title">{provider.name}</span>
                          <span className="muted-text">
                            {[provider.municipality, provider.province].filter(Boolean).join(', ')}
                          </span>
                        </div>
                        <div className="chips-row konsulta-provider-card__chips">
                          <span className="tag tag--gray">
                            {provider.sector === 'G'
                              ? t('account_konsulta_finder_sector_gov')
                              : t('account_konsulta_finder_sector_private')}
                          </span>
                          <span className={`tag${provider.gamotAvailable ? '' : ' tag--gray'}`}>
                            {provider.gamotAvailable
                              ? t('account_konsulta_finder_gamot_yes')
                              : t('account_konsulta_finder_gamot_no')}
                          </span>
                        </div>
                      </div>
                      <span className="muted-text">{provider.street}</span>
                      <span className="muted-text">
                        {t('account_konsulta_finder_expiry', { date: provider.expireDate })}
                      </span>
                    </div>
                  ))}
                </div>

                {!visibleKonsultaProviders.length ? (
                  <div className="notice notice--warning">
                    {t('account_konsulta_finder_no_results')}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </Card>
      </>
    );
  }

  function renderCurrentView() {
    if (currentView.type === 'rhu_detail') {
      return renderRhuDetailView();
    }

    if (currentView.type === 'medicine') {
      return renderMedicineView();
    }

    if (currentView.type === 'konsulta') {
      return renderKonsultaPackageView();
    }

    if (currentView.type === 'konsulta_finder') {
      return renderKonsultaFinderView();
    }

    return renderMainView();
  }

  return <div className="tab-screen account-tab">{renderCurrentView()}</div>;
}
