import { useEffect, useRef, useState } from 'react';
import Card from '../components/Card';
import { CHAT_HISTORY_KEY, getMembershipLabel } from '../constants/options';
import { useLanguage } from '../context/LanguageContext';
import { useSearch } from '../context/SearchContext';
import useOnlineStatus from '../hooks/useOnlineStatus';
import { askGroq, buildQuickPrompt, getGroqStatus } from '../services/groq';
import './tabs.css';

const QUICK_ACTIONS = [
  { key: 'direct_filing', labelKey: 'chat_quick_direct_filing' },
  { key: 'documents', labelKey: 'chat_quick_documents' },
  { key: 'copay', labelKey: 'chat_quick_copay' },
  { key: 'billing_refusal', labelKey: 'chat_quick_billing_refusal' },
  { key: 'reimbursement', labelKey: 'chat_quick_reimbursement' },
  { key: 'eligibility', labelKey: 'chat_quick_eligibility' },
  { key: 'malasakit', labelKey: 'chat_quick_malasakit' },
  { key: 'other_benefits', labelKey: 'chat_quick_other_benefits' },
  { key: 'konsulta', labelKey: 'chat_quick_konsulta' },
  { key: 'claim_denied', labelKey: 'chat_quick_claim_denied' },
];

function loadChatHistory() {
  try {
    const raw = localStorage.getItem(CHAT_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item) =>
        item &&
        (item.role === 'user' || item.role === 'assistant') &&
        typeof item.content === 'string',
    );
  } catch {
    return [];
  }
}

function saveChatHistory(history) {
  try {
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(history.slice(-20)));
  } catch {
    // Ignore storage issues.
  }
}

function buildContextLabel(context, lang, t) {
  if (!context) {
    return '';
  }

  const parts = [];

  if (context.conditionName) {
    parts.push(context.conditionName);
  }

  if (context.hospitalLevel) {
    const levelNumber = context.hospitalLevel.replace('level', '');
    parts.push(t('level_short', { level: levelNumber }));
  }

  if (context.memberType) {
    parts.push(getMembershipLabel(context.memberType, lang));
  }

  return parts.join(' • ') || (lang === 'en' ? 'Current situation' : 'Kasalukuyang sitwasyon');
}

function buildErrorMessage(error, t) {
  if (error === 'rate_limit') {
    return t('chat_error_rate_limit');
  }

  if (error === 'offline') {
    return t('chat_offline');
  }

  return t('chat_error_api');
}

