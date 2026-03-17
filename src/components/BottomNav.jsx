import { useLanguage } from '../context/LanguageContext';
import './BottomNav.css';

const TABS = [
  { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-2M9 2a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1M9 2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1m-7 8h10M7 16h4"/></svg>, labelKey: 'nav_intake',  ariaLabel: 'Intake tab',  subKey: 'nav_intake_sub' },
  { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0"/></svg>, labelKey: 'nav_find',    ariaLabel: 'Find tab'    },
  { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>, labelKey: 'nav_guide',   ariaLabel: 'Guide tab'   },
  { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8"/></svg>, labelKey: 'nav_account', ariaLabel: 'Account tab' },
];

/**
 * BottomNav
 * @param {number}   activeTab    — 0-indexed active tab
 * @param {Function} onTabChange  — called with tab index on press
 */
export default function BottomNav({ activeTab, onTabChange }) {
  const { t } = useLanguage();

  return (
    <nav className="bottom-nav" role="tablist" aria-label="Main navigation">
      {TABS.map((tab, index) => {
        const isActive = activeTab === index;
        return (
          <button
            key={tab.labelKey}
            id={`nav-tab-${index}`}
            className={`bottom-nav__tab${isActive ? ' bottom-nav__tab--active' : ''}`}
            role="tab"
            aria-selected={isActive}
            aria-label={tab.ariaLabel}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onTabChange(index)}
          >
            <span className="bottom-nav__icon" aria-hidden="true">
              {tab.icon}
            </span>
            <span className="bottom-nav__label">
              {t(tab.labelKey)}
            </span>
            {tab.subKey && isActive ? (
              <span className="bottom-nav__sub">{t(tab.subKey)}</span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
