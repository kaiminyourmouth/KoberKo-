import { useMemo, useState } from 'react';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { SearchProvider } from './context/SearchContext';
import AppHeader from './components/AppHeader';
import BottomNav from './components/BottomNav';
import OfflineBanner from './components/OfflineBanner';
import AccountTab from './tabs/AccountTab';
import ChatTab from './tabs/ChatTab';
import FindTab from './tabs/FindTab';
import GuideTab from './tabs/GuideTab';
import IntakeTab from './tabs/IntakeTab';
import SavedTab from './tabs/SavedTab';
import './index.css';

/**
 * Inner shell — rendered inside LanguageProvider so it can read `lang`
 * and expose it as a data attribute for CSS (e.g. print footer language).
 */
function AppShell({ activeTab, activeTabKind, printDate, onTabChange, renderActiveTab }) {
  const { lang } = useLanguage();

  return (
    <div
      className="app-shell"
      data-print-date={printDate}
      data-active-tab={activeTabKind}
      data-lang={lang}
    >
      <AppHeader />
      <OfflineBanner />

      <main className="tab-content">
        <div
          className="tab-panel"
          data-tab-kind={activeTabKind}
          id={`tab-panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`nav-tab-${activeTab}`}
        >
          {renderActiveTab()}
        </div>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [accountView, setAccountView] = useState('main');
  const [findRestoreToken, setFindRestoreToken] = useState(0);
  const printDate = useMemo(
    () =>
      new Intl.DateTimeFormat('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date()),
    [],
  );

  function handleOpenSavedResult() {
    setFindRestoreToken((current) => current + 1);
  }

  function handleTabChange(nextTab) {
    setActiveTab(nextTab);
    if (nextTab !== 3) {
      setAccountView('main');
      return;
    }

    // Re-tapping the active Account tab resets the sub-view back to main.
    if (activeTab === 3) {
      setAccountView('main');
    }
  }

  function handleOpenAccountSubview(nextView) {
    setActiveTab(3);
    setAccountView(nextView);
  }

  function handleCloseAccountSubview() {
    setAccountView('main');
  }

  const activeTabKind =
    activeTab === 3
      ? accountView === 'saved'
        ? 'saved'
        : accountView === 'chat'
          ? 'chat'
          : 'account'
      : ['intake', 'find', 'guide'][activeTab];

  function renderActiveTab() {
    if (activeTab === 0) {
      return (
        <IntakeTab
          onTabChange={handleTabChange}
          onOpenChat={() => handleOpenAccountSubview('chat')}
        />
      );
    }

    if (activeTab === 1) {
      return (
        <FindTab
          onTabChange={handleTabChange}
          restoreToken={findRestoreToken}
          onOpenChat={() => handleOpenAccountSubview('chat')}
        />
      );
    }

    if (activeTab === 2) {
      return <GuideTab onTabChange={handleTabChange} />;
    }

    if (activeTab === 3 && accountView === 'saved') {
      return (
        <SavedTab
          onTabChange={handleTabChange}
          onOpenSavedResult={handleOpenSavedResult}
          standalone
          onBack={handleCloseAccountSubview}
        />
      );
    }

    if (activeTab === 3 && accountView === 'chat') {
      return <ChatTab onBack={handleCloseAccountSubview} />;
    }

    return (
      <AccountTab
        onOpenSaved={() => handleOpenAccountSubview('saved')}
        onOpenChat={() => handleOpenAccountSubview('chat')}
      />
    );
  }

  return (
    <LanguageProvider>
      <SearchProvider>
        <AppShell
          activeTab={activeTab}
          activeTabKind={activeTabKind}
          printDate={printDate}
          onTabChange={handleTabChange}
          renderActiveTab={renderActiveTab}
        />
      </SearchProvider>
    </LanguageProvider>
  );
}