export default function ChatTab({ onBack }) {
  const { lang, t } = useLanguage();
  const { isOnline } = useOnlineStatus();
  const { searchState, setSearchState } = useSearch();
  const [history, setHistory] = useState(() => loadChatHistory());
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isChatConfigured, setIsChatConfigured] = useState(null);
  const historyEndRef = useRef(null);
  const sendLockRef = useRef(false);
  const lastQueuedMessageRef = useRef('');

  const intakeContext = searchState.intakeContext;
  const contextLabel = buildContextLabel(intakeContext, lang, t);
  const canUseChat = isOnline && isChatConfigured === true;

  useEffect(() => {
    saveChatHistory(history);
  }, [history]);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ block: 'end' });
  }, [history, isLoading]);

  useEffect(() => {
    let cancelled = false;

    void getGroqStatus().then((configured) => {
      if (!cancelled) {
        setIsChatConfigured(configured);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSend(message) {
    const trimmed = message.trim();
    if (!trimmed || isLoading || sendLockRef.current || !canUseChat) {
      return;
    }

    // Ignore accidental rapid re-submits of the same message while the UI is catching up.
    if (lastQueuedMessageRef.current === trimmed) {
      return;
    }

    sendLockRef.current = true;
    lastQueuedMessageRef.current = trimmed;

    const nextUserMessage = { role: 'user', content: trimmed };
    const priorHistory = history.slice(-8);

    setHistory((current) => [...current, nextUserMessage].slice(-20));
    setInput('');
    setErrorMessage('');
    setIsLoading(true);

    try {
      const response = await askGroq(trimmed, intakeContext, priorHistory);

      if (response.message) {
        setHistory((current) =>
          [
            ...current,
            {
              role: 'assistant',
              content: response.message,
              warnings: response.warnings ?? [],
              hasViolations: response.hasViolations ?? false,
            },
          ].slice(-20),
        );
      } else if (response.error) {
        setErrorMessage(buildErrorMessage(response.error, t));
      }
    } finally {
      setIsLoading(false);
      sendLockRef.current = false;
      window.setTimeout(() => {
        if (lastQueuedMessageRef.current === trimmed) {
          lastQueuedMessageRef.current = '';
        }
      }, 300);
    }
  }

  function handleQuickAction(actionKey) {
    void handleSend(buildQuickPrompt(actionKey, intakeContext, lang));
  }

  function handleClearContext() {
    setSearchState((current) => ({
      ...current,
      intakeContext: null,
      intakeResult: current.intakeResult,
    }));
  }

  function renderSetupState() {
    return (
      <Card variant="warning" className="saved-card">
        <h2 className="tab-section__title">{t('chat_setup_title')}</h2>
        <p className="muted-text">{t('chat_setup_body')}</p>
      </Card>
    );
  }

  return (
    <div className="tab-screen chat-tab">
      <div className="summary-bar">
        <button type="button" className="summary-back" onClick={onBack}>
          ← {t('back')}
        </button>
      </div>

      <Card className="chat-intro-card">
        <span className="guide-section-lead__eyebrow">{t('chat_intro_badge')}</span>
        <strong>{t('chat_intro_title')}</strong>
        <p className="muted-text">{t('chat_intro_sub')}</p>
      </Card>

      {intakeContext ? (
        <Card className="chat-context-chip">
          <div className="chat-context-chip__copy">
            <strong>{contextLabel}</strong>
            <span className="muted-text">{t('chat_context_using')}</span>
          </div>
          <button
            type="button"
            className="chat-context-chip__clear"
            onClick={handleClearContext}
            aria-label={t('chat_clear_context')}
          >
            ×
          </button>
        </Card>
      ) : null}

      {isChatConfigured === false ? renderSetupState() : null}

      {isOnline && isChatConfigured === true ? (
        <>
          <div className="chat-section-lead">
            <span className="guide-section-lead__eyebrow">{t('chat_quick_badge')}</span>
            <h2 className="tab-section__title">{t('chat_quick_title')}</h2>
            <p className="muted-text">{t('chat_quick_sub')}</p>
          </div>

          <div className="chat-quick-grid">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.key}
                type="button"
                className="chat-quick-card"
                onClick={() => handleQuickAction(action.key)}
                disabled={isLoading}
              >
                {t(action.labelKey)}
              </button>
            ))}
          </div>

          <p className="chat-divider">{t('chat_divider')}</p>
        </>
      ) : null}

      {!isOnline ? (
        <Card variant="warning" className="saved-card">
          <p>{t('chat_offline')}</p>
        </Card>
      ) : null}

      <div className="chat-history">
        <div className="chat-section-lead">
          <span className="guide-section-lead__eyebrow">{t('chat_history_badge')}</span>
          <h2 className="tab-section__title">{t('chat_history_title')}</h2>
        </div>

        {!history.length ? (
          <Card className="chat-empty-card">
            <strong>{t('chat_empty_title')}</strong>
            <p className="muted-text">{t('chat_empty_sub')}</p>
          </Card>
        ) : null}

        {history.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`chat-message chat-message--${message.role}`}
          >
            <div className="chat-message__bubble">
              <p>{message.content}</p>
              {message.role === 'assistant' && message.hasViolations ? (
                <div className="ai-disclaimer-card">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}} aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  {t('ai_disclaimer_verify')}
                </div>
              ) : null}
              {message.role === 'assistant' && message.warnings?.length > 0 ? (
                <div className="ai-amount-note">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}} aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {t('ai_amount_verify')}
                </div>
              ) : null}
            </div>
          </div>
        ))}

        {isLoading ? (
          <div className="chat-message chat-message--assistant">
            <div className="chat-message__bubble chat-message__bubble--typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        ) : null}

        {errorMessage ? (
          <Card variant="warning" className="saved-card">
            <p>{errorMessage}</p>
          </Card>
        ) : null}

        <div ref={historyEndRef} />
      </div>

      {isOnline && isChatConfigured === true ? (
        <form
          className="chat-input-row"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSend(input);
          }}
        >
          <input
            className="search-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={t('chat_input_placeholder')}
          />
          <button
            type="submit"
            className={`button button--primary button--sm${input.trim() && !isLoading ? '' : ' button--disabled'}`}
            disabled={!input.trim() || isLoading}
            aria-label={t('chat_send')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </form>
      ) : null}
    </div>
  );
}
